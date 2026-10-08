'use client';

import { useEffect, useState } from 'react';
import { Check, Sunrise, X } from 'lucide-react';

const tasks = ['Review today’s market context', 'Mark key levels & liquidity', 'Choose the setups I will trade', 'Set my risk & daily loss limit', 'Review yesterday’s lesson'];
type Plan = { checked: boolean[]; focus: string; risk: string; lesson: string };
const empty: Plan = { checked: tasks.map(() => false), focus: '', risk: '', lesson: '' };

export function DayPlan({ today, account }: { today: string; account: string }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<Plan>(empty);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const key = `gimm-plan:${account}:${today}`;
  useEffect(() => {
    setReady(false);
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
      setPlan(saved && Array.isArray(saved.checked) && saved.checked.length === tasks.length && saved.checked.every((value: unknown) => typeof value === 'boolean') && ['focus', 'risk', 'lesson'].every(field => typeof saved[field] === 'string') ? saved : empty);
    } catch { setPlan(empty); }
    setReady(true);
  }, [key]);
  const update = (next: Plan) => {
    setPlan(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
  };
  const completed = plan.checked.filter(Boolean).length;
  return <section className={`day-plan ${open ? 'expanded' : ''}`} aria-label="Daily preparation">
    <div className="day-plan-bar"><div><Sunrise size={18}/><div><strong>Start my day</strong><p>{ready ? `${completed} of ${tasks.length} steps completed` : 'Prepare your next session'} · {today}</p></div></div><button type="button" className="button" aria-expanded={open} aria-controls="day-plan-content" onClick={() => setOpen(!open)}>{open ? <><X size={13}/>Close plan</> : <><Sunrise size={13}/>{completed === tasks.length ? 'Review plan' : 'Prepare session'}</>}</button></div>
    {open && <div id="day-plan-content" className="day-plan-content"><div className="prep-checklist">{tasks.map((task, index) => <label key={task}><input type="checkbox" checked={plan.checked[index]} onChange={event => update({ ...plan, checked: plan.checked.map((value, i) => i === index ? event.target.checked : value) })}/><span className="prep-check"><Check size={12}/></span>{task}</label>)}</div><div className="prep-fields"><label>Session focus<textarea aria-label="Session focus" maxLength={2000} value={plan.focus} onChange={event => update({ ...plan, focus: event.target.value })} placeholder="My A+ setup and the conditions I need…"/></label><label>Risk plan<input aria-label="Risk plan" maxLength={300} value={plan.risk} onChange={event => update({ ...plan, risk: event.target.value })} placeholder="Risk per trade / maximum daily loss…"/></label><label>Lesson to apply<textarea aria-label="Lesson to apply" maxLength={2000} value={plan.lesson} onChange={event => update({ ...plan, lesson: event.target.value })} placeholder="One thing I will execute better today…"/></label><p role="status">{storageError ? 'Could not save. Keep this page open to retain your plan.' : 'Saved in this browser · separate plan per day and account'}</p></div></div>}
  </section>;
}
