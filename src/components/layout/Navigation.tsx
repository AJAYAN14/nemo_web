"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard,
  Library, 
  RotateCcw, 
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useUI } from "@/components/providers/UIProvider";
import styles from "./Navigation.module.css";

const NAV_ITEMS = [
  { label: "首页", icon: LayoutDashboard, href: "/" },
  { label: "进度", icon: BarChart3, href: "/progress" },
  { label: "测试", icon: GraduationCap, href: "/test" },
  { label: "设置", icon: Settings, href: "/settings" },
];

export function Navigation() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useUI();

  // Hide navigation on immersive pages (Learning & Review sessions) or login
  const isImmersive = pathname.startsWith("/learn") || 
                     pathname === "/review" || 
                     pathname === "/login";
  
  // Security check: Never hide on progress sub-pages
  const shouldForceShow = pathname.startsWith("/progress") || pathname.startsWith("/library") || pathname === "/";
  
  if (isImmersive && !shouldForceShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Mobile Bottom Navigation - Unified */}
        <nav className={styles.bottomNav}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={clsx(styles.navItem, isActive && styles.active)}
              >
                <div className={styles.iconWrapper}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div 
                      layoutId="activeDot"
                      className={styles.activeDot}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </div>
                <span className={styles.label}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Sidebar - Unified */}
        <motion.nav 
          className={clsx(styles.sidebar, isSidebarCollapsed && styles.sidebarCollapsed)}
          animate={{ width: isSidebarCollapsed ? 80 : 240 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className={styles.sidebarHeader}>
            <div className={styles.logo}>
              {isSidebarCollapsed ? "N" : "Nemo2"}
            </div>
            <button 
              className={styles.collapseButton}
              onClick={toggleSidebar}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <div className={styles.sidebarItems}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={clsx(styles.sidebarItem, isActive && styles.activeItem)}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div 
                      layoutId="activePill"
                      className={styles.activePill}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </motion.nav>
      </motion.div>
    </AnimatePresence>
  );
}
