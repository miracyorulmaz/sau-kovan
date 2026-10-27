import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCatalog, normalizeEdges, normalizeSnapshot, redactSensitive } from '../src/api/backendAdapter.mjs';

test('backend a/b edges and closed state map into the view without changing IDs', () => {
  const [edge] = normalizeEdges([{ id: 'main-spine', a: 'junction', b: 'lit-junction', length_m: 140, lighting: .95 }], ['main-spine']);
  assert.equal(edge.from, 'junction');
  assert.equal(edge.to, 'lit-junction');
  assert.equal(edge.closed, true);
  assert.equal(edge.distance_m, 140);
  assert.equal(edge.lighting_weight, 1.15);
});

test('real bootstrap dormitories and names drive the selectors', () => {
  assert.deepEqual(normalizeCatalog({ dormitories: [{ id: 'dorm_esentepe', name: 'Esentepe' }] }).dorms, [{ id: 'dorm_esentepe', name: 'Esentepe', label: 'Esentepe' }]);
});

test('snapshot maps authoritative status and owner fields and hides unrelated review data', () => {
  const view = normalizeSnapshot({ user: { id: 'student-01' }, pods: [], walks: [{ id: 'w1', owner_id: 'student-01', route: { edge_ids: ['start-0'] } }], assistances: [{ id: 'a1', walk_id: 'w1', status: 'ASSIGNED' }] });
  assert.equal(view.walks[0].student_id, 'student-01');
  assert.equal(view.walks[0].recorded_route.edge_ids[0], 'start-0');
  assert.equal(view.assistances[0].state, 'ASSIGNED');
  assert.equal(view.pendingMembership, null);
});

test('nested debug logs never retain access codes', () => {
  const safe = redactSensitive({ request: { access_code: 'do-not-log', other: 1 } });
  assert.equal(safe.request.access_code, '[GİZLENDİ]');
  assert.equal(JSON.stringify(safe).includes('do-not-log'), false);
});
