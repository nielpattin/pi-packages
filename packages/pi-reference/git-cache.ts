import path from "path";
import os from "os";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { beginSync, reportSyncStep, endSync } from "./status.js";

const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────────────────

export interface ParsedRepo {
   host: string;
   org: string;
   repo: string;
   remote: string;
}

export interface GitSyncTask {
   repository: string;
   branch?: string;
}

// ─── Repo URL parsing ─────────────────────────────────────────────

/**
 * Parse various git repo URL forms into a structured representation.
 *
 * Accepted forms:
 *   owner/repo                     → github.com/owner/repo
 *   github.com/owner/repo          → as-is
 *   https://github.com/owner/repo  → strip protocol
 *   https://github.com/owner/repo.git → strip .git
 *   git@github.com:owner/repo.git  → SSH form
 */
export function parseRepo(input: string): ParsedRepo | null {
   const trimmed = input.trim();
   if (!trimmed) return null;

   // SSH form: git@github.com:owner/repo.git
   const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
   if (sshMatch) {
      const [, host, pathPart] = sshMatch;
      const parts = pathPart.split("/");
      if (parts.length < 2) return null;
      const repo = parts[parts.length - 1];
      const org = parts.slice(0, -1).join("/");
      return { host, org, repo, remote: trimmed };
   }

   // HTTPS form: https://github.com/owner/repo(.git)
   const httpsMatch = trimmed.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?$/);
   if (httpsMatch) {
      const [, host, pathPart] = httpsMatch;
      const parts = pathPart.split("/");
      if (parts.length < 2) return null;
      const repo = parts[parts.length - 1];
      const org = parts.slice(0, -1).join("/");
      return { host, org, repo, remote: trimmed };
   }

   // host/owner/repo form (3+ segments with a dot in first segment)
   const parts = trimmed.split("/");
   if (parts.length >= 3 && parts[0].includes(".")) {
      const host = parts[0];
      const repo = parts[parts.length - 1].replace(/\.git$/, "");
      const org = parts.slice(1, -1).join("/");
      return { host, org, repo, remote: `https://${host}/${org}/${repo}.git` };
   }

   // owner/repo shorthand (2 segments, no dots → assume github.com)
   if (parts.length === 2 && !parts[0].includes(".")) {
      const [org, repo] = parts;
      const cleanRepo = repo.replace(/\.git$/, "");
      return {
         host: "github.com",
         org,
         repo: cleanRepo,
         remote: `https://github.com/${org}/${cleanRepo}.git`,
      };
   }

   return null;
}

// ─── Cache path computation ───────────────────────────────────────

const CACHE_BASE = path.join(os.homedir(), ".cache", "checkouts");

export function cachePath(repo: ParsedRepo): string {
   return path.join(CACHE_BASE, repo.host, repo.org, repo.repo);
}

/** Compute cache path for a repository string. Returns "" if unparseable. */
export function computeRepoPath(repository: string): string {
   const repo = parseRepo(repository);
   if (!repo) return "";
   return cachePath(repo);
}

// ─── Throttling ───────────────────────────────────────────────────

const FETCH_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
const lastFetchTime = new Map<string, number>();

// ─── Git operations ───────────────────────────────────────────────

function git(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
   return execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

/**
 * Sync all git references in parallel with progress tracking.
 *
 * All repos sync concurrently. A single progress widget
 * ("Syncing references... 3/16") updates as each repo finishes. When all done,
 * clears the widget and shows a summary toast if any repos failed.
 *
 * Each repo is either cloned (if missing) or fetched (if stale).
 * Network errors are collected and reported in the summary, not per-repo.
 */
export function syncGitRepos(tasks: GitSyncTask[]): void {
   if (tasks.length === 0) return;

   // Deduplicate same target+branch combos.
   // Two aliases pointing at the same repo+branch only trigger one git operation.
   const seen = new Map<string, GitSyncTask>();
   for (const task of tasks) {
      const repo = parseRepo(task.repository);
      if (!repo) continue;
      const cacheKey = `${repo.host}/${repo.org}/${repo.repo}@${task.branch ?? ""}`;
      if (!seen.has(cacheKey)) seen.set(cacheKey, task);
   }

   const deduped = Array.from(seen.values());
   if (deduped.length === 0) return;

   beginSync(deduped.length);

   // All repos sync concurrently via Promise.allSettled.
   void Promise.allSettled(deduped.map((task) => syncOneRepo(task))).then(() => endSync());
}

async function syncOneRepo(task: GitSyncTask): Promise<void> {
   const repo = parseRepo(task.repository);
   if (!repo) {
      reportSyncStep(task.repository, true);
      return;
   }

   const localPath = cachePath(repo);
   const cacheKey = `${repo.org}/${repo.repo}`;

   try {
      if (!existsSync(path.join(localPath, ".git"))) {
         // ── Initial clone ──
         await git(["clone", "--filter=blob:none", repo.remote, localPath]);
         if (task.branch) {
            await git(["checkout", task.branch], localPath);
         }
         lastFetchTime.set(cacheKey, Date.now());
      } else {
         // ── Existing repo — fetch if stale ──
         const lastFetch = lastFetchTime.get(cacheKey);
         if (lastFetch && Date.now() - lastFetch < FETCH_THROTTLE_MS) {
            return; // Recently fetched, skip
         }

         await git(["fetch", "origin"], localPath);
         const targetBranch = task.branch || (await getDefaultBranch(localPath));
         try {
            await git(["checkout", "-B", targetBranch, `origin/${targetBranch}`], localPath);
            await git(["reset", "--hard", `origin/${targetBranch}`], localPath);
         } catch {
            // Branch checkout failed — non-critical, repo still usable
         }
         lastFetchTime.set(cacheKey, Date.now());
      }
      reportSyncStep(cacheKey, false);
   } catch {
      // Network error, clone failure, etc. — record for summary toast.
      reportSyncStep(cacheKey, true);
   }
}

async function getDefaultBranch(localPath: string): Promise<string> {
   try {
      const { stdout } = await git(["symbolic-ref", "refs/remotes/origin/HEAD"], localPath);
      return stdout.trim().replace("refs/remotes/origin/", "");
   } catch {
      return "main";
   }
}
