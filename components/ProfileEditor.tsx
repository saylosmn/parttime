'use client';

import { useState } from 'react';
import { ProfileForm } from './forms/ProfileForm';
import type { EmployerValues, StudentValues } from './forms/fields';

type Props = { title: string; children: React.ReactNode } & (
  | { role: 'student'; initial: StudentValues }
  | { role: 'employer'; initial: EmployerValues }
);

/** Профайл харах ба "Засах" горимын хооронд шилжинэ. */
export function ProfileEditor(props: Props) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="h-display text-2xl">{editing ? 'Профайл засах' : props.title}</h1>
        <button className="btn-ghost" onClick={() => setEditing((e) => !e)}>
          {editing ? 'Болих' : 'Засах'}
        </button>
      </div>
      {editing ? (
        props.role === 'student' ? (
          <ProfileForm role="student" initial={props.initial} onDone={() => setEditing(false)} />
        ) : (
          <ProfileForm role="employer" initial={props.initial} onDone={() => setEditing(false)} />
        )
      ) : (
        props.children
      )}
    </div>
  );
}
