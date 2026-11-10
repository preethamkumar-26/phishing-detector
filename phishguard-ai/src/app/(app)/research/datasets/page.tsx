import React from "react";
import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export default function DatasetsPage() {
  return (
    <ComingSoonPage
      title="Dataset Versions & Curation"
      category="Research Laboratory"
      description="Comparative tracking of phishing and legitimate email benchmark corpora across Kaggle, Enron, Nazario, LingSpam, and synthetic adversarial sets."
      plannedFeatures={[
        "Dataset version registry with cryptographic hash verification",
        "Corpus class distribution and stratified train/val/test split inspector",
        "Deduplication and header/body text normalization tooling",
        "Cross-dataset evaluation matrix (training on Dataset A, evaluating on Dataset B)",
      ]}
    />
  );
}

