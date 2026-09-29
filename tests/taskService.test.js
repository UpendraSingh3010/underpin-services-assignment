const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── create ──────────────────────────────────────────────────────────

describe('create()', () => {
  it('should create a task with default values', () => {
    const task = taskService.create({ title: 'Test task' });

    expect(task).toMatchObject({
      title: 'Test task',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
    });
    expect(task.id).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it('should create a task with all provided fields', () => {
    const task = taskService.create({
      title: 'Full task',
      description: 'A description',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2025-12-31T00:00:00.000Z',
    });

    expect(task.title).toBe('Full task');
    expect(task.description).toBe('A description');
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2025-12-31T00:00:00.000Z');
  });

  it('should generate unique IDs for each task', () => {
    const t1 = taskService.create({ title: 'Task 1' });
    const t2 = taskService.create({ title: 'Task 2' });
    expect(t1.id).not.toBe(t2.id);
  });
});

// ─── getAll ──────────────────────────────────────────────────────────

describe('getAll()', () => {
  it('should return an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('should return all created tasks', () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    const all = taskService.getAll();
    expect(all).toHaveLength(2);
  });

  it('should return a copy, not the internal array', () => {
    taskService.create({ title: 'Task 1' });
    const all = taskService.getAll();
    all.push({ title: 'Injected' });
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// ─── findById ────────────────────────────────────────────────────────

describe('findById()', () => {
  it('should find an existing task by id', () => {
    const created = taskService.create({ title: 'Find me' });
    const found = taskService.findById(created.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('Find me');
  });

  it('should return undefined for a non-existent id', () => {
    expect(taskService.findById('non-existent-id')).toBeUndefined();
  });
});

// ─── getByStatus ─────────────────────────────────────────────────────
// BUG: uses String.includes() instead of === which causes partial matching

describe('getByStatus()', () => {
  beforeEach(() => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'In progress task', status: 'in_progress' });
    taskService.create({ title: 'Done task', status: 'done' });
  });

  it('should filter tasks by exact status', () => {
    const todos = taskService.getByStatus('todo');
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Todo task');
  });

  it('should return an empty array for a status with no matching tasks', () => {
    taskService._reset();
    taskService.create({ title: 'Only todo', status: 'todo' });
    const done = taskService.getByStatus('done');
    expect(done).toHaveLength(0);
  });

  // This test documents the partial-match bug
  it('BUG: partial status string matches incorrectly (uses includes instead of ===)', () => {
    // "do" is a substring of both "todo" and "done"
    const results = taskService.getByStatus('do');
    // Expected: 0 results (no status is literally "do")
    // Actual (due to bug): matches "todo" and "done"
    expect(results.length).toBeGreaterThan(0); // proves the bug exists
  });
});

// ─── getPaginated ────────────────────────────────────────────────────
// BUG: offset uses page * limit instead of (page - 1) * limit

describe('getPaginated()', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  it('should return the correct number of items per page', () => {
    const page = taskService.getPaginated(1, 2);
    expect(page).toHaveLength(2);
  });

  // Pagination fix: page 1 now correctly returns the first items
  it('should return the first items on page 1 (offset bug was fixed)', () => {
    const page1 = taskService.getPaginated(1, 2);
    // After fix: offset = (1-1)*2 = 0, so returns Tasks 1 & 2
    expect(page1[0].title).toBe('Task 1');
    expect(page1[1].title).toBe('Task 2');
  });

  it('should return the correct items on page 2', () => {
    const page2 = taskService.getPaginated(2, 2);
    expect(page2[0].title).toBe('Task 3');
    expect(page2[1].title).toBe('Task 4');
  });

  it('should return an empty array when page exceeds total', () => {
    const page = taskService.getPaginated(100, 2);
    expect(page).toEqual([]);
  });
});

// ─── getStats ────────────────────────────────────────────────────────

describe('getStats()', () => {
  it('should return zero counts when no tasks exist', () => {
    const stats = taskService.getStats();
    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('should count tasks by status correctly', () => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'todo' });
    taskService.create({ title: 'T3', status: 'in_progress' });
    taskService.create({ title: 'T4', status: 'done' });

    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('should count overdue tasks (past dueDate and not done)', () => {
    taskService.create({
      title: 'Overdue',
      status: 'todo',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Done overdue',
      status: 'done',
      dueDate: '2020-01-01T00:00:00.000Z',
    });
    taskService.create({
      title: 'Future',
      status: 'todo',
      dueDate: '2099-12-31T00:00:00.000Z',
    });

    const stats = taskService.getStats();
    expect(stats.overdue).toBe(1); // only the first one counts
  });

  it('should not count tasks without dueDate as overdue', () => {
    taskService.create({ title: 'No due', status: 'todo' });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });
});

// ─── update ──────────────────────────────────────────────────────────

describe('update()', () => {
  it('should update fields of an existing task', () => {
    const task = taskService.create({ title: 'Original' });
    const updated = taskService.update(task.id, { title: 'Updated' });

    expect(updated.title).toBe('Updated');
    expect(updated.id).toBe(task.id);
  });

  it('should return null when updating a non-existent task', () => {
    const result = taskService.update('non-existent', { title: 'Nope' });
    expect(result).toBeNull();
  });

  it('should preserve fields that are not being updated', () => {
    const task = taskService.create({
      title: 'Keep me',
      priority: 'high',
      status: 'todo',
    });
    const updated = taskService.update(task.id, { priority: 'low' });

    expect(updated.title).toBe('Keep me');
    expect(updated.priority).toBe('low');
    expect(updated.status).toBe('todo');
  });

  // BUG: update allows overwriting id and createdAt
  it('BUG: allows overwriting protected fields like id', () => {
    const task = taskService.create({ title: 'Protected' });
    const originalId = task.id;
    const updated = taskService.update(originalId, { id: 'hacked-id' });
    expect(updated.id).toBe('hacked-id'); // proves the bug — id should not be overwritable
  });
});

// ─── remove ──────────────────────────────────────────────────────────

describe('remove()', () => {
  it('should remove an existing task and return true', () => {
    const task = taskService.create({ title: 'Delete me' });
    const result = taskService.remove(task.id);
    expect(result).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  it('should return false when removing a non-existent task', () => {
    expect(taskService.remove('no-such-id')).toBe(false);
  });
});

// ─── completeTask ────────────────────────────────────────────────────
// BUG: resets priority to 'medium' regardless of original priority

describe('completeTask()', () => {
  it('should mark a task as done with a completedAt timestamp', () => {
    const task = taskService.create({ title: 'Finish me' });
    const completed = taskService.completeTask(task.id);

    expect(completed.status).toBe('done');
    expect(completed.completedAt).toBeDefined();
    expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
  });

  it('should return null for a non-existent task', () => {
    expect(taskService.completeTask('fake-id')).toBeNull();
  });

  // This test documents the priority reset bug
  it('BUG: resets priority to medium when completing a high-priority task', () => {
    const task = taskService.create({ title: 'Urgent', priority: 'high' });
    const completed = taskService.completeTask(task.id);
    // Expected: priority stays 'high'
    // Actual (due to bug): priority is reset to 'medium'
    expect(completed.priority).toBe('medium'); // proves the bug
  });
});

// ─── _reset ──────────────────────────────────────────────────────────

describe('_reset()', () => {
  it('should clear all tasks', () => {
    taskService.create({ title: 'Will be cleared' });
    taskService._reset();
    expect(taskService.getAll()).toEqual([]);
  });
});
