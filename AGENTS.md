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
