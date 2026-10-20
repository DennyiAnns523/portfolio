import type { Metadata } from 'next';
import Image from 'next/image';
import { PrintButton } from '@/components/journey/PrintButton';
import { about, journey, profile, projects, research, skills, type Project } from '@/content/journey';

export const metadata: Metadata = {
  title: { absolute: `${profile.name} · Résumé & journey` },
  description: `${profile.name}: ${profile.roles.join(' · ')}. Education, research, projects and skills.`,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${profile.name} · Résumé & journey`,
    description: profile.roles.join(' · '),
    images: [profile.photo.src],
    type: 'profile',
  },
};

const NAV = [
  { href: '#about', label: 'About' },
  { href: '#journey', label: 'Journey' },
  { href: '#research', label: 'Research' },
  { href: '#projects', label: 'Projects' },
  { href: '#skills', label: 'Skills' },
  { href: '#contact', label: 'Contact' },
];

const external = (href: string) => /^https?:/.test(href);

function SectionHead({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <header id={id} className="scroll-mt-24">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">{title}</h2>
    </header>
  );
}

function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <li key={t} className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-[11px] text-muted">
          {t}
        </li>
      ))}
    </ul>
  );
}

function Status({ status }: { status: Project['status'] }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status === 'In progress' ? 'bg-orange/15 text-[#a8471f]' : 'bg-moss/15 text-moss'}`}
    >
      {status}
    </span>
  );
}

function ProjectLinks({ links }: { links?: Project['links'] }) {
  if (!links?.length) return null;
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          {...(external(l.href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="font-medium text-plum underline-offset-4 hover:text-orange hover:underline"
        >
          {l.label} ↗
        </a>
      ))}
    </div>
  );
}

export default function JourneyPage() {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-paper text-ink print:bg-white">
      <a href="#about" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-panel focus:p-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur print:static print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="/" className="text-2xl font-bold tracking-tight">
            dennyi<span className="text-orange">.*</span>
          </a>
          <nav aria-label="Sections" className="hidden gap-5 text-sm md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-orange">
                {n.label}
              </a>
            ))}
          </nav>
          <a href="/" className="btn whitespace-nowrap">
            Enter the little world ↗
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.4fr_1fr] md:py-20" aria-label="Introduction">
          <div>
            <p className="eyebrow">Résumé & journey · {profile.location}</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">{profile.name}</h1>
            <p className="mt-4 font-serif text-2xl italic text-plum">{profile.tagline}</p>
            <p className="mt-6 inline-flex flex-wrap items-baseline gap-x-2 rounded-xl border-2 border-ink bg-panel px-4 py-2 text-lg font-semibold uppercase tracking-wide shadow-[3px_4px_0_#302c3c]">
              {profile.headline.role}
              <span className="text-orange">@</span>
              <a href={profile.headline.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-orange hover:underline">
                {profile.headline.org}
              </a>
            </p>
            <ul className="mt-5 grid gap-1.5 text-sm">
              {profile.roles.slice(1).map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <span className="h-px w-5 bg-orange" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-2 print:hidden">
              <a href={profile.links.resume} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Download résumé ↗
              </a>
              <a href={profile.links.github} target="_blank" rel="noopener noreferrer" className="btn">
                GitHub
              </a>
              <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="btn">
                LinkedIn
              </a>
              <a href={`mailto:${profile.links.email}`} className="btn">
                Email
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xs">
            <Image
              src={profile.photo.src}
              width={profile.photo.width}
              height={profile.photo.height}
              alt={profile.photo.alt}
              priority
              sizes="(max-width: 768px) 80vw, 320px"
              className="rounded-[22px] border-2 border-ink shadow-[5px_6px_0_#302c3c]"
            />
          </div>
        </section>

        {/* About */}
        <section className="border-t border-line py-14" aria-label="About">
          <SectionHead id="about" eyebrow="01 / About" title="A little about me" />
          <div className="mt-8 grid gap-10 md:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4 leading-relaxed text-ink/90">
              {about.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
              <div className="pt-4">
                <h3 className="eyebrow">Interests</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {about.interests.map((i) => (
                    <li key={i} className="rounded-full border border-line bg-panel px-3 py-1 text-sm">
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="pt-2 text-sm">
                <span className="eyebrow mr-2">Beyond the desk</span>🏀 {about.extracurricular}
              </p>
            </div>
            <figure className="print:hidden">
              <Image
                src={about.photo.src}
                width={about.photo.width}
                height={about.photo.height}
                alt={about.photo.alt}
                sizes="(max-width: 768px) 100vw, 360px"
                className="max-h-[420px] w-full rounded-2xl object-cover"
              />
              <figcaption className="mt-2 text-xs text-muted">{about.caption}</figcaption>
            </figure>
          </div>
        </section>

        {/* Journey */}
        <section className="border-t border-line py-14" aria-label="Journey">
          <SectionHead id="journey" eyebrow="02 / Journey" title="Education & experience" />
          <ol className="relative mt-10 space-y-8 border-l-2 border-line pl-6 sm:pl-10">
            {journey.map((m) => (
              <li key={`${m.org}-${m.title}`} className="relative break-inside-avoid">
                <span
                  aria-hidden
                  className={`absolute -left-[33px] top-6 h-4 w-4 rounded-full border-2 border-paper sm:-left-[49px] ${m.current ? 'bg-orange ring-4 ring-orange/20' : 'bg-plum'}`}
                />
                <article className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
                  <div className="flex flex-wrap items-start gap-4">
                    {m.logo ? (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-white p-1.5">
                        <Image src={m.logo.src} width={m.logo.width} height={m.logo.height} alt={m.logo.alt} className="max-h-full w-auto object-contain" />
                      </div>
                    ) : (
                      <div aria-hidden className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-ink font-serif text-xl text-paper">
                        {m.org.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                        {m.kind}
                        {m.current && <span className="ml-2 rounded-full bg-orange/15 px-2 py-0.5 normal-case tracking-normal text-[#a8471f]">Current</span>}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold leading-snug">{m.title}</h3>
                      <p className="text-sm">
                        {m.orgUrl ? (
                          <a href={m.orgUrl} target="_blank" rel="noopener noreferrer" className="text-plum underline-offset-4 hover:underline">
                            {m.org}
                          </a>
                        ) : (
                          <span className="text-plum">{m.org}</span>
                        )}
                        <span className="text-muted">
                          {' '}
                          · {m.when}
                          {m.place ? ` · ${m.place}` : ''}
                        </span>
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed">{m.summary}</p>
                  {m.highlights && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {m.highlights.map((h) => (
                        <li key={h} className="flex gap-2">
                          <span aria-hidden className="text-orange">✳</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.topics && (
                    <div className="mt-4">
                      <Tags items={m.topics} />
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ol>
        </section>

        {/* Research */}
        <section className="border-t border-line py-14" aria-label="Research">
          <SectionHead id="research" eyebrow="03 / Research" title="What I’m digging into" />
          <article className="mt-8 grid overflow-hidden rounded-[22px] border-2 border-ink bg-panel shadow-[5px_6px_0_#302c3c] md:grid-cols-2">
            {research.image && (
              <Image
                src={research.image.src}
                width={research.image.width}
                height={research.image.height}
                alt={research.image.alt}
                sizes="(max-width: 768px) 100vw, 480px"
                className="h-full w-full border-b-2 border-ink object-cover object-left-top md:border-b-0 md:border-r-2 print:hidden"
              />
            )}
            <div className="p-6 sm:p-8">
              <Status status={research.status} />
              <h3 className="mt-3 font-serif text-2xl leading-tight">{research.title}</h3>
              <p className="mt-3 text-sm leading-relaxed">{research.summary}</p>
              <div className="mt-5">
                <Tags items={research.tags} />
              </div>
            </div>
          </article>
        </section>

        {/* Projects */}
        <section className="border-t border-line py-14" aria-label="Projects">
          <SectionHead id="projects" eyebrow="04 / Projects" title="Things I’ve built" />
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.title} className="flex break-inside-avoid flex-col overflow-hidden rounded-2xl border border-line bg-panel">
                {p.image ? (
                  <Image
                    src={p.image.src}
                    width={p.image.width}
                    height={p.image.height}
                    alt={p.image.alt}
                    sizes="(max-width: 640px) 100vw, 480px"
                    className="aspect-[16/8] w-full border-b border-line object-cover object-top print:hidden"
                  />
                ) : (
                  <div aria-hidden className="flex aspect-[16/8] items-center justify-center border-b border-line bg-[linear-gradient(135deg,#ece6f5,#f8e6dc)] font-serif text-4xl text-plum/70 print:hidden">
                    {p.title
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-snug">{p.title}</h3>
                    <Status status={p.status} />
                  </div>
                  <p className="text-sm leading-relaxed">{p.summary}</p>
                  <div className="mt-auto space-y-3 pt-2">
                    <Tags items={p.tags} />
                    <ProjectLinks links={p.links} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Skills */}
        <section className="border-t border-line py-14" aria-label="Skills">
          <SectionHead id="skills" eyebrow="05 / Skills" title="Toolbox" />
          <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((s) => (
              <div key={s.group} className="break-inside-avoid">
                <dt className="eyebrow">{s.group}</dt>
                <dd className="mt-2 text-sm leading-relaxed">{s.items.join(' · ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Contact */}
        <section className="border-t border-line py-14" aria-label="Contact">
          <SectionHead id="contact" eyebrow="06 / Contact" title="Let’s talk" />
          <p className="mt-4 max-w-xl leading-relaxed">
            Open to research collaborations, data science and ML roles, and interesting problems. The quickest way to reach me:
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={`mailto:${profile.links.email}`} className="btn btn-primary">
              {profile.links.email}
            </a>
            <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="btn print:hidden">
              LinkedIn ↗
            </a>
            <a href="/#say-hello" className="btn print:hidden">
              Leave a note in the little world ↗
            </a>
            <PrintButton />
          </div>
        </section>
      </main>

      <footer className="border-t border-line print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted sm:px-6">
          <span>
            © {year} {profile.name}
          </span>
          <a href="/" className="hover:text-orange">
            This is the tidy side. The playful side lives in the little world ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
