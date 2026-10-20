export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <p className="eyebrow">404 / off the edge of the island</p>
      <h1 className="mt-4 font-serif text-5xl tracking-tight">Nothing grows here yet.</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">The page you were looking for doesn&apos;t exist.</p>
      <a href="/" className="btn mt-8 self-start">
        Back to the world ↗
      </a>
    </main>
  );
}
