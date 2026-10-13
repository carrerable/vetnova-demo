// Fictional data. Two clinics, three users each. Nothing comes from a real system.
export type Role = 'admin' | 'vet' | 'reception';
export type Perm = 'appointments.read' | 'appointments.write' | 'records.read';

export interface Tenant { id: string; name: string }
export interface User { id: string; tenantId: string; name: string; role: Role }
export interface Client { id: string; tenantId: string; name: string }
export interface Pet { id: string; tenantId: string; clientId: string; name: string; species: string }
export interface Appointment { id: string; tenantId: string; vetId: string; petId: string; start: string; durationMin: number; reason: string }
export interface MedicalRecord { id: string; tenantId: string; petId: string; date: string; note: string }

export const TENANTS: Tenant[] = [
  { id: 't-a', name: 'Huellitas Demo' },
  { id: 't-b', name: 'VetCentro Demo' },
];

export const USERS: User[] = [
  { id: 'a-admin', tenantId: 't-a', name: 'Ana Admin', role: 'admin' },
  { id: 'a-vet', tenantId: 't-a', name: 'Dr. Vera', role: 'vet' },
  { id: 'a-rec', tenantId: 't-a', name: 'Rosa Recepcion', role: 'reception' },
  { id: 'b-admin', tenantId: 't-b', name: 'Beto Admin', role: 'admin' },
  { id: 'b-vet', tenantId: 't-b', name: 'Dra. Bravo', role: 'vet' },
  { id: 'b-rec', tenantId: 't-b', name: 'Bruno Recepcion', role: 'reception' },
];

export const ROLE_PERMS: Record<Role, Perm[]> = {
  admin: ['appointments.read', 'appointments.write', 'records.read'],
  vet: ['appointments.read', 'appointments.write', 'records.read'],
  reception: ['appointments.read', 'appointments.write'], // reception has no records.read
};

export const CLIENTS: Client[] = [
  { id: 'c1', tenantId: 't-a', name: 'Familia Ortega' }, { id: 'c2', tenantId: 't-a', name: 'Sr. Molina' },
  { id: 'c3', tenantId: 't-a', name: 'Sra. Quiroz' }, { id: 'c4', tenantId: 't-a', name: 'Familia Paz' },
  { id: 'c5', tenantId: 't-b', name: 'Sra. Lara' }, { id: 'c6', tenantId: 't-b', name: 'Sr. Navarro' },
  { id: 'c7', tenantId: 't-b', name: 'Familia Rivas' }, { id: 'c8', tenantId: 't-b', name: 'Srita. Duarte' },
];

export const PETS: Pet[] = [
  { id: 'p1', tenantId: 't-a', clientId: 'c1', name: 'Canela', species: 'dog' }, { id: 'p2', tenantId: 't-a', clientId: 'c1', name: 'Pelusa', species: 'cat' },
  { id: 'p3', tenantId: 't-a', clientId: 'c2', name: 'Rocco', species: 'dog' }, { id: 'p4', tenantId: 't-a', clientId: 'c3', name: 'Mora', species: 'cat' },
  { id: 'p5', tenantId: 't-a', clientId: 'c4', name: 'Tobi', species: 'dog' },
  { id: 'p6', tenantId: 't-b', clientId: 'c5', name: 'Luna', species: 'cat' }, { id: 'p7', tenantId: 't-b', clientId: 'c6', name: 'Zeus', species: 'dog' },
  { id: 'p8', tenantId: 't-b', clientId: 'c7', name: 'Kiwi', species: 'bird' }, { id: 'p9', tenantId: 't-b', clientId: 'c7', name: 'Nube', species: 'rabbit' },
  { id: 'p10', tenantId: 't-b', clientId: 'c8', name: 'Chispa', species: 'dog' },
];

const REASONS = ['Vaccination', 'Check-up', 'Dental cleaning', 'Skin rash', 'Follow-up', 'Limping'];
const NOTES = ['Weight stable, no findings.', 'Mild ear infection, drops prescribed.', 'Vaccine booster applied.', 'Dental tartar, cleaning advised.', 'Limp on rear left leg, rest advised.', 'Healthy, next visit in 6 months.'];

/** Monday of the week that contains `today` (local time), at 00:00. */
export function weekStart(today: Date): Date {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
export const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date, hh: number, mm = 0) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hh)}:${pad(mm)}`;

/** 12 appointments in the current week (relative to today) and 12 record entries. */
export function seed(today: Date): { appointments: Appointment[]; records: MedicalRecord[] } {
  const monday = weekStart(today);
  const day = (offset: number) => { const d = new Date(monday); d.setDate(d.getDate() + offset); return d; };
  const slots: Array<[string, string, string, number, number, number]> = [
    // tenant, vetId, petId, dayOffset, hour, minutes of duration
    ['t-a', 'a-vet', 'p1', 0, 9, 30], ['t-a', 'a-vet', 'p2', 0, 11, 30], ['t-a', 'a-vet', 'p3', 1, 10, 45],
    ['t-a', 'a-vet', 'p4', 2, 15, 30], ['t-a', 'a-vet', 'p5', 3, 9, 60], ['t-a', 'a-vet', 'p1', 4, 16, 30],
    ['t-b', 'b-vet', 'p6', 0, 10, 30], ['t-b', 'b-vet', 'p7', 1, 12, 30], ['t-b', 'b-vet', 'p8', 2, 9, 30],
    ['t-b', 'b-vet', 'p9', 3, 14, 45], ['t-b', 'b-vet', 'p10', 3, 17, 30], ['t-b', 'b-vet', 'p6', 4, 11, 30],
  ];
  const appointments = slots.map(([tenantId, vetId, petId, off, hh, dur], i) => ({
    id: `ap${i + 1}`, tenantId, vetId, petId, start: iso(day(off), hh), durationMin: dur, reason: REASONS[i % REASONS.length],
  }));
  const recPets: Array<[string, string]> = [['t-a', 'p1'], ['t-a', 'p2'], ['t-a', 'p3'], ['t-a', 'p4'], ['t-a', 'p5'], ['t-a', 'p1'], ['t-b', 'p6'], ['t-b', 'p7'], ['t-b', 'p8'], ['t-b', 'p9'], ['t-b', 'p10'], ['t-b', 'p6']];
  const records = recPets.map(([tenantId, petId], i) => {
    const d = new Date(monday); d.setDate(d.getDate() - 7 * (1 + (i % 4)));
    return { id: `r${i + 1}`, tenantId, petId, date: iso(d, 0).slice(0, 10), note: NOTES[i % NOTES.length] };
  });
  return { appointments, records };
}
