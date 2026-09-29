'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { disablePush } from './Pwa';

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      className={compact ? 'btn-ghost px-3 text-danger' : 'btn-ghost w-full text-danger'}
      onClick={async () => {
        // Хуваалцсан төхөөрөмж дээр өөр хүний мэдэгдэл ирэхээс сэргийлнэ
        await disablePush().catch(() => {});
        await signOut({ callbackUrl: '/' });
      }}
    >
      {compact && <LogOut size={16} />}
      Гарах
    </button>
  );
}
