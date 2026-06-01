export function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <section className="mb-8 border-b border-line pb-8">
      <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted">{eyebrow}</p>
      <h1 className="text-4xl font-normal leading-tight tracking-tight md:text-5xl">{title}</h1>
      {description ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">{description}</p> : null}
    </section>
  );
}
