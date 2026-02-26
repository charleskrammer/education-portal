import { notFound } from "next/navigation";

import StepClient from "@/components/training/StepClient";
import { getStepById } from "@/lib/training";

export default function StepPage({ params }: { params: { id: string } }) {
  const step = getStepById(params.id);

  if (!step) {
    notFound();
  }

  return <StepClient step={step} />;
}
