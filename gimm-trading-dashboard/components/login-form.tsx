'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { login } from '@/app/login/actions';

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl login-submit font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50">
    {pending ? <><LoaderCircle size={18} className="animate-spin"/>Anmeldung läuft …</> : <>Zum Dashboard<ArrowRight size={18}/></>}
  </button>;
}

export function LoginForm({ next, error, configured }: { next: string; error?: string; configured: boolean }) {
  const [visible, setVisible] = useState(false);
  const inputClass = 'h-12 w-full rounded-xl border border-white/10 login-input pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-500';
  return <form action={login} className="space-y-5">
    <input type="hidden" name="next" value={next}/>
    {error && <p id="login-error" role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-200">{error}</p>}
    <div><label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-300">Benutzername</label><div className="relative"><UserRound size={17} className="pointer-events-none absolute left-4 top-4 text-slate-500"/><input id="username" name="username" aria-describedby={error ? 'login-error' : undefined} autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={128} required disabled={!configured} className={inputClass} placeholder="Dein Benutzername"/></div></div>
    <div><label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">Passwort</label><div className="relative"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-4 text-slate-500"/><input id="password" name="password" aria-describedby={error ? 'login-error' : undefined} type={visible ? 'text' : 'password'} autoComplete="current-password" maxLength={1024} required disabled={!configured} className={`${inputClass} pr-12`} placeholder="Dein Passwort"/><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'} aria-pressed={visible} className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:text-white focus-visible:outline-2 focus-visible:outline-accent">{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
    <Submit disabled={!configured}/>
    <p className="text-center text-xs leading-5 text-slate-500">Privater Zugang · Deine Sitzung endet nach acht Stunden.</p>
  </form>;
}
