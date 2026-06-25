import path from "path";
import os from "os";
import { execFile } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";
import { reportWarning, reportError, reportCloneStart, reportCloneDone } from "./status.js";

const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────────────────

export interface ParsedRepo {
   host: string;
   org: string;
   repo: string;
   remote: string;
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

// ─── Throttling ───────────────────────────────────────────────────

const FETCH_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
const lastFetchTime = new Map<string, number>();

// ─── Git operations ───────────────────────────────────────────────

function git(args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
   return execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
}

/**
 * Ensure a repo is cloned and up-to-date in the cache.
 * Fire-and-forget: errors are logged, not thrown.
 * Returns the cache path immediately (content may arrive async).
 */
export function ensureRepo(repository: string, branch?: string): string {
   const repo = parseRepo(repository);
   if (!repo) {
      reportWarning(`Could not parse repository: ${repository}`);
      return "";
   }

   const localPath = cachePath(repo);
   const cacheKey = `${repo.host}/${repo.org}/${repo.repo}`;

   // Fire-and-forget async operation
   doEnsure(localPath, repo, branch, cacheKey).catch((err) => {
      reportError(`Git operation failed for ${cacheKey}: ${String(err)}`);
      reportCloneDone(cacheKey);
   });

   return localPath;
}

async function doEnsure(
   localPath: string,
   repo: ParsedRepo,
   branch: string | undefined,
   cacheKey: string,
): Promise<void> {
   if (!existsSync(path.join(localPath, ".git"))) {
      // Clone
      reportCloneStart(cacheKey);
      await git(["clone", "--filter=blob:none", repo.remote, localPath]);
      if (branch) {
         await git(["checkout", branch], localPath);
      }
      lastFetchTime.set(cacheKey, Date.now());
      reportCloneDone(cacheKey);
      return;
   }

   // Throttle refreshes
   const lastFetch = lastFetchTime.get(cacheKey);
   if (lastFetch && Date.now() - lastFetch < FETCH_THROTTLE_MS) {
      return; // Recently fetched, skip
   }

   // Fetch + reset
   reportCloneStart(cacheKey);
   await git(["fetch", "origin"], localPath);

   const targetBranch = branch || (await getDefaultBranch(localPath));
   try {
      await git(["checkout", "-B", targetBranch, `origin/${targetBranch}`], localPath);
      await git(["reset", "--hard", `origin/${targetBranch}`], localPath);
   } catch {
      reportWarning(`Could not checkout branch ${targetBranch} for ${cacheKey}`);
   }

   lastFetchTime.set(cacheKey, Date.now());
   reportCloneDone(cacheKey);
}

async function getDefaultBranch(localPath: string): Promise<string> {
   try {
      const { stdout } = await git(["symbolic-ref", "refs/remotes/origin/HEAD"], localPath);
      return stdout.trim().replace("refs/remotes/origin/", "");
   } catch {
      return "main";
   }
}
