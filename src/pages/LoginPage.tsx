import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button, Field, Input } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { API_BASE, errorMessage } from '@/lib/api';

export function LoginPage() {
  const setSession = useAuth((s) => s.setSession);
  const token = useAuth((s) => s.accessToken);
  const nav = useNavigate(); const loc = useLocation();
  const [identifier, setId] = useState(''); const [password, setPw] = useState(''); const [busy, setBusy] = useState(false);
  if (token) return <Navigate to="/" replace />;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { identifier, password });
      setSession(res.data.data);
      nav((loc.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) { toast.error(errorMessage(err, 'Could not sign in')); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-navy text-white">
        <div className="flex items-center gap-2.5"><span className="h-9 w-9 rounded-md bg-white/15 grid place-items-center font-bold">L</span><span className="font-semibold text-[15px]">Lead CRM</span></div>
        <div className="max-w-md">
          <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight">Every call, every follow-up, every disbursement — in one pipeline.</h1>
          <p className="mt-4 text-white/70 text-[15px] leading-relaxed">Built for loan and finance calling teams: role-based visibility, stage rules, document collection and daily follow-up lists.</p>
        </div>
        <p className="text-white/50 text-[12.5px]">Lead → Prospect → Logged → Underwriting → Approved</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-[360px] space-y-4">
          <div className="lg:hidden flex items-center gap-2 mb-6"><span className="h-8 w-8 rounded-md bg-primary text-white grid place-items-center font-bold">L</span><span className="font-semibold">Lead CRM</span></div>
          <div><h2 className="text-[22px] font-semibold">Sign in</h2><p className="text-[13.5px] text-ink-3 mt-1">Use your email, username or phone number.</p></div>
          <Field label="Email, username or phone"><Input autoFocus value={identifier} onChange={(e) => setId(e.target.value)} autoComplete="username" required /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required /></Field>
          <Button type="submit" variant="primary" className="w-full" loading={busy}>Sign in</Button>
          <p className="text-[12.5px] text-ink-3 text-center">Forgot your password? Ask your admin to reset it.</p>
        </form>
      </section>
    </div>
  );
}
