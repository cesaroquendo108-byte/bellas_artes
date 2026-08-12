"use client";

import type { ReactNode } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileBottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="workspace-theme max-h-[82dvh] overflow-y-auto rounded-t-[28px] border-[#ded4c6] bg-[#fffdf8] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 text-[#241f2e] md:hidden"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#d8cfca]" aria-hidden="true" />
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg text-[#241f2e]">{title}</SheetTitle>
          <SheetDescription className="text-sm text-[#756d7c]">{description}</SheetDescription>
        </SheetHeader>
        <div className="mt-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
