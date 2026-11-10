"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEMS } from "@/config/navigation";
import {
  FileUp,
  ScanSearch,
  History,
  FlaskConical,
  Database,
  ChartNoAxesCombined,
  Network,
  FolderGit2,
  BookOpen,
  FileText,
  Settings,
  UserRound,
  ChevronDown,
  Shield,
  ExternalLink,
} from "lucide-react";
import { GithubIcon, YoutubeIcon } from "@/components/ui/BrandIcons";

interface SidebarProps {
  collapsed: boolean;
  onCloseMobile?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  FileUp,
  ScanSearch,
  History,
  FlaskConical,
  Database,
  ChartNoAxesCombined,
  Network,
  FolderGit2,
  Youtube: YoutubeIcon,
  BookOpen,
  Github: GithubIcon,
  FileText,
  Settings,
  UserRound,
};

export function Sidebar({ collapsed, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [researchOpen, setResearchOpen] = useState(true);
  const [ourWorkOpen, setOurWorkOpen] = useState(true);

  const renderIcon = (name: string, className?: string) => {
    const IconComponent = ICON_MAP[name] || Shield;
    return <IconComponent className={cn("w-4 h-4 shrink-0", className)} />;
  };

  const isActive = (href: string) => {
    if (href === "/analyzer" && pathname === "/analyzer") return true;
    if (href !== "/" && href !== "/analyzer" && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-[#101729] border-r border-[#273449] transition-all duration-300 ease-in-out select-none z-30",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center border-b border-[#273449] shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 overflow-hidden group"
          onClick={onCloseMobile}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] flex items-center justify-center shadow-lg shadow-violet-900/30 shrink-0 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-[#F3F4F6] flex items-center gap-1.5">
                PhishGuard <span className="text-[#8B5CF6]">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF] font-medium">
                Research Prototype
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Primary Scan Actions */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]/70">
              Analysis Core
            </div>
          )}
          {SIDEBAR_ITEMS.primary.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                  active
                    ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 shadow-sm"
                    : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#151E31]"
                )}
              >
                {renderIcon(item.iconName, active ? "text-[#8B5CF6]" : "text-[#9CA3AF] group-hover:text-white")}
                
                {!collapsed && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}

                {!collapsed && item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {item.badge}
                  </span>
                )}

                {collapsed && item.badge && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Research Group */}
        <div className="space-y-1">
          {!collapsed ? (
            <button
              onClick={() => setResearchOpen(!researchOpen)}
              className="w-full px-3 py-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]/70 hover:text-[#F3F4F6] transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5 text-[#8B5CF6]" />
                {SIDEBAR_ITEMS.research.title}
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  researchOpen ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>
          ) : (
            <div className="w-full flex justify-center py-1">
              <span className="w-4 h-0.5 bg-[#273449] rounded-full" />
            </div>
          )}

          {(researchOpen || collapsed) && (
            <div className="space-y-1">
              {SIDEBAR_ITEMS.research.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                      active
                        ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 shadow-sm"
                        : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#151E31]"
                    )}
                  >
                    {renderIcon(item.iconName, active ? "text-[#8B5CF6]" : "text-[#9CA3AF] group-hover:text-white")}
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Our Work Accordion Group */}
        <div className="space-y-1">
          {!collapsed ? (
            <button
              onClick={() => setOurWorkOpen(!ourWorkOpen)}
              className="w-full px-3 py-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]/70 hover:text-[#F3F4F6] transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                {SIDEBAR_ITEMS.ourWork.title}
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  ourWorkOpen ? "rotate-0" : "-rotate-90"
                )}
              />
            </button>
          ) : (
            <div className="w-full flex justify-center py-1">
              <span className="w-4 h-0.5 bg-[#273449] rounded-full" />
            </div>
          )}

          {(ourWorkOpen || collapsed) && (
            <div className="space-y-1">
              {SIDEBAR_ITEMS.ourWork.items.map((item) => {
                const active = isActive(item.href);
                const isExternal = item.isExternal;
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={onCloseMobile}
                    target={isExternal && item.href.startsWith("http") ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                      active
                        ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30 shadow-sm"
                        : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#151E31]"
                    )}
                  >
                    {renderIcon(item.iconName, active ? "text-[#8B5CF6]" : "text-[#9CA3AF] group-hover:text-white")}
                    {!collapsed && (
                      <span className="flex-1 truncate flex items-center justify-between">
                        {item.title}
                        {isExternal && (
                          <ExternalLink className="w-3 h-3 text-[#9CA3AF]/50 group-hover:text-[#9CA3AF]" />
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-3 border-t border-[#273449] space-y-1 bg-[#090D18]/40 shrink-0">
        {SIDEBAR_ITEMS.footer.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group",
                active
                  ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30"
                  : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#151E31]"
              )}
            >
              {renderIcon(item.iconName, active ? "text-[#8B5CF6]" : "text-[#9CA3AF] group-hover:text-white")}
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

