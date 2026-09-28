import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Columns3, Download, Plus, Search, Upload, X, Phone, MessageCircle } from 'lucide-react';
import { Avatar, Button, Checkbox, Empty, Field, Input, Menu, Modal, PageHeader, Pagination, PillSelect, Select, Spinner, Tabs } from '@/components/ui';
import { fieldValue } from '@/components/fields/DynamicField';
import { api, downloadFile, errorMessage, qs } from '@/lib/api';
import { cn, fmtDateTime, isOverdue, isToday, orDash } from '@/lib/utils';
import { useBootstrap } from '@/store/bootstrap';
import { useCan } from '@/store/auth';
import type { ApiList, Lead } from '@/types';
import { AssignModal, StageBadge, StatusBadge, useLeadInvalidate } from './shared';
import { CreateLeadModal } from './CreateLeadModal';

const TABS = [
  { key: 'contacted_today', label: 'Contacted Today' }, { key: 'assigned_today', label: 'Assigned Today' }, { key: 'all', label: 'All Leads' },
  { key: 'created_today', label: 'Created Today' }, { key: 'followup_today', label: 'Follow-ups Today' }, { key: 'overdue', label: 'Overdue' }, { key: 'unassigned', label: 'Unassigned' }, { key: 'today_list', label: 'Today List' },
] as const;
type Tab = (typeof TABS)[number]['key'];

const SYSTEM_COLS: { key: string; label: string; sortable?: boolean; always?: boolean }[] = [
  { key: 'name', label: 'Name', sortable: true, always: true }, { key: 'phone', label: 'Phone', sortable: true }, { key: 'stage', label: 'Stage' }, { key: 'status', label: 'Status' },
  { key: 'owner', label: 'Owner' }, { key: 'source', label: 'Source' }, { key: 'city', label: 'City' }, { key: 'nextFollowUpAt', label: 'Next follow-up', sortable: true },
  { key: 'lastContactedAt', label: 'Last contacted', sortable: true }, { key: 'assignedAt', label: 'Assigned', sortable: true }, { key: 'remarks', label: 'Remarks' }, { key: 'createdAt', label: 'Created', sortable: true }, { key: 'email', label: 'Email' },
];
const DEFAULT_COLS = ['name', 'phone', 'stage', 'status', 'owner', 'source', 'nextFollowUpAt', 'lastContactedAt', 'createdAt'];
const COLS_KEY = 'lead-crm-columns';

export default function LeadsPage() {
  const [sp, setSp] = useSearchParams(); const nav = useNavigate();
  const { boot } = useBootstrap(); const can = useCan(); const inv = useLeadInvalidate();
  const get = (k: string, d = '') => sp.get(k) ?? d;
  const tab = (get('tab', 'all') as Tab); const page = Number(get('page', '1')); const limit = Number(get('limit', String(boot.org?.settings.defaultRowsPerPage ?? 100)));
  const sortBy = get('sortBy', 'createdAt'); const sortDir = get('sortDir', 'desc') as 'asc' | 'desc';
  const filters = { search: get('search'), ownerId: get('ownerId'), stageId: get('stageId'), statusId: get('statusId'), sourceId: get('sourceId'), teamId: get('teamId') };
  const customFilters = useMemo(() => Object.fromEntries(Array.from(sp.entries()).filter(([k]) => k.startsWith('custom.'))), [sp]);
  const update = (patch: Record<string, string | undefined>, resetPage = true) => { const n = new URLSearchParams(sp); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (resetPage) n.delete('page'); setSp(n, { replace: true }); };
  const [search, setSearch] = useState(filters.search);
  useEffect(() => { setSearch(filters.search); }, [filters.search]);
  useEffect(() => { const t = setTimeout(() => { if (search !== filters.search) update({ search }); }, 350); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = { tab, page, limit, sortBy, sortDir, ...filters, ...customFilters };
  const list = useQuery({ queryKey: ['leads', params], queryFn: async () => (await api.get<ApiList<Lead>>(`/leads${qs(params)}`)).data, placeholderData: (prev) => prev });
  const counts = useQuery({ queryKey: ['lead-counts', filters, customFilters], queryFn: async () => (await api.get<{ data: Record<string, number> }>(`/leads/counts${qs({ ...filters, ...customFilters })}`)).data.data, staleTime: 15_000 });

  const [cols, setCols] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(COLS_KEY) || 'null') ?? DEFAULT_COLS; } catch { return DEFAULT_COLS; } });
  useEffect(() => { localStorage.setItem(COLS_KEY, JSON.stringify(cols)); }, [cols]);
  const listFields = boot.fields.filter((f) => f.showInList);
  const allCols = [...SYSTEM_COLS, ...boot.fields.map((f) => ({ key: `custom.${f.key}`, label: f.label }))];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { setSelected(new Set()); }, [tab, page, filters.search, filters.ownerId, filters.stageId, filters.statusId, filters.sourceId]);
  const rows = list.data?.data ?? [];
  const allSel = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(rows.map((r) => r.id)));
  const [create, setCreate] = useState(false); const [assign, setAssign] = useState(false);
  const [bulk, setBulk] = useState<null | 'stage' | 'status' | 'source' | 'followup' | 'delete' | 'field'>(null);

  const sortIcon = (k: string) => (sortBy !== k ? <ArrowUpDown size={12} className="text-ink-3" /> : sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />);
  const onSort = (k: string) => update({ sortBy: k, sortDir: sortBy === k && sortDir === 'desc' ? 'asc' : 'desc' });

  const cell = (l: Lead, key: string) => {
    if (key.startsWith('custom.')) { const k = key.slice(7); return fieldValue(boot.fields.find((f) => f.key === k), l.customFields?.[k], boot.org?.currency); }
    switch (key) {
      case 'name': return <Link to={`/leads/${l.id}`} className="font-medium text-ink hover:text-primary flex items-center gap-2">{l.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: l.color }} />}{l.name || <span className="text-ink-3 italic">No name</span>}</Link>;
      case 'phone': return <span className="tabular-nums">{l.phone}</span>;
      case 'stage': return <StageBadge stage={l.stage} />;
      case 'status': return <StatusBadge status={l.status} />;
      case 'owner': return l.owner ? <span className="inline-flex items-center gap-1.5"><Avatar name={l.owner.name} color={l.owner.avatarColor} size={20} />{l.owner.name}</span> : <span className="text-warning">Unassigned</span>;
      case 'source': return orDash(l.source?.name);
      case 'nextFollowUpAt': return l.nextFollowUpAt ? <span className={cn('tabular-nums', isOverdue(l.nextFollowUpAt) && 'text-danger font-medium', isToday(l.nextFollowUpAt) && 'text-primary font-medium')}>{fmtDateTime(l.nextFollowUpAt)}</span> : '—';
      case 'lastContactedAt': case 'assignedAt': case 'createdAt': return <span className="tabular-nums text-ink-2">{fmtDateTime(l[key])}</span>;
      case 'remarks': return <span className="block max-w-[260px] truncate text-ink-2" title={l.remarks}>{orDash(l.remarks)}</span>;
      default: return orDash((l as unknown as Record<string, unknown>)[key]);
    }
  };

  const exportCsv = async () => { try { await downloadFile(`/leads/export${qs({ ...params, ids: selected.size ? Array.from(selected) : undefined })}`, `leads-${new Date().toISOString().slice(0, 10)}.csv`); } catch (e) { toast.error(errorMessage(e)); } };
  const activeFilters = Object.entries({ ...filters, ...customFilters }).filter(([k, v]) => v && k !== 'search');

  return (
    <div>
      <PageHeader title="Leads" subtitle={`${counts.data?.all ?? '…'} leads in your view`} actions={<>
        {can('lead.import') && <Button onClick={() => nav('/admin/imports')}><Upload size={15} /> Import</Button>}
        {can('lead.export') && <Button onClick={exportCsv}><Download size={15} /> Export</Button>}
        {can('lead.create') && <Button variant="primary" onClick={() => setCreate(true)}><Plus size={15} /> Create lead</Button>}
      </>} />

      <Tabs value={tab} onChange={(t) => update({ tab: t === 'all' ? undefined : t })} tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: counts.data?.[t.key] }))} className="mb-3" />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email, remarks" className="pl-8 w-[260px] h-8 text-[13px]" /></div>
        {can('lead.assign', 'report.view_team') && <PillSelect label="Owner" value={filters.ownerId} onChange={(v) => update({ ownerId: v })} options={boot.users.map((u) => ({ value: u.id, label: u.name }))} />}
        <PillSelect label="Stage" value={filters.stageId} onChange={(v) => update({ stageId: v })} options={boot.stages.map((s) => ({ value: s.id, label: s.name }))} />
        <PillSelect label="Status" value={filters.statusId} onChange={(v) => update({ statusId: v })} options={boot.statuses.map((s) => ({ value: s.id, label: s.name }))} />
        <PillSelect label="Source" value={filters.sourceId} onChange={(v) => update({ sourceId: v })} options={boot.sources.map((s) => ({ value: s.id, label: s.name }))} />
        {boot.teams.length > 1 && <PillSelect label="Team" value={filters.teamId} onChange={(v) => update({ teamId: v })} options={boot.teams.map((t) => ({ value: t.id, label: t.name }))} />}
        {listFields.filter((f) => f.type === 'select').map((f) => <PillSelect key={f.key} label={f.label} value={customFilters[`custom.${f.key}`] ?? ''} onChange={(v) => update({ [`custom.${f.key}`]: v })} options={f.options.map((o) => ({ value: o, label: o }))} />)}
        {activeFilters.length > 0 && <button className="text-[12.5px] text-ink-3 hover:text-ink inline-flex items-center gap-1" onClick={() => update(Object.fromEntries(activeFilters.map(([k]) => [k, undefined])))}><X size={13} /> Clear filters</button>}
        <div className="ml-auto flex items-center gap-2">
          <Menu align="right" trigger={() => <Button size="sm"><Columns3 size={14} /> Columns</Button>}>
            <div className="px-3 py-1.5 max-h-72 overflow-y-auto scroll-thin space-y-1.5 min-w-[200px]">{allCols.map((c) => <Checkbox key={c.key} checked={cols.includes(c.key)} disabled={SYSTEM_COLS.find((s) => s.key === c.key)?.always} onChange={(v) => setCols((cs) => v ? [...cs, c.key] : cs.filter((x) => x !== c.key))} label={c.label} />)}</div>
            <div className="border-t border-line px-3 py-1.5"><button className="text-[12.5px] text-primary" onClick={() => setCols(DEFAULT_COLS)}>Reset to default</button></div>
          </Menu>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-2 px-3 h-11 rounded-md bg-navy text-white text-[13px]">
          <span className="font-medium">{selected.size} selected</span>
          <span className="opacity-40">|</span>
          {can('lead.bulk_assign', 'lead.assign') && <button className="hover:underline" onClick={() => setAssign(true)}>Assign</button>}
          {can('lead.bulk_update') && <><button className="hover:underline" onClick={() => setBulk('stage')}>Update stage</button><button className="hover:underline" onClick={() => setBulk('status')}>Update status</button>{can('lead.update_source') && <button className="hover:underline" onClick={() => setBulk('source')}>Update source</button>}<button className="hover:underline" onClick={() => setBulk('followup')}>Set follow-up</button><button className="hover:underline" onClick={() => setBulk('field')}>Update field</button></>}
          <BulkQuick ids={Array.from(selected)} action="today_list" payload={{ add: true }} label="Add to Today list" onDone={() => { inv(); setSelected(new Set()); }} />
          {can('lead.export') && <button className="hover:underline" onClick={exportCsv}>Export selected</button>}
          {can('lead.bulk_delete') && <button className="hover:underline text-red-200 ml-auto" onClick={() => setBulk('delete')}>Delete</button>}
          <button className="opacity-70 hover:opacity-100" onClick={() => setSelected(new Set())} aria-label="Clear selection"><X size={15} /></button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-330px)] scroll-thin">
          <table className="w-full border-collapse">
            <thead><tr>
              <th className="th w-9"><Checkbox checked={allSel} indeterminate={!allSel && selected.size > 0} onChange={toggleAll} /></th>
              {cols.map((k) => { const c = allCols.find((x) => x.key === k); if (!c) return null; const s = SYSTEM_COLS.find((x) => x.key === k)?.sortable; return <th key={k} className={cn('th', s && 'cursor-pointer hover:text-ink')} onClick={() => s && onSort(k)}><span className="inline-flex items-center gap-1">{c.label}{s && sortIcon(k)}</span></th>; })}
              <th className="th w-16"></th>
            </tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className={cn('hover:bg-surface-2/70 transition-colors', selected.has(l.id) && 'bg-primary-soft/60')}>
                  <td className="td"><Checkbox checked={selected.has(l.id)} onChange={(v) => setSelected((s) => { const n = new Set(s); v ? n.add(l.id) : n.delete(l.id); return n; })} /></td>
                  {cols.map((k) => <td key={k} className="td">{cell(l, k)}</td>)}
                  <td className="td"><span className="inline-flex gap-1 text-ink-3">{can('lead.communicate') && <><a href={`tel:${l.phone}`} title="Call" className="hover:text-primary"><Phone size={14} /></a><a href={`https://wa.me/${l.phone.length === 10 ? '91' + l.phone : l.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="WhatsApp" className="hover:text-success"><MessageCircle size={14} /></a></>}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.isLoading && <div className="py-16 flex justify-center"><Spinner /></div>}
          {!list.isLoading && !rows.length && <Empty title={tab === 'all' && !activeFilters.length && !filters.search ? 'No leads yet' : 'No leads match'} hint={tab === 'all' && !activeFilters.length ? 'Create your first lead or import a CSV to get started.' : 'Try another tab or clear the filters.'} action={tab === 'all' && can('lead.create') && !activeFilters.length ? <Button variant="primary" onClick={() => setCreate(true)}><Plus size={15} /> Create lead</Button> : undefined} />}
        </div>
        <div className="px-3 py-2 border-t border-line bg-surface-2/40"><Pagination page={page} totalPages={list.data?.meta.totalPages ?? 1} total={list.data?.meta.total ?? 0} limit={limit} onPage={(p) => update({ page: String(p) }, false)} onLimit={(l) => update({ limit: String(l) })} /></div>
      </div>

      <CreateLeadModal open={create} onClose={() => setCreate(false)} />
      <AssignModal open={assign} onClose={() => setAssign(false)} leadIds={Array.from(selected)} onDone={() => setSelected(new Set())} />
      <BulkModal kind={bulk} onClose={() => setBulk(null)} ids={Array.from(selected)} onDone={() => setSelected(new Set())} />
    </div>
  );
}

function BulkQuick({ ids, action, payload, label, onDone }: { ids: string[]; action: string; payload: Record<string, unknown>; label: string; onDone: () => void }) {
  const m = useMutation({ mutationFn: () => api.post('/leads/bulk', { ids, action, payload }), onSuccess: (r) => { toast.success(`${label}: ${r.data.data.affected} updated`); onDone(); }, onError: (e) => toast.error(errorMessage(e)) });
  return <button className="hover:underline disabled:opacity-50" disabled={m.isPending} onClick={() => m.mutate()}>{label}</button>;
}

function BulkModal({ kind, onClose, ids, onDone }: { kind: null | 'stage' | 'status' | 'source' | 'followup' | 'delete' | 'field'; onClose: () => void; ids: string[]; onDone: () => void }) {
  const { boot } = useBootstrap(); const inv = useLeadInvalidate();
  const [value, setValue] = useState(''); const [remarks, setRemarks] = useState(''); const [fieldKey, setFieldKey] = useState('');
  useEffect(() => { setValue(''); setRemarks(''); setFieldKey(''); }, [kind]);
  const m = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = kind === 'stage' ? { stageId: value, remarks } : kind === 'status' ? { statusId: value || null, remarks } : kind === 'source' ? { sourceId: value || null } : kind === 'followup' ? { nextFollowUpAt: value ? new Date(value).toISOString() : null } : kind === 'field' ? { key: fieldKey, value } : {};
      return api.post('/leads/bulk', { ids, action: kind, payload });
    },
    onSuccess: (r) => { const d = r.data.data; toast.success(`${d.affected} of ${d.requested} updated${d.errors?.length ? `; ${d.errors.length} skipped: ${d.errors[0].message}` : ''}`); inv(); onDone(); onClose(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const titles = { stage: 'Update stage', status: 'Update status', source: 'Update source', followup: 'Set follow-up', delete: 'Delete leads', field: 'Update a field' };
  if (!kind) return null;
  const fieldDef = boot.fields.find((f) => `custom.${f.key}` === fieldKey);
  return (
    <Modal open onClose={onClose} title={`${titles[kind]} · ${ids.length} leads`} width="max-w-md" footer={<><Button onClick={onClose}>Cancel</Button><Button variant={kind === 'delete' ? 'danger' : 'primary'} loading={m.isPending} onClick={() => m.mutate()} disabled={kind !== 'delete' && kind !== 'followup' && kind !== 'status' && kind !== 'source' && !value}>{kind === 'delete' ? 'Delete' : 'Apply'}</Button></>}>
      <div className="space-y-3">
        {kind === 'stage' && <><Field label="New stage"><Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">Select…</option>{boot.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field><p className="text-[12.5px] text-ink-3">Stage rules still apply — leads missing mandatory fields will be skipped and reported.</p></>}
        {kind === 'status' && <Field label="New status"><Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">— Clear —</option>{boot.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
        {kind === 'source' && <Field label="New source"><Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">— Clear —</option>{boot.sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>}
        {(kind === 'stage' || kind === 'status') && <Field label="Remark"><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>}
        {kind === 'followup' && <Field label="Next follow-up" hint="Leave empty to reset"><Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} /></Field>}
        {kind === 'field' && <>
          <Field label="Field"><Select value={fieldKey} onChange={(e) => { setFieldKey(e.target.value); setValue(''); }}><option value="">Select…</option><optgroup label="Lead">{['city', 'state', 'country', 'language', 'remarks'].map((k) => <option key={k} value={k}>{k}</option>)}</optgroup><optgroup label="Custom">{boot.fields.map((f) => <option key={f.key} value={`custom.${f.key}`}>{f.label}</option>)}</optgroup></Select></Field>
          {fieldKey && <Field label="Value">{fieldDef?.type === 'select' ? <Select value={value} onChange={(e) => setValue(e.target.value)}><option value="">Select…</option>{fieldDef.options.map((o) => <option key={o} value={o}>{o}</option>)}</Select> : <Input value={value} onChange={(e) => setValue(e.target.value)} />}</Field>}
        </>}
        {kind === 'delete' && <p className="text-[13.5px] text-ink-2">Leads are soft-deleted and can be restored by an admin. Their history is kept.</p>}
      </div>
    </Modal>
  );
}
