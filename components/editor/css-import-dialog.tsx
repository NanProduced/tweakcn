import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/revola";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ParseDiagnostic } from "@/utils/parse-css-input";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import React, { useState } from "react";

interface CssImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (css: string) => {
    success: boolean;
    diagnostics: ParseDiagnostic[];
    successCount: number;
    failureCount: number;
  };
}

const CssImportDialog: React.FC<CssImportDialogProps> = ({ open, onOpenChange, onImport }) => {
  const [cssText, setCssText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    diagnostics: ParseDiagnostic[];
    successCount: number;
    failureCount: number;
  } | null>(null);

  const getSeverityIcon = (severity: ParseDiagnostic["severity"]) => {
    switch (severity) {
      case "error":
        return <XCircle className="mr-2 size-4 text-destructive" />;
      case "warning":
        return <AlertCircle className="mr-2 size-4 text-amber-500" />;
      case "info":
        return <Info className="mr-2 size-4 text-blue-500" />;
    }
  };

  const getSeverityLabel = (severity: ParseDiagnostic["severity"]) => {
    switch (severity) {
      case "error":
        return "Error";
      case "warning":
        return "Warning";
      case "info":
        return "Info";
    }
  };

  const handleImport = () => {
    setImportResult(null);

    if (!cssText.trim()) {
      setError("Please enter CSS content");
      return;
    }

    try {
      const result = onImport(cssText);
      setImportResult(result);

      const hasWarningsOrErrors = result.diagnostics.some(
        (d) => d.severity === "warning" || d.severity === "error"
      );

      if (result.success && !hasWarningsOrErrors) {
        setCssText("");
        setError(null);
        setTimeout(() => {
          onOpenChange(false);
          setImportResult(null);
        }, 1500);
      }
    } catch {
      setError("Failed to parse CSS. Please check your syntax.");
    }
  };

  const handleClose = () => {
    setCssText("");
    setError(null);
    setImportResult(null);
    onOpenChange(false);
  };

  const renderDiagnostics = () => {
    if (!importResult) return null;

    const { diagnostics, successCount, failureCount } = importResult;
    const errors = diagnostics.filter((d) => d.severity === "error");
    const warnings = diagnostics.filter((d) => d.severity === "warning");
    const infos = diagnostics.filter((d) => d.severity === "info");
    const hasAnyDiagnostics = diagnostics.length > 0;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle className="size-4 text-green-500" />
              <span className="text-green-600">{successCount} parsed</span>
            </span>
            {errors.length > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="size-4 text-destructive" />
                <span className="text-destructive">{errors.length} errors</span>
              </span>
            )}
            {warnings.length > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle className="size-4 text-amber-500" />
                <span className="text-amber-600">{warnings.length} warnings</span>
              </span>
            )}
            {infos.length > 0 && (
              <span className="flex items-center gap-1">
                <Info className="size-4 text-blue-500" />
                <span className="text-blue-600">{infos.length} info</span>
              </span>
            )}
          </div>
        </div>

        {hasAnyDiagnostics && (
          <div className="max-h-56 space-y-2 overflow-y-auto text-xs">
            {[...errors, ...warnings, ...infos].slice(0, 15).map((d, i) => (
              <div key={i} className="flex items-start gap-2 rounded border bg-card/50 p-2">
                {getSeverityIcon(d.severity)}
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium ${d.severity === "error" ? "text-destructive" : d.severity === "warning" ? "text-amber-600" : "text-blue-600"}`}>
                      {getSeverityLabel(d.severity)}
                    </span>
                    {d.line && <span className="text-muted-foreground">Line {d.line}</span>}
                    {d.variableName && <span className="text-muted-foreground">--{d.variableName}</span>}
                  </div>
                  <p className="text-muted-foreground">{d.message}</p>
                  {d.rawValue && (
                    <p className="font-mono text-muted-foreground/80">
                      Value: <code className="bg-muted px-1">{d.rawValue}</code>
                    </p>
                  )}
                </div>
              </div>
            ))}
            {[...errors, ...warnings, ...infos].length > 15 && (
              <p className="text-center text-muted-foreground">
                ... and {[...errors, ...warnings, ...infos].length - 15} more
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90dvh] flex-col overflow-hidden shadow-lg sm:max-h-[min(700px,85dvh)] sm:max-w-[600px] sm:pt-6">
        <ScrollArea className="flex h-full flex-col [&>[data-slot=scroll-area-viewport]]:pb-2 [&>[data-slot=scroll-area-viewport]>div]:space-y-6">
          <ResponsiveDialogHeader className="px-6">
            <ResponsiveDialogTitle>Import Custom CSS</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Paste your CSS file below to customize the theme colors. Supports shadcn/ui and
              Tailwind CSS theme formats including <code className="bg-muted px-1">:root</code>,
              <code className="bg-muted px-1">.dark</code>, and
              <code className="bg-muted px-1">@layer base</code> wrappers.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 px-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="mr-2 size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {importResult && renderDiagnostics()}

            <Textarea
              placeholder={`:root {
  --background: 0 0% 100%;
  --foreground: oklch(0.52 0.13 144.17);
  --primary: #3e2723;
  --radius: 0.5rem;
  /* And more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: hsl(37.50 36.36% 95.69%);
  --primary: rgb(46, 125, 50);
  /* And more variables */
}

/* @layer base format is also supported:
@layer base {
  :root { ... }
  .dark { ... }
}
*/
            `}
              className="text-foreground min-h-[300px] max-h-[400px] field-sizing-fixed overflow-y-auto resize-none font-mono text-sm"
              value={cssText}
              onChange={(e) => {
                setCssText(e.target.value);
                if (error) setError(null);
                if (importResult) setImportResult(null);
              }}
            />
          </div>
        </ScrollArea>

        <ResponsiveDialogFooter className="bg-muted/30 mt-4 border-t px-6 py-4 sm:mt-0">
          <Button variant="ghost" onClick={handleClose} size="sm" className="max-sm:w-full">
            Cancel
          </Button>
          <Button onClick={handleImport} size="sm" className="max-sm:w-full">
            Import
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default CssImportDialog;
