const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// ─── PATCH /tasks/:id/assign – Integration tests ────────────────────

describe('PATCH /tasks/:id/assign', () => {
  let taskId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Assignable task', priority: 'high' });
    taskId = res.body.id;
  });

  it('should assign a task to a user', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
    expect(res.body.id).toBe(taskId);
    expect(res.body.title).toBe('Assignable task');
  });

  it('should return 404 for non-existent task', async () => {
    const res = await request(app)
      .patch('/tasks/non-existent-id/assign')
      .send({ assignee: 'Alice' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  it('should return 400 when assignee is missing', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/);
  });

  it('should return 400 when assignee is an empty string', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/);
  });

  it('should return 400 when assignee is whitespace only', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/);
  });

  it('should return 400 when assignee is not a string', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/);
  });

  it('should trim whitespace from assignee name', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: '  Bob  ' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('should allow re-assigning a task to a different user', async () => {
    await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Alice' });

    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Bob' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });

  it('should preserve other task fields after assignment', async () => {
    const res = await request(app)
      .patch(`/tasks/${taskId}/assign`)
      .send({ assignee: 'Alice' });

    expect(res.body.title).toBe('Assignable task');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('todo');
  });
});

// ─── assignTask() – Unit tests ──────────────────────────────────────

describe('taskService.assignTask()', () => {
  it('should assign a task and return the updated task', () => {
    const task = taskService.create({ title: 'Unit assign' });
    const result = taskService.assignTask(task.id, 'Charlie');

    expect(result).not.toBeNull();
    expect(result.assignee).toBe('Charlie');
    expect(result.title).toBe('Unit assign');
  });

  it('should return null for non-existent task', () => {
    const result = taskService.assignTask('fake-id', 'Charlie');
    expect(result).toBeNull();
  });

  it('should persist the assignment in the store', () => {
    const task = taskService.create({ title: 'Persist test' });
    taskService.assignTask(task.id, 'Dana');

    const found = taskService.findById(task.id);
    expect(found.assignee).toBe('Dana');
  });

  it('should allow overwriting a previous assignee', () => {
    const task = taskService.create({ title: 'Reassign test' });
    taskService.assignTask(task.id, 'First');
    const result = taskService.assignTask(task.id, 'Second');

    expect(result.assignee).toBe('Second');
  });
});
