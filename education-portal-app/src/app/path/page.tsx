import Breadcrumbs from "@/components/layout/Breadcrumbs";
import StepCard from "@/components/training/StepCard";
import { training } from "@/lib/training";

export default function PathPage() {
  return (
    <div className="flex flex-col gap-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Learning path" }]} />

      <section className="section-card p-6">
        <h1 className="text-3xl font-heading font-semibold text-ink">Full learning path</h1>
        <p className="mt-3 text-sm text-slate-600">
          Select a step to access topics, videos, objectives, and practice checklists.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {training.steps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </section>
    </div>
  );
}
