export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-8 max-w-3xl"><p className="text-xs font-semibold uppercase text-violet-300">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{title}</h1><p className="mt-3 leading-7 text-slate-400">{description}</p></div>;
}

