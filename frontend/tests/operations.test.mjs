import test from 'node:test';
import assert from 'node:assert/strict';
import { tasksForRole, taskContext, unitName } from '../src/operations/operations.mjs';

test('a field officer view excludes other units and orders new work before history', () => {
  const tasks = [
    { id: 'other', assigned_unit_id: 'guard-02', status: 'ASSIGNED' },
    { id: 'done', assigned_unit_id: 'guard-01', status: 'RESOLVED' },
    { id: 'mine', assigned_unit_id: 'guard-01', status: 'ASSIGNED' },
    { id: 'unassigned', assigned_unit_id: null, status: 'CREATED' },
  ];
  const view = tasksForRole({ user: { id: 'guard-01' }, assistances: tasks }, 'guard');
  assert.deepEqual(view.map((task) => task.id), ['mine', 'done']);
  assert.deepEqual(tasks.map((task) => task.id), ['other', 'done', 'mine', 'unassigned']);
});

test('operators see new requests ahead of dispatches and closed requests', () => {
  const tasks = [{ id: 'old', status: 'RESOLVED' }, { id: 'on-road', status: 'ASSIGNED' }, { id: 'new', status: 'CREATED' }];
  assert.deepEqual(tasksForRole({ assistances: tasks }, 'dispatcher').map((task) => task.id), ['new', 'on-road', 'old']);
});

test('request context uses the assigned walk and never substitutes another walk', () => {
  const catalog = { meeting_points: [{ id: 'library', name: 'SAÜ Kütüphanesi', coordinates: { source_url: 'https://www.google.com/maps/place/library' } }], dormitories: [{ id: 'dorm', name: 'Esentepe' }] };
  const snapshot = { walks: [{ id: 'other', meeting_point_id: 'library', destination_dorm_id: 'dorm' }] };
  assert.equal(taskContext({ walk_id: 'missing' }, snapshot, catalog).meetingUrl, null);
  const context = taskContext({ walk_id: 'other' }, snapshot, catalog);
  assert.equal(context.meeting, 'SAÜ Kütüphanesi'); assert.equal(context.dorm, 'Esentepe');
});

test('unit labels describe real assigned units without inventing human names', () => {
  assert.equal(unitName({ id: 'guard-01', display_name: 'guard-01' }), 'Saha birimi 01');
  assert.equal(unitName({ id: 'guard-02', display_name: 'Kampüs devriyesi' }), 'Kampüs devriyesi');
});
