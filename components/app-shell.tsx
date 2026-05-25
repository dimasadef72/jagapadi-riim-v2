"use client";

import { Menu } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import Sidebar from "./sidebar";
import SplashScreen from "./splash-screen";

const appRoutes = new Set([
  "/",
  "/dashboard",
  "/maps",
  "/overview",
  "/fase-1/ndvi",
  "/fase-2/ndvi",
  "/fase-2/hama",
  "/settings",
]);

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (!appRoutes.has(pathname)) {
    return <main className="relative h-[100dvh] w-[100dvw] overflow-hidden">{children}</main>;
  }

  return (
    <main className="relative w-[100dvw] h-[100dvh] overflow-hidden bg-white flex flex-row">
      <AnimatePresence>{showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}</AnimatePresence>

      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-[9998] md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-[9999] md:hidden shadow-2xl flex"
            >
              <Sidebar
                isOpen={true}
                toggleSidebar={() => setIsMobileSidebarOpen(false)}
                onNavigate={() => setIsMobileSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="hidden md:block h-full flex-shrink-0 z-40 relative">
        <Sidebar
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      <div className="flex-1 relative h-full flex flex-col overflow-hidden">
        <button
          className="md:hidden absolute top-[16px] left-[16px] z-[9000] w-[52px] h-[52px] bg-white rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 stroke-[1.5px]" />
        </button>

        {children}
      </div>
    </main>
  );
}
