---
description: Plan and build a feature through the locked agent chain (backend -> frontend -> QA -> review)
argument-hint: <feature description or requirement IDs>
---

Build this feature through the agent workflow in CLAUDE.md Section 0: $ARGUMENTS

1. Read `CLAUDE.md` and `SPEC.md`. Identify the requirement IDs this covers and whether it needs
   API work, UI work, or both. If it is out of scope or unclear, stop and ask.
2. Write a short plan: requirement IDs, entry agent, the agent chain, and the exact files each agent
   may change. **Stop and wait for my approval.** Do not delegate before I approve.
3. After approval, delegate in order with the `Agent` tool:
   `backend-engineer` (if API/DB) -> `frontend-engineer` (if UI) -> `qa-tester` -> `spec-reviewer`.
   Every brief includes the requirement IDs, allowed files, facts from earlier steps (e.g. the API
   output shape), the done commands, and what to put in the summary.
4. If QA fails or review asks for changes, send the issue back to the right engineer, then run QA
   and review again. If the same issue fails review twice, stop and ask me.
5. Show me the final `spec-reviewer` result and a short summary of what changed.
6. Append an entry to `docs/AI-LOG.md` (plan, what each agent did, QA and review results, and what
   I corrected). Do not commit unless I ask.
