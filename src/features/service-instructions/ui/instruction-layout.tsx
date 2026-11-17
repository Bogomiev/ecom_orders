import Image from "next/image";
import type { ReactNode } from "react";

// Pass the real size of small screenshots so they are not stretched to the full guide width.
export function Screenshot({ alt, src, width = 1440, height = 900 }: { alt: string; src: string; width?: number; height?: number }) {
  return <figure className="mt-5 overflow-hidden rounded-xl border app-border app-surface-muted" style={width < 1440 ? { maxWidth: width } : undefined}>
    <Image alt={alt} className="h-auto w-full" height={height} src={src} width={width} />
    <figcaption className="border-t app-border px-4 py-2.5 text-xs leading-5 app-muted">{alt}</figcaption>
  </figure>;
}

export function Guide({ children, id, title }: { children: ReactNode; id: string; title: string }) {
  return <section id={id} className="widget-panel scroll-mt-28 overflow-hidden">
    <h3 className="border-b app-border px-5 py-4 text-lg font-black app-text sm:px-6">{title}</h3>
    <div className="space-y-4 px-5 py-5 text-sm leading-6 app-text sm:px-6">{children}</div>
  </section>;
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">{children}</div>;
}
