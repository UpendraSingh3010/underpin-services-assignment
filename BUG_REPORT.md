# Bug Report

## Bug #1: Pagination offset is wrong (FIXED)

**File:** `src/services/taskService.js`, line 12  
**Function:** `getPaginated(page, limit)`

**What should happen:**  
Page 1 should return the first `limit` items (offset 0).

**What actually happens:**  
Page 1 skips the first `limit` items because the offset is calculated as `page * limit` instead of `(page - 1) * limit`.  
For example, with 5 tasks and `page=1, limit=2`, the API returns tasks 3 & 4 instead of tasks 1 & 2.

**How I found it:**  
While writing unit tests for `getPaginated()`, I verified what page 1 returns and noticed it skipped the first page entirely.

**Fix applied:**  
Changed `const offset = page * limit` to `const offset = (page - 1) * limit` in `taskService.js`.

---

## Bug #2: `getByStatus()` uses partial string matching

**File:** `src/services/taskService.js`, line 9  
**Function:** `getByStatus(status)`

**What should happen:**  
Filtering by status should use strict equality. `?status=todo` should only return tasks with status `"todo"`.

**What actually happens:**  
The function uses `t.status.includes(status)` (String `includes`), which performs a substring match. This means:
- `?status=do` matches both `"todo"` and `"done"`  
- `?status=in` matches `"in_progress"`  
- Any substring of a valid status will return false positives

**How I found it:**  
While writing unit tests, I tested filtering with a partial string (`"do"`) and noticed it returned both `"todo"` and `"done"` tasks.

**What a fix would look like:**  
Change `tasks.filter((t) => t.status.includes(status))` to `tasks.filter((t) => t.status === status)`.

---

## Bug #3: `completeTask()` silently resets priority to `"medium"`

**File:** `src/services/taskService.js`, lines 67–72  
**Function:** `completeTask(id)`

**What should happen:**  
Marking a task as complete should only change `status` to `"done"` and set `completedAt`. The task's priority should remain unchanged.

**What actually happens:**  
The function hardcodes `priority: 'medium'` in the spread object, which silently overrides the task's original priority.  
A `"high"` priority task becomes `"medium"` after being marked complete.

**How I found it:**  
While writing tests for the complete endpoint, I created a high-priority task, marked it complete, and noticed the priority was reset to `"medium"` in the response.

**What a fix would look like:**  
Remove the `priority: 'medium'` line from the `completeTask` function:
```diff
  const updated = {
    ...task,
-   priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
```

---

## Bug #4: `update()` allows overwriting protected fields (`id`, `createdAt`)

**File:** `src/services/taskService.js`, line 50  
**Function:** `update(id, fields)`

**What should happen:**  
The `id` and `createdAt` fields should be immutable — clients should not be able to change them through an update request.

**What actually happens:**  
The function uses a simple spread (`{ ...tasks[index], ...fields }`), which means a client can send `{ "id": "new-id" }` or `{ "createdAt": "1999-01-01" }` in a PUT request and overwrite these system-managed fields.

**How I found it:**  
While writing tests for `update()`, I tried sending `{ id: 'hacked-id' }` and confirmed the returned task had the overwritten ID.

**What a fix would look like:**  
Strip protected fields before merging:
```js
const { id: _id, createdAt: _ca, ...safeFields } = fields;
const updated = { ...tasks[index], ...safeFields };
```
