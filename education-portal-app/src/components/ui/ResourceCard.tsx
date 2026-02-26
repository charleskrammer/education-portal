import type { Resource } from "@/lib/training";

export default function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="pill">{resource.category}</span>
        <span className="text-xs font-semibold text-slate-500">{resource.provider}</span>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ink group-hover:text-moss">
          {resource.title}
        </h3>
        <p className="mt-2 text-sm text-slate-600">{resource.description}</p>
      </div>
    </a>
  );
}
