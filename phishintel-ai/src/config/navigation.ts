export interface NavItem {
  title: string;
  href: string;
  iconName?: string;
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

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
  },
  {
    title: "Email analyzer",
    href: "/analyzer",
  },
  {
    title: "Explainability",
    href: "/explainability",
  },
  {
    title: "Evaluation",
    href: "/analytics",
  },
  {
    title: "Scan history",
    href: "/history",
  },
  {
    title: "Profile",
    href: "/profile",
  },
];

export const PUBLIC_NAV_ITEMS: NavItem[] = [
  { title: "Overview", href: "/dashboard" },
  { title: "Analyzer", href: "/analyzer" },
  { title: "Explainability", href: "/explainability" },
  { title: "Evaluation", href: "/analytics" },
  { title: "Scan History", href: "/history" },
  { title: "Profile", href: "/profile" },
];

export const SIDEBAR_ITEMS = {
  primary: [
    { title: "Overview", href: "/dashboard", iconName: "Home" },
    { title: "Email Analyzer", href: "/analyzer", iconName: "ScanSearch" },
    { title: "Explainability", href: "/explainability", iconName: "Eye" },
    { title: "Evaluation", href: "/analytics", iconName: "ChartNoAxesCombined" },
    { title: "Scan History", href: "/history", iconName: "History" },
    { title: "Profile", href: "/profile", iconName: "User" },
  ],
  research: {
    title: "Evaluation",
    iconName: "FlaskConical",
    items: [
      { title: "Model Evaluation", href: "/analytics", iconName: "ChartNoAxesCombined" },
    ],
  },
  account: {
    title: "Workspace",
    iconName: "User",
    items: [
      { title: "Settings", href: "/settings", iconName: "Settings" },
      { title: "Account Profile", href: "/account", iconName: "User" },
    ],
  },
};
