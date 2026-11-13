---
description: Explain a file line by line, for interview prep
argument-hint: <file path>
---

Explain `$ARGUMENTS` so I can walk an interviewer through it confidently. Read-only, do not change anything.

1. **Purpose**: what this file does and where it sits in the flow database -> API -> front end.
2. **Walkthrough**: go through it top to bottom in logical chunks. For each chunk say what it does
   and **why** it is written that way (link to the SPEC.md requirement ID or CLAUDE.md rule).
3. **Connections**: which files call this one and which it depends on.
4. **Trade-offs**: decisions an interviewer might challenge, and the honest answer
   (e.g. offset vs cursor pagination, ILIKE vs full-text search).
5. **Likely questions**: 3 to 5 questions an interviewer could ask about this file, with short answers.
6. **Live change**: if relevant, where I would edit this file to add a Manufacturer filter or a UoM
   column (CLAUDE.md Section 19).

Keep it plain and concrete. Quote short code snippets with line numbers.
