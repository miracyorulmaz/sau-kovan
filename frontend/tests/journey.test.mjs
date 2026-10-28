import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeparturePlan, friendlyError, membershipAllowed, selectJourney } from '../src/student/journey.mjs';

const now = Date.parse('2026-10-28T08:00:00Z');
const user = { id: 'student-01', role: 'student', membership: { status: 'APPROVED_PILOT', expires_at: '2026-10-29T08:00:00Z' } };
const oldPod = { id: 'old', member_ids: ['student-01', 'student-02', 'student-03'], status: 'WALKING' };

test('new choices and a delayed departure are preserved in the server request', () => {
  const plan = createDeparturePlan({ meetingId: 'meet_adibahce', dormId: 'dorm_esentepe', delay: 20 }, now);
  assert.equal(plan.meeting_point_id, 'meet_adibahce');
  assert.equal(plan.destination_dorm_id, 'dorm_esentepe');
  assert.equal(plan.earliest_at, '2026-10-28T08:20:00.000Z');
  assert.equal(plan.latest_at, '2026-10-28T08:30:00.000Z');
});

test('a finished personal walk does not trap a student in the old group', () => {
  const snapshot = { user, pods: [oldPod], walks: [{ id: 'finished', owner_id: user.id, pod_id: 'old', status: 'COMPLETED' }] };
  const view = selectJourney(snapshot, now);
  assert.equal(view.stage, 'complete'); assert.equal(view.pod, null);
  assert.equal(view.completed.id, 'finished');
});

test('a new pending plan takes precedence over the previous completed journey', () => {
  const view = selectJourney({ user, pods: [oldPod], walks: [{ id: 'finished', owner_id: user.id, pod_id: 'old', status: 'COMPLETED' }],
    intents: [{ id: 'new', owner_id: user.id, status: 'WAITING', latest_at: '2026-10-28T08:10:00Z' }] }, now);
  assert.equal(view.stage, 'waiting'); assert.equal(view.intent.id, 'new'); assert.equal(view.expired, false);
});

test('only this student’s active walk and its latest assistance are shown', () => {
  const view = selectJourney({ user, walks: [{ id: 'mine', owner_id: user.id, status: 'WALKING' }, { id: 'other', owner_id: 'student-02', status: 'WALKING' }],
    assistances: [{ id: 'a', walk_id: 'mine', status: 'RESOLVED' }, { id: 'b', walk_id: 'mine', status: 'CREATED' }, { id: 'private', walk_id: 'other', status: 'ASSIGNED' }] }, now);
  assert.equal(view.walk.id, 'mine'); assert.equal(view.assistance.id, 'b'); assert.equal(view.stage, 'walking');
});

test('expired waiting plans can be distinguished from an active search', () => {
  assert.equal(selectJourney({ user, intents: [{ owner_id: user.id, status: 'WAITING', latest_at: '2026-10-28T07:59:00Z' }] }, now).expired, true);
});

test('approval, student role and unexpired membership are all required', () => {
  assert.equal(membershipAllowed(user, now), true);
  assert.equal(membershipAllowed({ ...user, role: 'demo_admin' }, now), false);
  assert.equal(membershipAllowed({ ...user, membership: { ...user.membership, status: 'PENDING_REVIEW' } }, now), false);
  assert.equal(membershipAllowed(user, now + 2 * 86400_000), false);
});

test('unexpected server errors do not display internal response text', () => {
  const message = friendlyError({ code: 'UNKNOWN', message: 'private server internals' });
  assert.equal(message.includes('private'), false);
  assert.match(friendlyError({ code: 'VERSION_CONFLICT' }), /durumu değişti/);
});

test('cancelling a newer plan returns to planning rather than an old completion', () => {
  const view = selectJourney({ user, walks: [{ id: 'finished', owner_id: user.id, pod_id: 'old', status: 'COMPLETED' }],
    intents: [{ owner_id: user.id, status: 'COMPLETED' }, { owner_id: user.id, status: 'CANCELLED' }] }, now);
  assert.equal(view.stage, 'plan');
});

test('a missed departure does not trap a student whose peers already started walking', () => {
  const snapshot = { user, pods: [{ ...oldPod, latest_departure_at: '2026-10-28T07:59:00Z' }],
    intents: [{ owner_id: user.id, status: 'PROPOSED', latest_at: '2026-10-28T07:59:00Z' }] };
  assert.equal(selectJourney(snapshot, now).stage, 'plan');
  assert.equal(selectJourney({ ...snapshot, walks: [{ id: 'mine', pod_id: 'old', owner_id: user.id, status: 'WALKING' }] }, now).stage, 'walking');
});
