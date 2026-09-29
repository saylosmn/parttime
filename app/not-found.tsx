import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="h-display text-5xl text-accent">404</p>
      <h1 className="text-lg font-bold">Хуудас олдсонгүй</h1>
      <p className="text-sm text-muted">Зар хаагдсан эсвэл устгагдсан байж магадгүй.</p>
      <Link href="/" className="btn-primary">
        Нүүр хуудас
      </Link>
    </main>
  );
}
