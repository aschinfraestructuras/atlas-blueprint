import React, { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto bg-secondary/30">
          {children}
        </main>
      </div>
    </div>
  );
}
