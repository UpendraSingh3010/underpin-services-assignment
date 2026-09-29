# Submission Notes

## What I'd test next if I had more time
- **Concurrency edge cases:** What happens when multiple requests try to update/delete the same task simultaneously.
- **Input sanitization:** Test for XSS payloads in title/description fields — the API stores raw input which could be dangerous if rendered in a frontend.
- **Large payloads and performance:** Test with hundreds/thousands of tasks to ensure pagination and filtering still perform well with an in-memory store.
- **Validator edge cases:** Test boundary conditions in `validateUpdateTask` — e.g., sending `dueDate: null` (valid) vs `dueDate: ""` (should fail but currently passes the falsy check), and `priority: ""` vs `priority: undefined`.

## What surprised me in the codebase
- **`completeTask()` silently resets priority to `"medium"`** — This felt like a copy-paste mistake but could cause real data loss in production since there's no indication to the caller that the priority changed.
- **`getByStatus()` uses `String.includes()` instead of `===`** — A subtle bug that could produce very confusing results in production. Searching for `?status=do` would return both `"todo"` and `"done"` tasks.
- **The pagination offset was off-by-one** — Page 1 returned page 2's data. A fundamental bug that would affect every consumer of the API.

## Questions I'd ask before shipping to production
1. **Should `update()` protect immutable fields?** Right now a client can overwrite `id` and `createdAt` via PUT. Is that intentional?
2. **What's the data persistence strategy?** In-memory storage means all data is lost on restart. Is this backed by a database in production?
3. **Is there any authentication/authorization planned?** The assign endpoint has no concept of "who can assign" — should only certain users be allowed to assign tasks?
4. **What should happen when assigning an already-assigned task?** I allowed re-assignment, but maybe it should require unassigning first or track assignment history.
5. **Should the status values be `"todo"`, `"in_progress"`, `"done"` (as in the code) or `"pending"`, `"in-progress"`, `"completed"` (as in the README)?** The README and the actual code disagree on the status enum values.

---

## Design Decisions for `PATCH /tasks/:id/assign`

- **Validation:** `assignee` must be a non-empty string. Whitespace-only strings are rejected, but leading/trailing whitespace is trimmed.
- **Re-assignment:** Allowed — calling assign again with a different name simply overwrites the previous assignee. This keeps the API simple and idempotent.
- **Trim whitespace:** The assignee name is trimmed before storage to prevent accidental `"  Alice  "` vs `"Alice"` mismatches.
- **No unassign endpoint:** Decided not to add this since it wasn't in the spec, but it would be a natural extension (e.g., `DELETE /tasks/:id/assign` or `PATCH /tasks/:id/assign` with `{ "assignee": null }`).
