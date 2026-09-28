import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Field, Input, Select, Toggle } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useBootstrap, useInvalidateBootstrap } from '@/store/bootstrap';

const TZ = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Kuwait', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SettingsPage() {
  const { boot } = useBootstrap(); const inv = useInvalidateBootstrap();
  const org = boot.org;
  const [v, setV] = useState({ name: '', timezone: 'Asia/Kolkata', currency: 'INR', defaultRowsPerPage: 100, workStart: '09:30', workEnd: '18:30', workingDays: [1, 2, 3, 4, 5, 6], defaultFollowUpHours: 24, duplicatePhoneCheck: true, primaryColor: '#185FA5' });
  useEffect(() => { if (org) setV({ name: org.name, timezone: org.timezone, currency: org.currency, defaultRowsPerPage: org.settings.defaultRowsPerPage, workStart: org.settings.workingHours.start, workEnd: org.settings.workingHours.end, workingDays: org.settings.workingDays, defaultFollowUpHours: org.settings.defaultFollowUpHours, duplicatePhoneCheck: org.settings.duplicatePhoneCheck, primaryColor: org.branding.primaryColor }); }, [org]);
  const save = useMutation({ mutationFn: () => api.patch('/organisation', { name: v.name, timezone: v.timezone, currency: v.currency, branding: { primaryColor: v.primaryColor }, settings: { defaultRowsPerPage: v.defaultRowsPerPage, workingHours: { start: v.workStart, end: v.workEnd }, workingDays: v.workingDays, defaultFollowUpHours: v.defaultFollowUpHours, duplicatePhoneCheck: v.duplicatePhoneCheck } }), onSuccess: () => { toast.success('Settings saved'); inv(); }, onError: (e) => toast.error(errorMessage(e)) });
  return (
    <div className="max-w-2xl">
      <h2 className="text-[16px] font-semibold mb-3">Organisation settings</h2>
      <div className="card p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Company name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="Timezone" hint='"Today" tabs and reports use this'><Select value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })}>{TZ.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Currency"><Select value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>{['INR', 'AED', 'SAR', 'QAR', 'KWD', 'USD', 'GBP', 'EUR'].map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Default rows per page"><Select value={String(v.defaultRowsPerPage)} onChange={(e) => setV({ ...v, defaultRowsPerPage: Number(e.target.value) })}>{[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
          <Field label="Working hours start"><Input type="time" value={v.workStart} onChange={(e) => setV({ ...v, workStart: e.target.value })} /></Field>
          <Field label="Working hours end"><Input type="time" value={v.workEnd} onChange={(e) => setV({ ...v, workEnd: e.target.value })} /></Field>
          <Field label="Default follow-up (hours)"><Input type="number" min={1} value={v.defaultFollowUpHours} onChange={(e) => setV({ ...v, defaultFollowUpHours: Number(e.target.value) })} /></Field>
          <Field label="Brand colour"><div className="flex gap-2"><input type="color" value={v.primaryColor} onChange={(e) => setV({ ...v, primaryColor: e.target.value })} className="h-9 w-12 rounded border border-line bg-surface p-1" /><Input value={v.primaryColor} onChange={(e) => setV({ ...v, primaryColor: e.target.value })} /></div></Field>
        </div>
        <Field label="Working days"><div className="flex gap-1.5">{DAYS.map((d, i) => <button key={d} type="button" onClick={() => setV({ ...v, workingDays: v.workingDays.includes(i) ? v.workingDays.filter((x) => x !== i) : [...v.workingDays, i].sort() })} className={`pill ${v.workingDays.includes(i) ? 'border-primary text-primary bg-primary-soft' : ''}`}>{d}</button>)}</div></Field>
        <Toggle checked={v.duplicatePhoneCheck} onChange={(x) => setV({ ...v, duplicatePhoneCheck: x })} label="Warn about duplicate phone numbers when creating leads" />
        <div className="flex justify-end pt-2 border-t border-line"><Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>Save settings</Button></div>
      </div>
      <p className="text-[12.5px] text-ink-3 mt-3">Organisation ID: <code className="font-mono">{org?.id}</code> · slug <code className="font-mono">{org?.slug}</code>. Every record carries this ID, which is what makes a future multi-tenant rollout possible without a migration.</p>
    </div>
  );
}
