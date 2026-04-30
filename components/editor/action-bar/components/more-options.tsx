import McpIcon from "@/assets/mcp.svg";
import ContrastChecker from "@/components/editor/contrast-checker";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialogActions } from "@/hooks/use-dialog-actions";
import { useEditorStore } from "@/store/editor-store";
import { GitCompare, MoreVertical } from "lucide-react";
import { useState } from "react";
import { MCPDialog } from "./mcp-dialog";

interface MoreOptionsProps extends React.ComponentProps<typeof DropdownMenuTrigger> {}

export function MoreOptions({ ...props }: MoreOptionsProps) {
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const { themeState } = useEditorStore();
  const { themeComparatorOpen, setThemeComparatorOpen } = useDialogActions();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild {...props}>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="text-foreground">
          <DropdownMenuItem
            onClick={() => {
              setThemeComparatorOpen(true);
            }}
            className="gap-2 cursor-pointer"
          >
            <GitCompare className="h-4 w-4" />
            <span className="text-sm">Compare Themes</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setMcpDialogOpen(true);
            }}
            className="gap-2 cursor-pointer"
          >
            <McpIcon className="h-4 w-4" />
            <span className="text-sm">MCP</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
            <ContrastChecker currentStyles={themeState.styles[themeState.currentMode]} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MCPDialog open={mcpDialogOpen} onOpenChange={setMcpDialogOpen} />
    </>
  );
}
