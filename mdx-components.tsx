import type { MDXComponents } from "mdx/types"

const components = {
  h1: (props) => <h1 className="mt-10 text-4xl font-semibold tracking-tight text-white" {...props} />,
  h2: (props) => <h2 className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight text-white" {...props} />,
  h3: (props) => <h3 className="mt-7 text-lg font-semibold text-white" {...props} />,
  p: (props) => <p className="mt-5 text-[15px] leading-8 text-slate-400" {...props} />,
  ul: (props) => <ul className="mt-5 list-disc space-y-2 pl-6 text-sm leading-7 text-slate-400" {...props} />,
  ol: (props) => <ol className="mt-5 list-decimal space-y-2 pl-6 text-sm leading-7 text-slate-400" {...props} />,
  blockquote: (props) => <blockquote className="mt-6 border-l-2 border-violet-500 bg-violet-500/[0.06] px-5 py-3 text-slate-300" {...props} />,
  code: (props) => <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[.9em] text-violet-200" {...props} />,
  pre: (props) => <pre className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-black p-4 text-xs leading-6 text-slate-300" {...props} />,
  a: (props) => <a className="font-medium text-violet-300 underline underline-offset-4 hover:text-violet-200" {...props} />,
} satisfies MDXComponents

export function useMDXComponents(): MDXComponents { return components }
