# Pi Station bar

Custom status bar extension for [pi](https://github.com/badlogic/pi-mono) with fixed editor layout, bash mode, editor stash, prompt history, and configurable segments.

<img width="1672" height="941" alt="thumbnail" src="https://github.com/user-attachments/assets/7aec1c64-1e2b-403c-b614-025f076968de" />

## Demo

https://github.com/user-attachments/assets/27e9beca-35e2-4491-9cc2-c3b70203ceca

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

You can select chat text and continue scrolling the chat viewport with the mouse wheel while keeping the selection active. Mouse selection now copies only visible chat text, not trailing padding cells.

When disabled: station bar widgets attach to pi's regular TUI layout using `aboveEditor`/`belowEditor` placements.

`scrollBar` shows a scroll position indicator on the right edge of the fixed cluster.

## Shortcuts

Defaults:

| Shortcut     | What                       |
| ------------ | -------------------------- |
| `Ctrl+B`     | Toggle bash mode           |
| `Alt+S`      | Stash/restore editor text  |
| `Ctrl+Alt+H` | Open prompt history picker |

Override in `settings.json`:

```json
{
    "station": {
        "shortcuts": {
            "bashMode": "ctrl+shift+b",
            "stash": "ctrl+shift+s",
            "stashHistory": "ctrl+shift+h"
        }
    }
}
```

## Editor Stash

`Alt+S` toggles editor stash by default:

| Editor   | Stash     | Result                     |
| -------- | --------- | -------------------------- |
| Has text | Empty     | Stash text, clear editor   |
| Empty    | Has stash | Restore stash into editor  |
| Has text | Has stash | Update stash, clear editor |
| Empty    | Empty     | Nothing to stash           |

Stashed text auto-restores when agent finishes if editor is still empty. Stash history persists to `~/.pi/agent/station-bar/stash-history.json` (up to 12 entries).

## Prompt history

Open with `Ctrl+Alt+H` by default or `/stash-history`. Two sources:

- **Stashed prompts** — up to 12 recent stashed entries (newest first)
- **Recent project prompts** — up to 50 user prompts from pi sessions in current project folder

Selecting an entry with existing editor text offers Replace, Append, or Cancel.

## Bash mode

Enter with `/bash-mode` or `Ctrl+B` by default. Exit with `Escape` or the bash-mode shortcut again. Persistent shell session per pi session. Ghost-first completions from project shell history, global history, git, path, and executable sources.

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
        "transcriptMaxLines": 2000,
        "transcriptMaxBytes": 524288
    }
}
```

## Station bar layout

| Row       | Left                                              | Right               |
| --------- | ------------------------------------------------- | ------------------- |
| Primary   | `path`, `git`                                     | `mcp`, `skills`     |
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
        "customItems": [],
        "shortcuts": {
            "bashMode": "ctrl+b",
            "stash": "alt+s",
            "stashHistory": "ctrl+alt+h"
        }
    },
    "showLastPrompt": true,
    "bashMode": {
        "transcriptMaxLines": 2000,
        "transcriptMaxBytes": 524288
    }
}
```

## Segments

Built-in segments: `model`, `shell_mode`, `path`, `git`, `subagents`, `token_in`, `token_out`, `token_total`, `cost`, `context_pct`, `context_total`, `time_spent`, `time`, `session`, `hostname`, `cache_read`, `cache_write`, `thinking`, `extension_statuses`, `skills`, `mcp`.

**Thinking** segment shows current thinking level (`think:off`, `think:med`, etc.) with per-level colors.

**Git** integration uses async cached fetching (1s TTL). Invalidates on file writes/edits and git branch-changing commands. Shows branch, staged (+), unstaged (\*), untracked (?).

**Context** warning colors: yellow at 70%, red at 90%. During streaming, uses live assistant usage. When `pi-custom-compaction` is installed, native context segments are hidden to avoid stale post-summary usage display.

**Subscription** detected via OAuth model registry — shows `(sub)` instead of dollar cost.

## Credits

Thanks for the solution for the fixed input from Nico https://github.com/nicobailon/pi-interactive-shell

## License

MIT
