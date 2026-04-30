import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

interface ExportButtonProps extends React.ComponentProps<typeof Button> {}

export function ExportButton({ className, ...props }: ExportButtonProps) {
  return (
    <TooltipWrapper label="Export theme" asChild>
      <Button variant="ghost" size="sm" className={cn(className)} {...props}>
        <Download className="size-3.5" />
        <span className="hidden text-sm md:block">Export</span>
      </Button>
    </TooltipWrapper>
  );
}
