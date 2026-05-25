"use client";

import {
  Activity,
  Bug,
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Map,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Sprout,
  TreePine,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { MenuRoute } from "./types";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  onNavigate?: () => void;
}

type MenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: MenuRoute;
  subMenus?: { href: MenuRoute; label: string; icon: LucideIcon }[];
};

const menus: MenuItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    href: "/overview",
  },
  { id: "maps", label: "Maps", icon: Map, href: "/maps" },
  {
    id: "fase1",
    label: "Fase 1: Pengambilan Data",
    icon: Sprout,
    subMenus: [
      { href: "/fase-1/ndvi", label: "Data Sampling NDVI", icon: Activity },
    ],
  },
  {
    id: "fase2",
    label: "Fase 2: Analytics",
    icon: TreePine,
    subMenus: [
      { href: "/fase-2/ndvi", label: "Data Final", icon: FileText },
      { href: "/fase-2/hama", label: "Hama Penyakit", icon: Bug },
    ],
  },
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
  isOpen,
  toggleSidebar,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    "fase1",
    "fase2",
  ]);

  const closeOnNavigate = () => {
    onNavigate?.();
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isOpen ? 280 : 64 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full z-[1000] bg-white overflow-hidden flex-shrink-0 border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] whitespace-nowrap"
    >
      <div className="flex flex-col h-full">
        <div
          className={`flex items-center h-[88px] flex-shrink-0 ${
            isOpen ? "px-6 justify-between" : "px-0 justify-center"
          }`}
        >
          <Link
            href="/maps"
            onClick={closeOnNavigate}
            className={`flex items-center gap-3 overflow-hidden ${!isOpen ? "hidden" : "block"}`}
          >
            <div className="relative w-9 h-9 rounded-[10px] bg-gradient-to-tr from-green-950 to-emerald-900 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(251,191,36,0.15)] border border-amber-500/30">
              <Wheat
                className="w-5 h-5 text-amber-400 drop-shadow-[0_0_2px_rgba(251,191,36,0.4)]"
                strokeWidth={1.5}
              />
            </div>
            <div className="flex flex-col flex-shrink-0">
              <h1 className="text-[17px] font-bold text-slate-900 leading-[1.1] tracking-tight font-sans">
                JAGA{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-700">
                  PADI
                </span>
              </h1>
            </div>
          </Link>

          <button
            onClick={toggleSidebar}
            className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-800 transition-colors"
            aria-label="Toggle Sidebar"
          >
            {isOpen ? (
              <PanelLeftClose className="w-5 h-5 stroke-[1.5px]" />
            ) : (
              <PanelLeft className="w-5 h-5 stroke-[1.5px]" />
            )}
          </button>
        </div>

        <nav
          className={`flex-1 py-2 space-y-1.5 overflow-y-auto overflow-x-hidden ${isOpen ? "px-4" : "px-2"}`}
        >
          {menus.map((menu) => {
            const Icon = menu.icon;
            const hasSubMenus = !!menu.subMenus;
            const isExpanded = expandedMenus.includes(menu.id);
            const isCurrentSubActive =
              hasSubMenus &&
              menu.subMenus!.some((sub) => isRouteActive(pathname, sub.href));
            const isActive = !!menu.href && isRouteActive(pathname, menu.href);

            const itemClassName = `w-full flex items-center justify-between rounded-xl transition-all ${
              isActive
                ? "bg-emerald-50 text-[#4B7C63]"
                : isCurrentSubActive
                  ? "text-[#4B7C63]"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            } ${isOpen ? "px-4 py-3.5" : "justify-center py-3.5 px-0"}`;

            return (
              <div key={menu.id} className="w-full flex items-start flex-col">
                {menu.href ? (
                  <Link
                    href={menu.href as any}
                    onClick={closeOnNavigate}
                    title={!isOpen ? menu.label : undefined}
                    className={itemClassName}
                  >
                    <div
                      className={`flex items-center ${isOpen ? "gap-3" : "gap-0"}`}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-all ${isActive ? "stroke-[2.5px] text-[#4B7C63]" : "stroke-[2px]"}`}
                      />
                      {isOpen && (
                        <span
                          className={`text-[14px] ${isActive ? "font-semibold" : "font-medium"}`}
                        >
                          {menu.label}
                        </span>
                      )}
                    </div>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      if (!isOpen) toggleSidebar();
                      setExpandedMenus((prev) =>
                        prev.includes(menu.id)
                          ? prev.filter((id) => id !== menu.id)
                          : [...prev, menu.id],
                      );
                    }}
                    title={!isOpen ? menu.label : undefined}
                    className={itemClassName}
                  >
                    <div
                      className={`flex items-center ${isOpen ? "gap-3" : "gap-0"}`}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-all ${
                          isCurrentSubActive
                            ? "stroke-[2.5px] text-[#4B7C63]"
                            : "stroke-[2px]"
                        }`}
                      />
                      {isOpen && (
                        <span
                          className={`text-[14px] ${isCurrentSubActive ? "font-semibold" : "font-medium"}`}
                        >
                          {menu.label}
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <div className="text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </button>
                )}

                <AnimatePresence initial={false}>
                  {hasSubMenus && isExpanded && isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-full overflow-hidden flex flex-col pl-4 mt-1 space-y-1"
                    >
                      {menu.subMenus!.map((subMenu) => {
                        const SubIcon = subMenu.icon;
                        const isSubActive = isRouteActive(
                          pathname,
                          subMenu.href,
                        );

                        return (
                          <Link
                            key={subMenu.href}
                            href={subMenu.href as any}
                            onClick={closeOnNavigate}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                              isSubActive
                                ? "bg-emerald-50/50 text-[#4B7C63] font-semibold"
                                : "text-gray-500 hover:bg-emerald-50/30 hover:text-gray-900 font-medium"
                            }`}
                          >
                            <SubIcon
                              className={`w-4 h-4 flex-shrink-0 ${isSubActive ? "text-[#4B7C63]" : "text-gray-400"}`}
                            />
                            <span className="text-[13px]">{subMenu.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div
          className={`border-t border-gray-100 flex-shrink-0 ${isOpen ? "p-4" : "p-2"}`}
        >
          <Link
            href="/settings"
            onClick={closeOnNavigate}
            title={!isOpen ? "Settings" : undefined}
            className={`w-full flex items-center rounded-xl transition-all ${
              isRouteActive(pathname, "/settings")
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            } ${isOpen ? "px-4 py-3.5 gap-3" : "justify-center py-3.5 px-0"}`}
          >
            <Settings
              className={`w-5 h-5 flex-shrink-0 transition-all ${
                isRouteActive(pathname, "/settings")
                  ? "stroke-[2.5px] text-gray-900"
                  : "stroke-[2px]"
              }`}
            />
            {isOpen && (
              <span
                className={`text-[14px] ${isRouteActive(pathname, "/settings") ? "font-semibold" : "font-medium"}`}
              >
                Pengaturan
              </span>
            )}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
