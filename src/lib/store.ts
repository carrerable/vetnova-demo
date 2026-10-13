import { ROLE_PERMS, TENANTS, USERS, seed, type Appointment, type MedicalRecord, type Perm } from '../data/seed';

export interface Ctx { tenantId: string; userId: string }
export interface NewAppointment { vetId: string; petId: string; start: string; durationMin: number; reason: string }
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }

const KEY = 'vetnova-demo:appointments';
const OPEN = 9 * 60; // 09:00
const CLOSE = 19 * 60; // 19:00

const minutesOf = (iso: string): number => {
  const [, time] = iso.split('T');
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};
const dayOf = (iso: string) => iso.split('T')[0];

export function safeStorage(): KV | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

export function createStore(opts: { today?: Date; storage?: KV } = {}) {
  const { appointments: seeded, records } = seed(opts.today ?? new Date());
  let created: Appointment[] = [];
  try { created = JSON.parse(opts.storage?.getItem(KEY) ?? '[]'); } catch { created = []; }
  let all: Appointment[] = [...seeded, ...created];
  let counter = created.length;

  const user = (ctx: Ctx) => USERS.find((u) => u.id === ctx.userId && u.tenantId === ctx.tenantId);

  /** Does this user (inside this tenant) hold the permission? */
  function can(ctx: Ctx, perm: Perm): boolean {
    const u = user(ctx);
    return !!u && ROLE_PERMS[u.role].includes(perm);
  }

  function listAppointments(ctx: Ctx): Appointment[] {
    if (!can(ctx, 'appointments.read')) throw new Error('403: missing permission appointments.read');
    // Simulated row level security: the tenant filter is applied here, not by the UI.
    return all.filter((a) => a.tenantId === ctx.tenantId).sort((a, b) => a.start.localeCompare(b.start));
  }

  function createAppointment(ctx: Ctx, input: NewAppointment): Appointment {
    if (!can(ctx, 'appointments.write')) throw new Error('403: missing permission appointments.write');
    const vet = USERS.find((u) => u.id === input.vetId && u.tenantId === ctx.tenantId && u.role === 'vet');
    if (!vet) throw new Error('403: blocked by tenant policy (simulated RLS)');
    const startMin = minutesOf(input.start);
    const endMin = startMin + input.durationMin;
    if (startMin < OPEN || endMin > CLOSE) throw new Error('Outside working hours (09:00-19:00)');
    const clash = all.some((a) => a.tenantId === ctx.tenantId && a.vetId === input.vetId && dayOf(a.start) === dayOf(input.start)
      && startMin < minutesOf(a.start) + a.durationMin && minutesOf(a.start) < endMin);
    if (clash) throw new Error('Overlaps another appointment of the same veterinarian');
    const appt: Appointment = { id: `new${++counter}`, tenantId: ctx.tenantId, ...input };
    all = [...all, appt];
    created = [...created, appt];
    try { opts.storage?.setItem(KEY, JSON.stringify(created)); } catch { /* storage is optional */ }
    return appt;
  }

  function getRecord(ctx: Ctx, id: string): MedicalRecord {
    const r = records.find((x) => x.id === id);
    if (!r || r.tenantId !== ctx.tenantId) throw new Error('403: blocked by tenant policy (simulated RLS)');
    if (!can(ctx, 'records.read')) throw new Error('403: missing permission records.read');
    return r;
  }

  const listRecordIds = (): { id: string; tenantId: string }[] => records.map(({ id, tenantId }) => ({ id, tenantId }));
  return { can, listAppointments, createAppointment, getRecord, listRecordIds, tenants: TENANTS };
}
export type Store = ReturnType<typeof createStore>;
