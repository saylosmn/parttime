import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';

type Step = { done: boolean; title: string; body: string; href?: string; cta?: string };

/** Шинэ ажил олгогчид юунаас эхлэхийг заана. Бүх алхам дуусмагц алга болно. */
export function GettingStarted({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section className="card-green p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Эхлэх алхмууд</h2>
        <span className="text-sm text-green-soft">
          {done}/{steps.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((s) => (
          <li key={s.title} className="flex items-start gap-3">
            {s.done ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-accent" /> : <Circle size={20} className="mt-0.5 shrink-0 text-muted" />}
            <div className="min-w-0 flex-1">
              <p className={s.done ? 'text-muted line-through' : 'font-semibold'}>{s.title}</p>
              {!s.done && <p className="text-sm text-green-soft">{s.body}</p>}
            </div>
            {!s.done && s.href && (
              <Link href={s.href} className="btn-primary shrink-0 px-3 text-xs">
                {s.cta ?? 'Хийх'}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
