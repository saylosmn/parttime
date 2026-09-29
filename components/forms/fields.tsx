'use client';

import clsx from 'clsx';
import { AVAILABILITY, DISTRICTS, type Availability } from '@/lib/config';

export type StudentValues = {
  name: string;
  phone: string;
  school: string;
  course: number;
  district: string;
  availability: Availability[];
  bio: string;
};
export type EmployerValues = { name: string; phone: string; companyName: string; companyDistrict: string };

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function PhoneInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      <span className="input flex w-20 shrink-0 items-center justify-center text-muted">+976</span>
      <input
        className="input"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="9911 2233"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, '').slice(0, 9))}
        required
      />
    </div>
  );
}

export function DistrictSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="" disabled>
        Сонгох
      </option>
      {DISTRICTS.map((d) => (
        <option key={d}>{d}</option>
      ))}
    </select>
  );
}

export function StudentFields({ v, set }: { v: StudentValues; set: (p: Partial<StudentValues>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Нэр">
        <input className="input" value={v.name} onChange={(e) => set({ name: e.target.value })} required maxLength={60} />
      </Field>
      <Field label="Сургууль">
        <input className="input" value={v.school} onChange={(e) => set({ school: e.target.value })} placeholder="Жишээ нь: ШУТИС" required maxLength={80} />
      </Field>
      <div>
        <span className="label">Курс</span>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((c) => (
            <button type="button" key={c} onClick={() => set({ course: c })} className={clsx('chip justify-center', v.course === c && 'chip-active')} aria-pressed={v.course === c}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <Field label="Амьдардаг дүүрэг">
        <DistrictSelect value={v.district} onChange={(district) => set({ district })} />
      </Field>
      <div>
        <span className="label">Чөлөөт цаг</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(AVAILABILITY) as Availability[]).map((a) => {
            const on = v.availability.includes(a);
            return (
              <button
                type="button"
                key={a}
                aria-pressed={on}
                className={clsx('chip', on && 'chip-active')}
                onClick={() => set({ availability: on ? v.availability.filter((x) => x !== a) : [...v.availability, a] })}
              >
                {AVAILABILITY[a]}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Утас" hint="Ажил олгогч таныг урьсны дараа л харагдана">
        <PhoneInput value={v.phone} onChange={(phone) => set({ phone })} />
      </Field>
      <Field label="Товч танилцуулга (заавал биш)">
        <textarea className="input py-3" rows={3} maxLength={300} value={v.bio} onChange={(e) => set({ bio: e.target.value })} />
      </Field>
    </div>
  );
}

export function EmployerFields({ v, set }: { v: EmployerValues; set: (p: Partial<EmployerValues>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Байгууллагын нэр">
        <input className="input" value={v.companyName} onChange={(e) => set({ companyName: e.target.value })} placeholder="Жишээ нь: Талх & Кофе" required maxLength={80} />
      </Field>
      <Field label="Хариуцсан хүний нэр">
        <input className="input" value={v.name} onChange={(e) => set({ name: e.target.value })} required maxLength={60} />
      </Field>
      <Field label="Байршил (дүүрэг)">
        <DistrictSelect value={v.companyDistrict} onChange={(companyDistrict) => set({ companyDistrict })} />
      </Field>
      <Field label="Утас">
        <PhoneInput value={v.phone} onChange={(phone) => set({ phone })} />
      </Field>
    </div>
  );
}
