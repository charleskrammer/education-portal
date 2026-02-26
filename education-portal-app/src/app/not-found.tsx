import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section-card mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">
      <h1 className="text-3xl font-heading font-semibold text-ink">Page not found</h1>
      <p className="text-sm text-slate-600">
        This page does not exist or the requested step is unknown.
      </p>
      <Link href="/" className="solid-button">
        Back to home
      </Link>
    </div>
  );
}
