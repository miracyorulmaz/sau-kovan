import test from 'node:test';
import assert from 'node:assert/strict';
import { captureLocation, NOTIFICATION_STATES } from '../src/student/safety.mjs';
import { createDeparturePlan, localDateTime } from '../src/student/journey.mjs';

test('manual departure preserves a date ten hours ahead', () => {
  const now = Date.parse('2026-10-28T08:00:00Z');
  const result = createDeparturePlan({ meetingId: 'meet_library', dormId: 'dorm_esentepe', departureAt: new Date(now + 10 * 3600_000).toISOString() }, now);
  assert.equal(result.earliest_at, '2026-10-28T18:00:00.000Z');
  assert.equal(result.latest_at, '2026-10-28T18:10:00.000Z');
});

test('manual time rejects stale or out of horizon input instead of silently using now', () => {
  const now = Date.parse('2026-10-28T08:00:00Z');
  for (const departureAt of ['invalid', '2026-10-28T07:00:00Z', '2026-10-29T10:00:00Z']) {
    assert.throws(() => createDeparturePlan({ meetingId: 'x', dormId: 'y', departureAt }, now), (error) => error.code === 'INVALID_DEPARTURE_TIME');
  }
});

test('datetime-local formatting round-trips browser local calendar values', () => {
  const date = new Date(2026, 9, 28, 22, 7);
  assert.equal(localDateTime(date.getTime()), '2026-10-28T22:07');
});

test('denying device location still produces a valid location-free help payload', async () => {
  const result = await captureLocation({ getCurrentPosition: (_, error) => error({ code: 1 }) });
  assert.equal(result.location, null);
  assert.equal(result.location_status, 'DENIED');
});

test('a real device fix includes its accuracy and capture timestamp', async () => {
  const result = await captureLocation({ getCurrentPosition: (success) => success({ coords: { latitude: 40.7, longitude: 30.3, accuracy: 15 }, timestamp: 1000 }) });
  assert.deepEqual(result.location, { latitude: 40.7, longitude: 30.3, accuracy_m: 15, captured_at: '1970-01-01T00:00:01.000Z', source: 'DEVICE' });
  assert.equal(result.location_status, 'AVAILABLE');
});

test('provider acceptance and simulation never claim delivery', () => {
  assert.match(NOTIFICATION_STATES.PROVIDER_ACCEPTED[1], /henüz doğrulanmadı/);
  assert.match(NOTIFICATION_STATES.SIMULATED[1], /gönderilmedi/);
  assert.notEqual(NOTIFICATION_STATES.PROVIDER_ACCEPTED[0], NOTIFICATION_STATES.DELIVERED[0]);
});
