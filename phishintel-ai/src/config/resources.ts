/**
 * Resource links configuration for PhishIntel.
 */

// Single configuration value for the GitHub repository
export const REPOSITORY_URL: string =
  process.env.NEXT_PUBLIC_REPOSITORY_URL || "https://github.com/preethamkumar-26/phishing-detector";

// Static asset path for the PAHF-Net architecture diagram
export const ARCHITECTURE_IMAGE_PATH: string = "/phishintel-architecture.png";

// Static asset path for the foundational base research paper
export const BASE_PAPER_PATH: string = "/base-research-paper.pdf";
