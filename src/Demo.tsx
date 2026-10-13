import { useMemo, useState } from 'react';
import type { Lang } from './i18n';
import { Shell } from './ui/Shell';
import { Frame } from './ui/Frame';
import { PETS, TENANTS, USERS, pad } from './data/seed';
import { createStore, safeStorage, type Ctx } from './lib/store';

const POLICY = "CREATE POLICY tenant_isolation ON appointments USING (tenant_id = current_setting('app.tenant_id')::uuid);";

const T = {
  en: {
    eyebrow: 'Case study / multi-tenant SaaS', title: 'VetNova: multi-tenant clinic demo',
    lead: 'Two fictional clinics share one store. Each user sees only their clinic, and only what their role allows.',
    clinic: 'Clinic', user: 'User', agenda: 'This week', none: 'No appointments', newAppt: 'New appointment', vet: 'Veterinarian', pet: 'Pet', day: 'Day', time: 'Start (09:00-19:00)', dur: 'Minutes', reason: 'Reason', save: 'Save appointment', saved: 'Saved',
    records: 'Medical records', open: 'Open', iso: 'Isolation test', isoBtn: 'Try to read a record of the other clinic', result: 'Result',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], rolePerms: 'Role', reset: 'Fictional data. Appointments you create are stored only in this browser.',
  },
  es: {
    eyebrow: 'Caso de estudio / SaaS multi-clínica', title: 'VetNova: demo multi-clínica',
    lead: 'Dos clínicas ficticias comparten un almacén. Cada usuario ve solo su clínica y solo lo que su rol permite.',
    clinic: 'Clínica', user: 'Usuario', agenda: 'Esta semana', none: 'Sin citas', newAppt: 'Nueva cita', vet: 'Veterinario', pet: 'Mascota', day: 'Día', time: 'Inicio (09:00-19:00)', dur: 'Minutos', reason: 'Motivo', save: 'Guardar cita', saved: 'Guardada',
    records: 'Expedientes', open: 'Abrir', iso: 'Prueba de aislamiento', isoBtn: 'Intentar leer un expediente de la otra clínica', result: 'Resultado',
    days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'], rolePerms: 'Rol', reset: 'Datos ficticios. Las citas que crees se guardan solo en este navegador.',
  },
};

export function Demo({ lang }: { lang: Lang }) {
  const t = T[lang];
  const store = useMemo(() => createStore({ storage: safeStorage() }), []);
  const [tenantId, setTenantId] = useState('t-a');
  const [userId, setUserId] = useState('a-rec');
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState('');
  const [rec, setRec] = useState('');
  const [form, setForm] = useState({ petId: '', day: 0, time: '09:00', dur: 30, reason: 'Check-up' });

  const ctx: Ctx = { tenantId, userId };
  const users = USERS.filter((u) => u.tenantId === tenantId);
  const user = users.find((u) => u.id === userId) ?? users[0];
  const pets = PETS.filter((p) => p.tenantId === tenantId);
  const vet = users.find((u) => u.role === 'vet')!;
  const monday = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }, []);
  const dayIso = (off: number) => { const d = new Date(monday); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

  const agenda = useMemo(() => { try { return store.listAppointments(ctx); } catch { return []; } }, [store, tenantId, userId, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const records = store.listRecordIds().filter((r) => r.tenantId === tenantId);
  const petName = (id: string) => PETS.find((p) => p.id === id)?.name ?? id;

  const changeTenant = (id: string) => { setTenantId(id); setUserId(USERS.find((u) => u.tenantId === id && u.role === 'reception')!.id); setMsg(''); setRec(''); };
  const submit = () => {
    try {
      store.createAppointment(ctx, { vetId: vet.id, petId: form.petId || pets[0].id, start: `${dayIso(form.day)}T${form.time}`, durationMin: form.dur, reason: form.reason });
      setMsg(t.saved); setTick(tick + 1);
    } catch (e) { setMsg((e as Error).message); }
  };
  const open = (id: string) => { try { setRec(store.getRecord(ctx, id).note); } catch (e) { setRec((e as Error).message); } };
  const isoTest = () => {
    const other = store.listRecordIds().find((r) => r.tenantId !== tenantId)!;
    try { setRec(store.getRecord(ctx, other.id).note); } catch (e) { setRec((e as Error).message); }
  };

  return (
    <Shell lang={lang} eyebrow={t.eyebrow} title={t.title} lead={t.lead}>
      <Frame tl="TENANT" tr={t.rolePerms + ': ' + user.role}>
        <div className="row">
          <label>{t.clinic}
            <select value={tenantId} onChange={(e) => changeTenant(e.target.value)}>{TENANTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          </label>
          <label>{t.user}
            <select value={user.id} onChange={(e) => { setUserId(e.target.value); setMsg(''); setRec(''); }}>{users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}</select>
          </label>
        </div>
        <p className="note" style={{ marginTop: 'var(--s-3)' }}>{t.reset}</p>
      </Frame>

      <Frame tl="AGENDA">
        <h2>{t.agenda}</h2>
        {agenda.length === 0 ? <p className="mut">{t.none}</p> : (
          <div className="tablewrap"><table>
            <thead><tr><th>{t.day}</th><th>{t.time.split(' ')[0]}</th><th>{t.pet}</th><th>{t.vet}</th><th>{t.reason}</th></tr></thead>
            <tbody>{agenda.map((a) => (
              <tr key={a.id} data-clinic={a.tenantId}><td>{a.start.slice(0, 10)}</td><td>{a.start.slice(11)} +{a.durationMin}m</td><td>{petName(a.petId)}</td><td>{USERS.find((u) => u.id === a.vetId)?.name}</td><td>{a.reason}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Frame>

      <Frame tl="NEW">
        <h2>{t.newAppt}</h2>
        <div className="row">
          <label>{t.pet}<select value={form.petId || pets[0].id} onChange={(e) => setForm({ ...form, petId: e.target.value })}>{pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>{t.day}<select value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>{t.days.map((d, i) => <option key={d} value={i}>{d} {dayIso(i).slice(5)}</option>)}</select></label>
          <label>{t.time}<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
          <label>{t.dur}<input type="number" min={15} step={15} value={form.dur} onChange={(e) => setForm({ ...form, dur: Number(e.target.value) })} style={{ width: '6rem' }} /></label>
          <button className="btn primary" onClick={submit}>{t.save}</button>
        </div>
        <p role="status" className="note" data-testid="msg" style={{ marginTop: 'var(--s-3)' }}>{msg}</p>
      </Frame>

      <Frame tl="RECORDS">
        <h2>{t.records}</h2>
        <div className="row">
          {records.map((r) => <button key={r.id} className="toggle" onClick={() => open(r.id)}>{t.open} {r.id}</button>)}
        </div>
        <pre data-testid="record" style={{ marginTop: 'var(--s-3)' }}>{rec || '-'}</pre>
      </Frame>

      <Frame tl="RLS">
        <h2>{t.iso}</h2>
        <pre>{POLICY}</pre>
        <button className="btn" onClick={isoTest}>{t.isoBtn}</button>
        <p className="note" style={{ marginTop: 'var(--s-3)' }}>{t.result}: {rec || '-'}</p>
      </Frame>
    </Shell>
  );
}
