export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="ba-page-heading mb-8 max-w-3xl"><p className="ba-page-heading__eyebrow text-xs font-semibold uppercase">{eyebrow}</p><h1 className="ba-page-heading__title mt-2 text-3xl font-semibold sm:text-4xl">{title}</h1><p className="ba-page-heading__description mt-3 leading-7">{description}</p></div>;
}
