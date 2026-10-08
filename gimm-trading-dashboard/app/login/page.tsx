import { redirect } from 'next/navigation';
import { ArrowUpRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/dashboard/primitives';
import { isAuthenticated } from '@/lib/auth';
import { readAuthConfig, safeDashboardRedirect } from '@/lib/auth-crypto';
import { LoginForm } from '@/components/login-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Anmelden · GIMM Trading Intelligence' };
const errors: Record<string, string> = {
  invalid: 'Die Anmeldung war nicht erfolgreich. Prüfe Benutzername und Passwort.',
  limited: 'Zu viele Anmeldeversuche. Bitte versuche es in 15 Minuten erneut.',
  unavailable: 'Die Anmeldung ist momentan nicht verfügbar. Bitte versuche es später erneut.',
  unconfigured: 'Der private Zugang ist noch nicht eingerichtet. Bitte konfiguriere die Auth-Einstellungen auf dem Server.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const query = await searchParams;
  const next = safeDashboardRedirect(query.next);
  if (await isAuthenticated()) redirect(next);
  const configured = readAuthConfig() !== null;
  const error = !configured ? errors.unconfigured : typeof query.error === 'string' ? errors[query.error] : undefined;
  return <main lang="de" className="auth-page">
    <header className="auth-header"><Brand/><span className="status-pill"><ShieldCheck size={12} className="positive"/>Privater Zugang</span></header>
    <div className="auth-layout">
      <section className="auth-editorial reveal"><p className="eyebrow">DEIN JOURNAL. DEINE PERSPEKTIVE.</p><h1>Weniger Rauschen.<br/>Mehr Klarheit.<br/><span>Dein nächster Schritt.</span></h1><p>Verstehe die Geschichte hinter deinen Trades. Ein privater Ort für deine Performance, deine Setups und deinen Fortschritt.</p>
        <div className="auth-art" aria-label="Illustration einer Performance-Ansicht"><div className="auth-art-header"><span>Performance overview</span><ArrowUpRight size={14}/></div><div className="auth-art-total">The bigger picture.</div>
          <svg viewBox="0 0 380 110" fill="none" style={{ width: '100%', marginTop: 20 }} aria-hidden="true"><defs><linearGradient id="auth-curve" x1="0" y1="0" x2="0" y2="110" gradientUnits="userSpaceOnUse"><stop stopColor="#8b7aff" stopOpacity=".18"/><stop offset="1" stopColor="#8b7aff" stopOpacity="0"/></linearGradient></defs><path d="M0 35H380M0 70H380M0 105H380" stroke="#ffffff09" strokeDasharray="3 5"/><path d="M0 99L18 94L35 98L52 79L68 84L88 68L104 75L121 60L140 65L157 42L174 49L191 40L210 48L226 27L245 35L261 20L279 28L297 17L315 21L335 10L353 16L380 4V110H0Z" fill="url(#auth-curve)"/><path d="M0 99L18 94L35 98L52 79L68 84L88 68L104 75L121 60L140 65L157 42L174 49L191 40L210 48L226 27L245 35L261 20L279 28L297 17L315 21L335 10L353 16L380 4" stroke="#8b7aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div className="auth-art-grid"><div><small>YOUR PERFORMANCE</small><strong>A clearer perspective</strong></div><div><small>YOUR PROCESS</small><strong>Room to improve</strong></div></div><div className="auth-art-label">Illustrative Darstellung · keine Handelsergebnisse</div>
        </div><div className="auth-feature"><ShieldCheck size={13}/>Privat gehostet · Automatisch mit Notion verbunden</div>
      </section>
      <section aria-labelledby="login-title" className="auth-card reveal"><div className="auth-card-heading"><span className="auth-card-icon"><LockKeyhole size={20}/></span><p className="eyebrow">WILLKOMMEN ZURÜCK</p><h2 id="login-title">Dein Dashboard wartet.</h2><p>Melde dich an und behalte das Wesentliche im Blick.</p></div><LoginForm next={next} error={error} configured={configured}/></section>
    </div>
    <footer className="auth-footer"><span>GIMM Holding / Trading Intelligence</span><span>Dein Trading. Deine Daten. Dein Workspace.</span></footer>
  </main>;
}
