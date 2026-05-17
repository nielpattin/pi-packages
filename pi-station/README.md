# station bar

Custom status bar extension for [pi](https://github.com/badlogic/pi-mono) with fixed editor layout, bash mode, editor stash, prompt history, and configurable segments.

## Install

```bash
pi install npm:@nielpattin/pi-station
```

Restart pi to activate.

## Commands

| Command          | What                                                 |
| ---------------- | ---------------------------------------------------- |
| `/station`       | Open station bar settings (fixed editor, scroll bar) |
| `/stash-history` | Open prompt history picker                           |
| `/bash-mode`     | Enable sticky bash mode                              |
| `/bash-reset`    | Reset managed bash session                           |

Station bar runs as a custom editor with fixed layout compositor. Configure via `/station` settings menu or `settings.json`.

```json
{
    "station": {
        "fixedEditor": true,
        "scrollBar": true
    }
}
```

When `fixedEditor` is enabled (default): chat/feed scrolls above a fixed cluster containing station bar, editor, bash transcript, and last-prompt display. Uses the terminal's alternate screen buffer for composited scrolling.

When disabled: station bar widgets attach to pi's regular TUI layout using `aboveEditor`/`belowEditor` placements.

`scrollBar` shows a scroll position indicator on the right edge of the fixed cluster.

## Editor Stash

`Alt+S` toggles editor stash:

| Editor   | Stash     | Result                     |
| -------- | --------- | -------------------------- |
| Has text | Empty     | Stash text, clear editor   |
| Empty    | Has stash | Restore stash into editor  |
| Has text | Has stash | Update stash, clear editor |
| Empty    | Empty     | Nothing to stash           |

Stashed text auto-restores when agent finishes if editor is still empty. Stash history persists to `~/.pi/agent/station-bar/stash-history.json` (up to 12 entries).

## Prompt history

Open with `Ctrl+Alt+H` or `/stash-history`. Two sources:

- **Stashed prompts** — up to 12 recent stashed entries (newest first)
- **Recent project prompts** — up to 50 user prompts from pi sessions in current project folder

Selecting an entry with existing editor text offers Replace, Append, or Cancel.

## Editor shortcuts

| Shortcut       | Action                                      |
| -------------- | ------------------------------------------- |
| `Ctrl+Alt+C`   | Copy full editor text                       |
| `Ctrl+Alt+X`   | Cut full editor text (copy then clear)      |
| `Ctrl+Shift+U` | Jump chat viewport to previous user message |
| `Ctrl+Shift+I` | Jump chat viewport to next user message     |
| `Ctrl+Alt+,`   | Jump chat viewport to previous LLM message  |
| `Ctrl+Alt+.`   | Jump chat viewport to next LLM message      |
| `Ctrl+Shift+G` | Jump chat viewport to bottom                |

Copy/cut shortcuts do not modify stash state. Chat jump shortcuts require fixed-editor mode.

## Bash mode

Enter with `/bash-mode` or `Ctrl+B`. Exit with `Escape` or `Ctrl+B` again. Persistent shell session per pi session. Ghost-first completions from project shell history, global history, git, path, and executable sources.

While active:

- **Enter** runs current shell command
- **Right Arrow** accepts ghost text without running
- **Tab** accepts ghost suggestion if one exists
- **Up/Down** browse matching shell history
- **Escape** exits bash mode
- **Ctrl+C** interrupts active shell job

Command output renders in full-screen overlay (fixed-editor mode) or widget (non-fixed-editor). Shell cwd changes reflect in the `shell_mode` segment.

### One-off bash commands

`!command` and `!!command` prompts reuse the shell prediction pipeline, including ghost suggestions.

### Bash mode settings

```json
{
    "bashMode": {
        "toggleShortcut": "ctrl+b",
        "transcriptMaxLines": 2000,
        "transcriptMaxBytes": 524288
    }
}
```

## Station bar layout

| Row       | Left                                              | Right               |
| --------- | ------------------------------------------------- | ------------------- |
| Primary   | `path`, `git`                                     | `skills`            |
| Secondary | `shell_mode`, `context_pct`, `cache_read`, `cost` | `model`, `thinking` |
| Tertiary  | `extension_statuses`                              |                     |

### Custom items

Register custom status items from any extension via config:

```json
{
    "station": {
        "customItems": [
            {
                "id": "ci",
                "statusKey": "ci-status",
                "position": "right",
                "prefix": "CI",
                "color": "warning"
            }
        ]
    }
}
```

Fields: `id` (required, `[a-zA-Z0-9_-]+`), `statusKey` (defaults to `id`), `position` (`left`/`right`/`secondary`, default `right`), `prefix`, `color` (pi theme color or `#RRGGBB`), `hideWhenMissing` (default `true`), `excludeFromExtensionStatuses` (default `true`).

## Configuration

Settings merge from `~/.pi/agent/settings.json` and project `.pi/settings.json`:

```json
{
    "station": {
        "fixedEditor": true,
        "scrollBar": true,
        "customItems": []
    },
    "showLastPrompt": true,
    "bashMode": {
        "toggleShortcut": "ctrl+b",
        "transcriptMaxLines": 2000,
        "transcriptMaxBytes": 524288
    }
}
```

Shortcut overrides:

```json
{
    "station barShortcuts": {
        "stashHistory": "ctrl+alt+h",
        "copyEditor": "ctrl+alt+c",
        "cutEditor": "ctrl+alt+x",
        "scrollChatUp": "super+up",
        "scrollChatDown": "super+down",
        "editorStart": "super+shift+up",
        "editorEnd": "super+shift+down",
        "jumpPreviousUserMessage": "ctrl+shift+u",
        "jumpNextUserMessage": "ctrl+shift+i",
        "jumpPreviousLlmMessage": "ctrl+alt+,",
        "jumpNextLlmMessage": "ctrl+alt+.",
        "jumpChatBottom": "ctrl+shift+g"
    }
}
```

## Segments

Built-in segments: `model`, `shell_mode`, `path`, `git`, `subagents`, `token_in`, `token_out`, `token_total`, `cost`, `context_pct`, `context_total`, `time_spent`, `time`, `session`, `hostname`, `cache_read`, `cache_write`, `thinking`, `extension_statuses`, `skills`.

**Thinking** segment shows current thinking level (`think:off`, `think:med`, etc.) with per-level colors.

**Git** integration uses async cached fetching (1s TTL). Invalidates on file writes/edits and git branch-changing commands. Shows branch, staged (+), unstaged (\*), untracked (?).

**Context** warning colors: yellow at 70%, red at 90%. During streaming, uses live assistant usage. When `pi-custom-compaction` is installed, native context segments are hidden to avoid stale post-summary usage display.

**Subscription** detected via OAuth model registry — shows `(sub)` instead of dollar cost.

## License

MIT
