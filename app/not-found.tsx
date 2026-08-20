import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found section">
      <p className="eyebrow">404</p>
      <h1>Такого фасада не нашлось.</h1>
      <Link className="btn primary" href="/catalog">Вернуться в каталог</Link>
    </main>
  );
}
