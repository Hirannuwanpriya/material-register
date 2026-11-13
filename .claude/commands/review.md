---
description: Run QA and spec review on the current uncommitted changes
argument-hint: [requirement IDs]
---

Review the current uncommitted changes. Requirement IDs (if given): $ARGUMENTS

1. Run `git status` and `git diff --stat` to see what changed. If no IDs were given, infer them from
   the diff and `SPEC.md`, and list them.
2. Delegate to `qa-tester` with the requirement IDs and the list of changed files.
3. If QA passes, delegate to `spec-reviewer` with the IDs and the QA report.
4. Show me both results. Do not fix anything yourself; if changes are needed, propose which engineer
   should make them and wait for my go-ahead.
