export function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key, /access_code|password|session_token|secret/i.test(key) ? '[GİZLENDİ]' : redactSensitive(item),
  ]));
}

export function normalizeEdges(edges = [], closed = []) {
  const closedSet = new Set(closed);
  return edges.map((edge) => ({
    ...edge,
    from: edge.from ?? edge.a,
    to: edge.to ?? edge.b,
    distance_m: edge.distance_m ?? edge.length_m,
    lighting_weight: edge.lighting_weight ?? Number((1 + 3 * (1 - edge.lighting)).toFixed(2)),
    closed: closedSet.has(edge.id),
  }));
}

export function normalizeCatalog(catalog = {}) {
  const label = (item) => ({ ...item, label: item.name ?? item.label ?? item.id });
  return {
    meetings: (catalog.meeting_points ?? []).map(label),
    dorms: (catalog.dormitories ?? catalog.destination_dorms ?? []).map(label),
  };
}

export function normalizeSnapshot(snapshot) {
  const walks = (snapshot.walks ?? []).map((walk) => ({
    ...walk, student_id: walk.owner_id ?? walk.student_id,
    recorded_route: walk.route ?? walk.recorded_route,
  }));
  const pods = snapshot.pods ?? (snapshot.pod ? [snapshot.pod] : []);
  const ownPod = pods.find((pod) => pod.member_ids.includes(snapshot.user?.id)) ?? pods.find((pod) => !['CANCELLED', 'EXPIRED', 'COMPLETED'].includes(pod.status)) ?? null;
  const membershipRow = snapshot.memberships?.find((row) => row.user_id === 'student-pending');
  const membership = membershipRow?.membership ?? (snapshot.user?.id === 'student-pending' ? snapshot.user.membership : null);
  return {
    user: snapshot.user,
    intents: (snapshot.intents ?? snapshot.departure_intents ?? []).map((intent) => ({ ...intent, student_id: intent.owner_id ?? intent.student_id })),
    pod: ownPod ? { ...ownPod, declined_member_ids: ownPod.declined_member_ids ?? [] } : null,
    walks,
    assistances: (snapshot.assistances ?? []).map((item) => ({
      ...item, state: item.status ?? item.state,
      student_id: walks.find((walk) => walk.id === item.walk_id)?.student_id ?? '',
    })),
    pendingMembership: membership ? { ...membership, user_id: 'student-pending', display_badge: membership.status === 'APPROVED_PILOT' ? 'Demo uygunluk onayı (DEMO_TEST)' : membership.status } : null,
    closedEdges: snapshot.closed_edges ?? [],
  };
}
