export interface NavItem {
  title: string;
  href: string;
  iconName: string;
  badge?: string;
  badgeVariant?: "success" | "warning" | "neutral" | "accent";
  isExternal?: boolean;
}

export interface NavGroup {
  title: string;
  iconName?: string;
  items: NavItem[];
  isAccordion?: boolean;
}

export const SIDEBAR_ITEMS = {
  primary: [
    {
      title: "Scan File",
      href: "/analyzer?mode=upload",
      iconName: "FileUp",
    },
    {
      title: "New Scan",
      href: "/analyzer",
      iconName: "ScanSearch",
      badge: "Model ON",
      badgeVariant: "success" as const,
    },
    {
      title: "Scan History",
      href: "/history",
      iconName: "History",
    },
  ],
  research: {
    title: "Research",
    iconName: "FlaskConical",
    items: [
      {
        title: "Dataset Versions",
        href: "/research/datasets",
        iconName: "Database",
      },
      {
        title: "Model Evaluation",
        href: "/analytics",
        iconName: "ChartNoAxesCombined",
      },
      {
        title: "Architecture",
        href: "/research/architecture",
        iconName: "Network",
      },
    ],
  },
  ourWork: {
    title: "Our Work",
    iconName: "FolderGit2",
    items: [
      {
        title: "Videos",
        href: "#videos",
        iconName: "Youtube",
        isExternal: true,
      },
      {
        title: "Sources",
        href: "/research/sources",
        iconName: "BookOpen",
      },
      {
        title: "GitHub",
        href: "https://github.com",
        iconName: "Github",
        isExternal: true,
      },
      {
        title: "Papers",
        href: "/research/papers",
        iconName: "FileText",
      },
    ],
  },
  footer: [
    {
      title: "Settings",
      href: "/settings",
      iconName: "Settings",
    },
    {
      title: "Account",
      href: "/account",
      iconName: "UserRound",
    },
  ],
};

export const PUBLIC_NAV_ITEMS = [
  { title: "Home", href: "/" },
  { title: "Phishing Scan", href: "/analyzer" },
  { title: "Scan History", href: "/history" },
  { title: "Contact Us", href: "#contact" },
];

