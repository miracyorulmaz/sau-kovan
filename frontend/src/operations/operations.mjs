export const OPERATION_STATES = {
  CREATED: ['Yeni talep', 'Operatör incelemesi bekleniyor.'],
  OPERATOR_ACKED: ['İnceleniyor', 'Uygun bir saha birimi seçip sevk et.'],
  ASSIGNED: ['Saha birimi sevk edildi', 'Atanan birimin varış bildirimi bekleniyor.'],
  ARRIVED: ['Olay yerine ulaşıldı', 'Saha birimi varışını bildirdi.'],
  RESOLVED: ['Tamamlandı', 'Destek süreci operatör tarafından kapatıldı.'],
};
export const REASONS = { HELP_REQUEST: 'Yardım talebi', ESCORT_REQUEST: 'Güvenlik eşliği', ARRIVAL_UNCONFIRMED: 'Varış teyidi alınamadı' };
export const isOpen = (item) => !['RESOLVED', 'CANCELLED'].includes(item.status);
export const unitName = (unit) => !unit ? 'Birim bekleniyor' : /^guard-\d+$/.test(unit.display_name ?? unit.id)
  ? `Saha birimi ${unit.id.split('-').at(-1)}` : unit.display_name;

export function tasksForRole(snapshot, role) {
  const tasks = snapshot?.assistances ?? [];
  // Also scope the view client-side; server authorization remains authoritative.
  const allowed = role === 'guard' ? tasks.filter((item) => item.assigned_unit_id === snapshot?.user?.id) : tasks;
  const rank = { CREATED: 0, OPERATOR_ACKED: 1, ASSIGNED: 2, ARRIVED: 3, RESOLVED: 4, CANCELLED: 5 };
  return [...allowed].sort((a, b) => (rank[a.status] ?? 6) - (rank[b.status] ?? 6)
    || new Date(a.created_at) - new Date(b.created_at));
}

export function taskContext(item, snapshot, catalog) {
  const walk = snapshot?.walks?.find((entry) => entry.id === item.walk_id);
  const meeting = catalog.meeting_points.find((entry) => entry.id === walk?.meeting_point_id);
  const dorm = catalog.dormitories.find((entry) => entry.id === walk?.destination_dorm_id);
  return { meeting: meeting?.name ?? 'Buluşma noktası kayıtlı değil', dorm: dorm?.name ?? 'Yurt kayıtlı değil',
    meetingUrl: meeting?.coordinates?.source_url ?? null };
}

export const routeForRole = (role) => ({ student: '/', dispatcher: '/operator', guard: '/guard' })[role] ?? '/demo';
