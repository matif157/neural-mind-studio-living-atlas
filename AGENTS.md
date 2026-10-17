# AGENTS.md — Permanent Rules

## GitHub-First Rule (MANDATORY)

All projects, changes, and work in this workspace MUST be uploaded to GitHub.

### Rules

1. **Every project must have a GitHub repository.** Before starting work on any project, ensure it has a remote repo on GitHub. If it doesn't, create one using `gh repo create`.

2. **Commit and push after every meaningful change.** Never leave local-only commits. After completing a task, always `git add`, `git commit`, and `git push`.

3. **Local projects must be moved to GitHub.** Any project that exists only locally must be initialized as a git repo, connected to a GitHub remote, and pushed.

4. **No work stays local.** All code, configurations, scripts, and documentation must be version-controlled and pushed to GitHub.

### Workflow

When working on any project:

1. Check if the project has a git repo — if not, run `git init`
2. Check if it has a GitHub remote — if not, create a repo with `gh repo create` and add it
3. After completing work, always commit with a meaningful message and push
4. Use `gh` CLI for any GitHub operations (repos, PRs, issues)

### GitHub Account

- Username: `matif157`
- Use `gh` CLI for all GitHub operations
- Auth is configured via keyring

## App Installs Are Upgrades (MANDATORY)

Installing a new APK onto a device that already has the app MUST update it in place — never delete or uninstall the existing app.

### Rules

1. **Always use upgrade install:** `adb install -r <apk>` (or the store/vendor "update" flow). The `-r` flag replaces the app while keeping all its data (memory database, settings, sessions).
2. **Never `adb uninstall` / `pm uninstall` / clear-data as an update step.** User data lives in app-private storage and must survive every release.
3. **Only the signature can block an update** (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). The keystore is fixed for this app, so this must not occur — if it ever does, stop and report the error instead of deleting the app.
4. This applies to every device and emulator the user hands over, including Infinix/XOS: update over the installed version first; a wiped reinstall is never the first move.
