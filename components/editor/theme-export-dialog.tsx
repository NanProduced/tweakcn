"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/revola";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsIndicator } from "@/components/ui/base-ui-tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CodeBlock, CodeBlockCopyButton } from "@/components/ai-elements/code-block";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  generateExport,
  generateLayoutCode,
  type ExportFormat,
  type ExportResult,
  EXPORT_FORMATS,
} from "@/utils/registry/theme-export";
import { ThemeStyles } from "@/types/theme";
import { ColorFormat } from "@/types";
import { usePreferencesStore } from "@/store/preferences-store";
import { Download, Copy, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themeStyles: ThemeStyles;
  themeName?: string;
}

const LAYOUT_TAB_VALUE = "layout.tsx";

export function ThemeExportDialog({
  open,
  onOpenChange,
  themeStyles,
  themeName = "my-theme",
}: ThemeExportDialogProps) {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("css-variables");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const colorFormat = usePreferencesStore((state) => state.colorFormat);
  const tailwindVersion = usePreferencesStore((state) => state.tailwindVersion);
  const setColorFormat = usePreferencesStore((state) => state.setColorFormat);
  const setTailwindVersion = usePreferencesStore((state) => state.setTailwindVersion);
  const getAvailableColorFormats = usePreferencesStore((state) => state.getAvailableColorFormats);

  const [activeSubTab, setActiveSubTab] = useState("main");

  const exportResult = useMemo<ExportResult | null>(() => {
    try {
      setError(null);
      return generateExport(activeFormat, themeStyles, {
        themeName,
        colorFormat,
        tailwindVersion,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate export";
      setError(errorMessage);
      console.error("Export generation error:", err);
      return null;
    }
  }, [activeFormat, themeStyles, themeName, colorFormat, tailwindVersion]);

  const layoutCode = useMemo(() => {
    try {
      return generateLayoutCode(themeStyles);
    } catch (err) {
      console.error("Layout code generation error:", err);
      return "// Error generating layout code";
    }
  }, [themeStyles]);

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "The export content has been copied to your clipboard.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to copy";
        setError(errorMessage);
        toast({
          title: "Copy failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleDownload = useCallback(
    (content: string, fileName: string) => {
      try {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Download started",
          description: `${fileName} is being downloaded.`,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to download";
        setError(errorMessage);
        toast({
          title: "Download failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const displayContent = activeSubTab === "layout" && activeFormat === "css-variables" 
    ? layoutCode 
    : exportResult?.content || "";
  
  const displayLanguage = activeSubTab === "layout" && activeFormat === "css-variables"
    ? "tsx"
    : exportResult?.language || "text";

  const displayFileName = activeSubTab === "layout" && activeFormat === "css-variables"
    ? "layout.tsx"
    : exportResult?.fileName || "export.txt";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="h-[90dvh] max-h-[90dvh] overflow-hidden shadow-lg sm:h-[80dvh] sm:max-h-[min(800px,90dvh)] sm:w-[calc(100%-2rem)] sm:max-w-5xl">
        <div className="h-full flex flex-col space-y-4 overflow-auto px-6 pb-6 pt-6 sm:py-6">
          <ResponsiveDialogHeader className="flex-none">
            <ResponsiveDialogTitle className="text-xl">Export Theme</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Export your theme in various formats for different use cases.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="size-4" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          )}

          <div className="flex-none flex items-center gap-2">
            <Select
              value={tailwindVersion}
              onValueChange={(value: "3" | "4") => {
                setTailwindVersion(value);
                if (value === "4" && colorFormat === "hsl") {
                  setColorFormat("oklch");
                }
              }}
            >
              <SelectTrigger className="bg-muted/50 w-fit gap-1 border-none outline-hidden focus:border-none focus:ring-transparent">
                <SelectValue className="focus:ring-transparent" />
              </SelectTrigger>
              <SelectContent className="z-99999">
                <SelectItem value="3">Tailwind v3</SelectItem>
                <SelectItem value="4">Tailwind v4</SelectItem>
              </SelectContent>
            </Select>

            <Select value={colorFormat} onValueChange={(value: ColorFormat) => setColorFormat(value)}>
              <SelectTrigger className="bg-muted/50 w-fit gap-1 border-none outline-hidden focus:border-none focus:ring-transparent">
                <SelectValue className="focus:ring-transparent" />
              </SelectTrigger>
              <SelectContent className="z-99999">
                {getAvailableColorFormats().map((format) => (
                  <SelectItem key={format} value={format}>
                    {format}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-none">
            <Tabs value={activeFormat} onValueChange={(v) => {
              setActiveFormat(v as ExportFormat);
              setActiveSubTab("main");
            }} className="w-full">
              <TabsList className="w-full h-auto flex-wrap bg-transparent p-0 gap-1">
                {EXPORT_FORMATS.map((format) => (
                  <TabsTrigger
                    key={format.value}
                    value={format.value}
                    className={cn(
                      "h-auto px-4 py-2 text-sm font-medium",
                      "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                      "rounded-md"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span>{format.label}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {format.description}
                      </span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden rounded-lg border">
            {activeFormat === "css-variables" ? (
              <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="h-full flex flex-col">
                <div className="bg-muted/50 flex flex-none items-center justify-between border-b px-4 py-2">
                  <TabsList className="h-8 bg-transparent p-0">
                    <TabsTrigger value="main" className="h-7 px-3 text-sm font-medium">
                      {exportResult?.fileName || "globals.css"}
                    </TabsTrigger>
                    <TabsTrigger value="layout" className="h-7 px-3 text-sm font-medium">
                      layout.tsx (Next.js)
                    </TabsTrigger>
                    <TabsIndicator className="bg-background rounded-sm" />
                  </TabsList>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(displayContent, displayFileName)}
                      className="h-8"
                      aria-label="Download"
                    >
                      <Download className="size-4" />
                      <span className="sr-only md:not-sr-only ml-1">Download</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(displayContent)}
                      className="h-8"
                      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
                    >
                      {copied ? (
                        <>
                          <Check className="size-4" />
                          <span className="sr-only md:not-sr-only ml-1">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" />
                          <span className="sr-only md:not-sr-only ml-1">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <TabsContent value="main" className="flex-1 overflow-hidden m-0">
                  {exportResult && (
                    <ScrollArea className="relative h-full">
                      <CodeBlock
                        code={exportResult.content}
                        language={exportResult.language}
                        className="h-full rounded-none border-0"
                      >
                        <CodeBlockCopyButton
                          onCopy={() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        />
                      </CodeBlock>
                      <ScrollBar orientation="horizontal" />
                      <ScrollBar orientation="vertical" />
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="layout" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="relative h-full">
                    <CodeBlock
                      code={layoutCode}
                      language="tsx"
                      className="h-full rounded-none border-0"
                    >
                      <CodeBlockCopyButton
                        onCopy={() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      />
                    </CodeBlock>
                    <ScrollBar orientation="horizontal" />
                    <ScrollBar orientation="vertical" />
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="h-full flex flex-col">
                <div className="bg-muted/50 flex flex-none items-center justify-between border-b px-4 py-2">
                  <span className="text-sm font-medium">
                    {exportResult?.fileName || "export"}
                  </span>

                  <div className="flex items-center gap-2">
                    {exportResult && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(exportResult.content, exportResult.fileName)}
                        className="h-8"
                        aria-label="Download"
                      >
                        <Download className="size-4" />
                        <span className="sr-only md:not-sr-only ml-1">Download</span>
                      </Button>
                    )}
                    {exportResult && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(exportResult.content)}
                        className="h-8"
                        aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
                      >
                        {copied ? (
                          <>
                            <Check className="size-4" />
                            <span className="sr-only md:not-sr-only ml-1">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-4" />
                            <span className="sr-only md:not-sr-only ml-1">Copy</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  {exportResult && (
                    <ScrollArea className="relative h-full">
                      <CodeBlock
                        code={exportResult.content}
                        language={exportResult.language}
                        className="h-full rounded-none border-0"
                      >
                        <CodeBlockCopyButton
                          onCopy={() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                        />
                      </CodeBlock>
                      <ScrollBar orientation="horizontal" />
                      <ScrollBar orientation="vertical" />
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
