"use client";

import React from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/revola";
import ThemeComparator from "./theme-comparator";

interface ThemeComparatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThemeComparatorDialog({
  open,
  onOpenChange,
}: ThemeComparatorDialogProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="sm:max-w-4xl h-[90vh] sm:h-[85vh] p-0 flex flex-col"
        showCloseButton={false}
      >
        <ThemeComparator onClose={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
