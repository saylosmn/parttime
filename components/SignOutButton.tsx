'use client';

import { signOut } from 'next-auth/react';
import { disablePush } from './Pwa';

export function SignOutButton() {
  return (
    <button
      className="btn-ghost w-full text-danger"
      onClick={async () => {
        // Хуваалцсан төхөөрөмж дээр өөр хүний мэдэгдэл ирэхээс сэргийлнэ
        await disablePush().catch(() => {});
        await signOut({ callbackUrl: '/' });
      }}
    >
      Гарах
    </button>
  );
}
