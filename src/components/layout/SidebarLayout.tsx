'use client';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils/cn';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full w-full">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        collapsed ? "md:ml-[60px]" : "md:ml-[200px]"
      )}>
        {children}
      </div>
    </div>
  );
}
