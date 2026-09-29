import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Сүлжээгүй' };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-muted">
        <WifiOff size={26} />
      </span>
      <h1 className="h-display text-xl">Интернэт холболтгүй байна</h1>
      <p className="text-sm text-muted">Холболтоо шалгаад дахин оролдоно уу.</p>
      <a href="/" className="btn-primary">
        Дахин ачаалах
      </a>
    </main>
  );
}
