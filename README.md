# Task Manager API — Take-Home Assignment

A RESTful Task Manager API built with Node.js and Express, with an in-memory data store.

## Setup

```bash
npm install
npm start        # runs on http://localhost:3000
npm test         # run test suite (70 tests)
npm run coverage # run with coverage report
```

## What I did

### ✅ Tests (70 tests, 96% coverage)

| File | Type | Tests |
|------|------|-------|
| `tests/taskService.test.js` | Unit tests for all service functions | 26 |
| `tests/tasks.routes.test.js` | Integration tests for all API routes | 28 |
| `tests/assign.test.js` | Tests for the new assign feature | 16 |

### 🐛 Bugs Found (see [BUG_REPORT.md](./BUG_REPORT.md))

| # | Bug | Severity | Fixed? |
|---|-----|----------|--------|
| 1 | `getPaginated()` offset wrong — page 1 skips first results | High | ✅ Fixed |
| 2 | `getByStatus()` uses `includes()` — partial string matching | Medium | Documented |
| 3 | `completeTask()` silently resets priority to `"medium"` | Medium | Documented |
| 4 | `update()` allows overwriting `id` and `createdAt` | Low | Documented |

### 🔧 Bug Fix

Fixed the pagination offset in `taskService.js`:
```diff
- const offset = page * limit;
+ const offset = (page - 1) * limit;
```

### 🆕 New Feature: `PATCH /tasks/:id/assign`

Assigns a user to a task.

```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Alice"}'
```

**Design decisions:**
- `assignee` must be a non-empty string (whitespace-only rejected, trimmed before saving)
- Re-assignment is allowed — calling assign again overwrites the previous assignee
- Returns 400 for invalid input, 404 if task doesn't exist

### Coverage Report

```
File             | % Stmts | % Branch | % Funcs | % Lines
-----------------|---------|----------|---------|--------
All files        |   96.02 |    94.04 |   93.10 |  95.62
 routes/tasks.js |  100.00 |   100.00 |  100.00 | 100.00
 taskService.js  |  100.00 |    94.73 |  100.00 | 100.00
 validators.js   |   91.30 |    91.17 |  100.00 |  91.30
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tasks` | List all tasks |
| `GET` | `/tasks?status=todo` | Filter by status |
| `GET` | `/tasks?page=1&limit=10` | Paginated list |
| `POST` | `/tasks` | Create a task |
| `PUT` | `/tasks/:id` | Update a task |
| `DELETE` | `/tasks/:id` | Delete a task |
| `PATCH` | `/tasks/:id/complete` | Mark as complete |
| `PATCH` | `/tasks/:id/assign` | Assign to a user |
| `GET` | `/tasks/stats` | Counts by status + overdue |

## Submission Notes

See [SUBMISSION_NOTES.md](./SUBMISSION_NOTES.md) for:
- What I'd test next with more time
- What surprised me in the codebase
- Questions I'd ask before shipping to production
