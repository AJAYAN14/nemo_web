"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useUI } from "@/components/providers/UIProvider";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSidebarCollapsed } = useUI();
  
  // Activate global shortcuts (Esc, Space, etc.)
  useGlobalShortcuts();
  
  // Immersive routes where navigation is hidden and padding should be removed
  const isImmersive = (pathname.startsWith("/learn") || 
                       pathname === "/review" || 
                       pathname === "/login") && 
                      !(pathname.startsWith("/progress") || pathname.startsWith("/library") || pathname === "/");

  const sidebarWidth = isSidebarCollapsed ? 80 : 240;

  return (
    <main style={{ 
      // Desktop: Shift content if sidebar is showing
      transition: "padding 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      paddingLeft: !isImmersive ? `${sidebarWidth}px` : "0px",
      
      // Mobile: Add space at bottom if bottom nav is showing
      paddingBottom: !isImmersive ? "80px" : "0px"
    }}>
      {children}
      
      {/* Global CSS for responsiveness injected here to react to isImmersive and collapse state */}
      <style jsx global>{`
        @media (min-width: 641px) {
          main { 
            padding-left: ${!isImmersive ? sidebarWidth + 'px' : '0'} !important;
            padding-bottom: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
