import React from "react";
import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export default function SourcesPage() {
  return (
    <ComingSoonPage
      title="Literature Sources & Bibliography"
      category="Academic Research"
      description="Peer-reviewed literature, public threat repositories, and comparative studies underlying the PhishGuard AI research synthesis."
      plannedFeatures={[
        "Interactive bibliography explorer with DOI and citation lookups",
        "Comparative taxonomy of text-only vs multi-modal phishing filters",
        "Corpus collection methodologies and ethical data sanitation guidelines",
        "Benchmark performance registry comparing 12 leading published architectures",
      ]}
    />
  );
}

