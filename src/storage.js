export const KEY = 'michi.sessions.v1';
export function readSessions(storage) {
  const raw = storage.getItem(KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Invalid records');
  return data.filter(x => x && typeof x.id === 'string' && typeof x.date === 'string' && typeof x.action === 'string' && Array.isArray(x.answers));
}
export function saveSessions(storage, sessions) { storage.setItem(KEY, JSON.stringify(sessions)); }
export function streak(sessions, now = new Date()) {
  const dates = new Set(sessions.map(x => new Date(x.date).toLocaleDateString('en-CA')));
  let day = new Date(now), count = 0;
  if (!dates.has(day.toLocaleDateString('en-CA'))) day.setDate(day.getDate() - 1);
  while (dates.has(day.toLocaleDateString('en-CA'))) { count++; day.setDate(day.getDate() - 1); }
  return count;
}
