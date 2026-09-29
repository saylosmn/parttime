'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import clsx from 'clsx';
import { Briefcase, ChevronLeft, GraduationCap } from 'lucide-react';
import { api } from '@/lib/client';
import { StudentFields, EmployerFields, type StudentValues, type EmployerValues } from './fields';

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const { update } = useSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<'student' | 'employer'>('student');
  const [student, setStudent] = useState<StudentValues>({ name: defaultName, phone: '', school: '', course: 1, district: '', availability: [], bio: '' });
  const [employer, setEmployer] = useState<EmployerValues>({ name: defaultName, phone: '', companyName: '', companyDistrict: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const body = role === 'student' ? { role, ...student } : { role, ...employer };
    const r = await api('/api/onboarding', 'POST', body);
    if (!r.ok) {
      setBusy(false);
      return setErr(r.error);
    }
    await update(); // JWT-д role, onboarded-ыг шинэчилнэ
    window.location.href = role === 'employer' ? '/employer' : '/';
  }

  return (
    <form onSubmit={submit} className="flex min-h-[calc(100dvh-52px)] flex-col">
      <div className="flex items-center gap-4">
        <button type="button" className="icon-btn" onClick={() => setStep(1)} disabled={step === 1} aria-label="Буцах">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-1 gap-2">
          <span className="h-1 flex-1 rounded-full bg-accent" />
          <span className={clsx('h-1 flex-1 rounded-full', step === 2 ? 'bg-accent' : 'bg-line')} />
        </div>
        <span className="text-sm text-muted">{step}/2</span>
      </div>

      {step === 1 ? (
        <>
          <h1 className="h-display mt-8 text-2xl">Та хэн бэ?</h1>
          <p className="mt-2 text-sm text-muted">Бүртгэлийн төрлөө сонгоно уу.</p>
          <div className="mt-6 space-y-3">
            <RoleCard active={role === 'student'} onClick={() => setRole('student')} icon={<GraduationCap size={22} />} title="Оюутан" body="Хичээлийн хажуугаар part-time ажил хайж байна" />
            <RoleCard active={role === 'employer'} onClick={() => setRole('employer')} icon={<Briefcase size={22} />} title="Ажил олгогч" body="Байгууллагадаа part-time ажилтан хайж байна" />
          </div>
          <button type="button" className="btn-primary mt-auto w-full" onClick={() => setStep(2)}>
            Үргэлжлүүлэх
          </button>
        </>
      ) : (
        <>
          <h1 className="h-display mt-8 text-2xl">{role === 'student' ? 'Өөрийнхөө тухай' : 'Байгууллагын мэдээлэл'}</h1>
          <p className="mb-6 mt-2 text-sm text-muted">Энэ мэдээлэл өргөдөл, зар дээр харагдана.</p>
          {role === 'student' ? (
            <StudentFields v={student} set={(p) => setStudent((s) => ({ ...s, ...p }))} />
          ) : (
            <EmployerFields v={employer} set={(p) => setEmployer((s) => ({ ...s, ...p }))} />
          )}
          {err && <p className="mt-4 text-sm text-danger">{err}</p>}
          <button className="btn-primary mt-8 w-full" disabled={busy}>
            {busy ? 'Хадгалж байна…' : 'Дуусгах'}
          </button>
        </>
      )}
    </form>
  );
}

function RoleCard({ active, onClick, icon, title, body }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx('flex w-full items-center gap-4 rounded-card border p-5 text-left transition-colors', active ? 'border-accent bg-green-bg' : 'border-line bg-surface')}
    >
      <span className={clsx('flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border', active ? 'border-green-line text-accent' : 'border-line text-soft')}>{icon}</span>
      <span className="flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted">{body}</span>
      </span>
      <span className={clsx('h-6 w-6 shrink-0 rounded-full border-2', active ? 'border-accent bg-accent ring-4 ring-inset ring-green-bg' : 'border-line')} />
    </button>
  );
}
