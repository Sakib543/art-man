@AGENTS.md

# Start here

Before doing anything on this repo, read **`docs/HANDOFF.md`** — the working agreement, the
decisions already made with the client, verified facts about the codebase, and known traps. Then
read **`docs/BACKLOG.md`** for the work queue.

**Two developers share this repo and both work directly on `main`** — one during the day, one at
night. Coordination rules are in `docs/HANDOFF.md` section 2. Read them before touching anything.

Standing rules (full list in `docs/HANDOFF.md` section 1):

- Work on `main` only — never create a branch or a PR.
- `git pull --rebase` before starting. Claim your backlog item (put your name in its Owner line,
  push that first), then work.
- One backlog item per session. Do the task asked for; do not start the next one.
- Ask before implementing. The user says when to build.
- After every change: `pnpm build`, `pnpm test` (192 tests), `pnpm lint` — all three must pass.
  Then pull, re-verify, and push.
- Commit and push at the end of a task — never leave finished work uncommitted.
- Only one person generates database migrations at a time (`docs/HANDOFF.md` section 8.1).
- Talk to the user in Roman Urdu. Everything written down — files, code, comments, commit
  messages — stays in English.
- Update `docs/HANDOFF.md` at the end of each task (see its section 11).
