import { render, screen } from '@testing-library/react';
import { createStore, type KV } from '../lib/store';
import { weekStart, iso } from '../data/seed';
import { App } from '../App';

const today = new Date(2026, 9, 14); // Wednesday
const monday = weekStart(today);
const at = (off: number, hh: number, mm = 0) => { const d = new Date(monday); d.setDate(d.getDate() + off); return iso(d, hh, mm); };
const memory = (): KV & { data: Record<string, string> } => { const data: Record<string, string> = {}; return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } }; };

const recA = { tenantId: 't-a', userId: 'a-rec' };
const vetA = { tenantId: 't-a', userId: 'a-vet' };

test('la clinica A no ve datos de la clinica B', () => {
  const s = createStore({ today });
  const a = s.listAppointments(recA);
  expect(a).toHaveLength(6);
  expect(a.every((x) => x.tenantId === 't-a')).toBe(true);
  expect(s.listAppointments({ tenantId: 't-b', userId: 'b-rec' }).every((x) => x.tenantId === 't-b')).toBe(true);
  const recordOfB = s.listRecordIds().find((r) => r.tenantId === 't-b')!.id;
  expect(() => s.getRecord(vetA, recordOfB)).toThrow('403: blocked by tenant policy (simulated RLS)');
});

test('recepcion recibe "missing permission"', () => {
  const s = createStore({ today });
  const own = s.listRecordIds().find((r) => r.tenantId === 't-a')!.id;
  expect(() => s.getRecord(recA, own)).toThrow('403: missing permission records.read');
  expect(s.getRecord(vetA, own).id).toBe(own);
  expect(s.can(recA, 'records.read')).toBe(false);
  expect(s.can(recA, 'appointments.write')).toBe(true);
});

test('se rechaza un traslape y una cita fuera de horario', () => {
  const s = createStore({ today });
  // a-vet already has Monday 09:00 for 30 min
  expect(() => s.createAppointment(recA, { vetId: 'a-vet', petId: 'p1', start: at(0, 9, 15), durationMin: 30, reason: 'x' })).toThrow('Overlaps');
  expect(() => s.createAppointment(recA, { vetId: 'a-vet', petId: 'p1', start: at(0, 8, 30), durationMin: 30, reason: 'x' })).toThrow('working hours');
  expect(() => s.createAppointment(recA, { vetId: 'a-vet', petId: 'p1', start: at(0, 18, 45), durationMin: 30, reason: 'x' })).toThrow('working hours');
});

test('una cita valida se guarda en memoria y en el almacenamiento', () => {
  const storage = memory();
  const s = createStore({ today, storage });
  const before = s.listAppointments(recA).length;
  s.createAppointment(recA, { vetId: 'a-vet', petId: 'p1', start: at(2, 12), durationMin: 30, reason: 'Check-up' });
  expect(s.listAppointments(recA)).toHaveLength(before + 1);
  expect(JSON.parse(storage.data['vetnova-demo:appointments'])).toHaveLength(1);
  expect(createStore({ today, storage }).listAppointments(recA)).toHaveLength(before + 1);
});

test('no se puede agendar con un veterinario de otra clinica', () => {
  const s = createStore({ today });
  expect(() => s.createAppointment(recA, { vetId: 'b-vet', petId: 'p1', start: at(2, 12), durationMin: 30, reason: 'x' })).toThrow('tenant policy');
});

test('aparece el banner', () => {
  render(<App />);
  expect(screen.getByRole('note')).toHaveTextContent('fictional data');
});
