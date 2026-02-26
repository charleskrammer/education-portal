"use client";

import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-600">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? (
            <Link href={item.href} className="font-semibold text-ink hover:text-moss">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{item.label}</span>
          )}
          {index < items.length - 1 && <span className="text-slate-400">/</span>}
        </div>
      ))}
    </nav>
  );
}
