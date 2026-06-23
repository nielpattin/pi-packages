# Changelog

This file summarizes the latest package changelog entries. Package changelogs remain the source of truth for package-specific history.

<!-- package-changelog-summary -->

### pi-multi-auth

## 0.11.0

### Minor Changes

- 18204c9: Add `pi-multi-auth` extension for multi-provider credential management, OAuth login flows, account rotation, quota classification, and usage tracking across providers (Cloudflare, OpenAI Codex, GitHub Copilot, Anthropic, Kimi, Kilo, Qwen, BlazeAPI, Kiro, command-code).

All notable changes to this project will be documented in this file.

### @nielpattin/pi-permission-system

## 0.2.0

### Minor Changes

- 2dfb0b1: Add the initial `@nielpattin/pi-permission-system` package and document its companion integration with `@nielpattin/pi-subagents`.

### Patch Changes

- 2dfb0b1: Play the configured permission request sound before opening interactive permission prompts.

### @nielpattin/pi-simplify

## 0.2.8

### Patch Changes

- 2dfb0b1: Update Pi host peer dependency ranges to `^0.78.0`.

### @nielpattin/pi-station

## 0.7.0

### Minor Changes

- d77095c: Add cache_hit (CH%) segment, fix cost segment to show actual cost, move (auto) indicator to context_pct segment

### Patch Changes

- 3324736: Fix terminal split selection so ST-terminated OSC 8 hyperlinks keep their visible file paths highlighted and copied.
- 2dfb0b1: Update Pi host peer dependency ranges to `^0.78.0`.
- 1da0dd9: Remove pi-station's custom read tool renderer so read output uses the default tool shell.

### @nielpattin/pi-subagents

## 0.2.0

### Minor Changes

- 2dfb0b1: Add the initial `@nielpattin/pi-subagents` package.
- 8f5dfff: Add the built-in omni visual inspection agent, improve get_subagent_result expanded rendering to show complete results without the misleading verbose path, and clarify background-result guidance so agents do not block on `wait: true` unless the user asked to wait.
- bb86be2: Add TypeScript build step. A `pnpm build` command compiles `src/` to `dist/`
  via `tsc -p tsconfig.build.json`. The build script updates `package.json`
  fields (`main`, `types`, `exports`, `imports`, `pi.extensions`, `files`) to
  point to the compiled output. Post-build step adds explicit `.js` extensions
  to all extensionless relative imports in `dist/` for Node.js ESM compliance.
   - `scripts/build.mjs` — orchestrates tsc, postbuild, and package.json update
   - `scripts/postbuild.mjs` — adds `.js`/`/index.js` extensions to relative imports
   - `tsconfig.build.json` — extends base tsconfig with `noEmit: false`, `outDir`,
     `declaration`, `sourceMap`
   - `.gitignore` — ignores `dist/`, `coverage/`

### Patch Changes

- 2dfb0b1: Add the initial `@nielpattin/pi-permission-system` package and document its companion integration with `@nielpattin/pi-subagents`.
- 2badee6: perf(pi-subagents): defer heavy initialization to reduce startup time
   - Move heavy module loading (agent-runner, worktree, etc.) from static to dynamic imports
   - Defer settings.load() from load-time to session_start
   - Defer custom agent loading (AgentTypeRegistry.reload) from constructor to session_start
   - Defer resolveLeanMagicContextEntry() to first agent spawn
   - Defer NotificationManager, ConcurrencyQueue, AgentManager, etc. construction to session_start
   - Use shared mutable deps object pattern so tool execute methods resolve deps lazily
   - AgentTool, GetResultTool, SteerTool now accept deps objects filled by lazy initialization

   Reduces extension startup overhead by ~6% (~41ms).

- 493556d: Bundle with esbuild for faster extension startup.

   Replaces `tsc` with `esbuild` for the extension entry point (`src/index.ts`),
   producing a single `dist/index.js` bundle instead of 57 individual module files.
   `tsc --emitDeclarationOnly` still runs for `.d.ts` type declarations.
   - `scripts/build.mjs` — runs esbuild for bundling, then tsc for types and
     individual `.js` files (needed by dynamic `import()` calls from the bundle)
   - `scripts/postbuild.mjs` — unchanged, adds `.js` extensions to individual files
   - `devDependencies` — adds `esbuild ^0.28.0`
   - `package.json` — `main` and `pi.extensions` point to `dist/index.js` bundle

   Startup improvement: reduces module-file loading time by ~20ms (692ms → 672ms).
   The larger overhead (~580ms) is Pi's own startup and SDK loading, not module
   resolution.

- fe40323: Fix print-mode stale-context notification test: mock ConcreteAgentRunner so the mocked runAgent is actually called.
- 6f38436: fix: use session cwd instead of process.cwd()

   Several places used `process.cwd()` instead of the active session's `ctx.cwd`,
   causing cwd-stickiness across session switches. The affected classes now accept
   `string | (() => string)` for cwd parameters so they always resolve the current
   value from the mutable `currentCwd` closure that updates on `session_start`.

   Affected classes: SettingsManager, AgentManager, GitWorktreeManager,
   AgentConfigEditor, AgentCreationWizard, AgentsMenuHandler.

- a904f2c: fix: use StringEnum for isolation parameter
   - Replace Type.Literal("worktree") with StringEnum(["worktree"]) for the isolation parameter schema
   - Type.Literal and Type.Union string enums don't work with Google's API; StringEnum is the correct approach per Pi docs

- f52a61d: fix: throw on tool execution failures instead of returning text results

   Tool `execute()` methods now throw on genuine errors (agent not found, config resolution failure, resume failure, steer failure) instead of returning `textResult(...)`. This produces proper `isError: true` results per Pi SDK semantics.

- e7d7bba: Increase timeout on flaky print-mode test to prevent pre-push timeout when running full test suite.
- 6190074: fix(pi-subagents): gate project agents on trust

   Project `.pi/agents/*.md` are now only loaded when `ctx.isProjectTrusted()` returns true during session_start. Global agents always load regardless of trust state.

- 8a3eaa4: Guard `/agents` command to only work in TUI mode. In print/RPC mode, it now sends a message and returns early instead of attempting interactive UI operations that would fail.
- 31b5bd4: test(pi-subagents): add integration smoke test for lean magic-context loading
- 2dced61: Relax Pi host peer dependency ranges so the extension can install under newer Pi releases.

<!-- /package-changelog-summary -->
