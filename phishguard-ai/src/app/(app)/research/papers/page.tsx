import React from "react";
import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export default function PapersPage() {
  return (
    <ComingSoonPage
      title="Research Papers & Publications"
      category="Academic Research"
      description="Preprints, technical reports, and experimental summaries detailing the development, baseline benchmarking, and validation of the PhishGuard AI neural framework."
      plannedFeatures={[
        "Synthesis Report: Comparative evaluation of baseline BERT-CNN-GRU vs. the final 5-branch feature fusion architecture",
        "Preprint: Cross-dataset generalization failures in monolithic transformer filters",
        "Technical Brief: Interpretability faithfulness in multi-modal feature attribution and rule-based explanations",
        "Open-access PDF downloads and LaTeX replication packages",
      ]}
    />
  );
}

