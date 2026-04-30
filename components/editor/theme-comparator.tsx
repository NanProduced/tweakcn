"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useThemePresetStore } from "@/store/theme-preset-store";
import { ThemeStyles, ThemeStyleProps } from "@/types/theme";
import { defaultThemeState } from "@/config/theme";
import { getBuiltInThemeStyles } from "@/utils/theme-preset-helper";
import {
  TokenType,
  TokenDifference,
  TokenDiffResult,
  PatchOperation,
  compareThemes,
  createPatchOperations,
  applyPatch,
  createRevertPatch,
  groupDifferencesByToken,
  groupDifferencesByType,
  COLOR_TOKENS,
  FONT_TOKENS,
} from "@/utils/theme-comparator";

interface ThemeOption {
  value: string;
  label: string;
}

interface ColorSwatchProps {
  color: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({
  color,
  label,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  };

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "rounded border border-border shadow-sm",
          sizeClasses[size]
        )}
        style={{ backgroundColor: color }}
      />
      {label && (
        <span className="text-muted-foreground font-mono text-xs">
          {label}
        </span>
      )}
    </div>
  );
};

interface TokenRowProps {
  diff: TokenDifference;
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const TokenRow: React.FC<TokenRowProps> = ({
  diff,
  isSelected,
  onToggle,
  disabled,
}) => {
  const isColor = diff.type === "color";

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
        !disabled && "hover:bg-muted/50"
      )}
    >
      {!disabled && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="shrink-0"
        />
      )}
      {disabled && <div className="w-4 shrink-0" />}

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm font-medium">
              {diff.token}
            </span>
            {diff.mode !== "common" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4",
                  diff.mode === "light"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                )}
              >
                {diff.mode}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 min-w-[120px] justify-end">
            {isColor ? (
              <ColorSwatch color={diff.baseValue} size="sm" />
            ) : (
              <span className="text-muted-foreground font-mono text-xs max-w-[100px] truncate">
                {diff.baseValue}
              </span>
            )}
          </div>

          <ArrowDownUp className="text-muted-foreground size-3 shrink-0" />

          <div className="flex items-center gap-1 min-w-[120px]">
            {isColor ? (
              <ColorSwatch color={diff.targetValue} size="sm" />
            ) : (
              <span className="text-muted-foreground font-mono text-xs max-w-[100px] truncate">
                {diff.targetValue}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TokenGroupProps {
  title: string;
  type: TokenType;
  differences: TokenDifference[];
  selectedTokens: Set<string>;
  onToggle: (key: string) => void;
  defaultCollapsed?: boolean;
}

const TokenGroup: React.FC<TokenGroupProps> = ({
  title,
  differences,
  selectedTokens,
  onToggle,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (differences.length === 0) return null;

  const getTokenKey = (diff: TokenDifference) =>
    `${diff.token}-${diff.mode}`;

  const selectedCount = differences.filter((d) =>
    selectedTokens.has(getTokenKey(d))
  ).length;

  const allSelected =
    differences.length > 0 &&
    differences.every((d) => selectedTokens.has(getTokenKey(d)));

  const someSelected =
    selectedCount > 0 && selectedCount < differences.length;

  const handleToggleGroup = () => {
    if (allSelected) {
      differences.forEach((d) => {
        const key = getTokenKey(d);
        if (selectedTokens.has(key)) {
          onToggle(key);
        }
      });
    } else {
      differences.forEach((d) => {
        const key = getTokenKey(d);
        if (!selectedTokens.has(key)) {
          onToggle(key);
        }
      });
    }
  };

  return (
    <div className="space-y-1">
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/30 cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Button
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleGroup();
          }}
        >
          <Check
            className={cn(
              "size-3",
              someSelected && "opacity-50",
              !allSelected && !someSelected && "opacity-0"
            )}
          />
        </Button>
        {isCollapsed ? (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-foreground text-sm font-semibold">
          {title}
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {differences.length}
        </Badge>
        {selectedCount > 0 && (
          <Badge className="text-[10px] bg-primary">
            {selectedCount} selected
          </Badge>
        )}
      </div>
      {!isCollapsed && (
        <div className="pl-4 space-y-0.5">
          {differences.map((diff) => (
            <TokenRow
              key={getTokenKey(diff)}
              diff={diff}
              isSelected={selectedTokens.has(getTokenKey(diff))}
              onToggle={() => onToggle(getTokenKey(diff))}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SameTokensSectionProps {
  sameTokens: TokenDifference[];
}

const SameTokensSection: React.FC<SameTokensSectionProps> = ({
  sameTokens,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (sameTokens.length === 0) return null;

  const grouped = groupDifferencesByType(sameTokens);

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        className="w-full justify-between text-muted-foreground h-8"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm">
          Show {sameTokens.length} identical tokens
        </span>
        {isExpanded ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
      </Button>
      {isExpanded && (
        <Card className="bg-muted/30">
          <CardContent className="p-3 space-y-3">
            {grouped.color.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Colors ({grouped.color.length})
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {grouped.color.map((diff) => (
                    <TooltipWrapper
                      key={`${diff.token}-${diff.mode}`}
                      label={`${diff.token} (${diff.mode}): ${diff.baseValue}`}
                    >
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border">
                        <div
                          className="size-3 rounded-sm"
                          style={{ backgroundColor: diff.baseValue }}
                        />
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {diff.token}
                        </span>
                        {diff.mode !== "common" && (
                          <span className="text-[9px] text-muted-foreground/70">
                            ({diff.mode})
                          </span>
                        )}
                      </div>
                    </TooltipWrapper>
                  ))}
                </div>
              </div>
            )}
            {grouped.font.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Fonts ({grouped.font.length})
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {grouped.font.map((diff) => (
                    <div
                      key={`${diff.token}-${diff.mode}`}
                      className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground"
                    >
                      {diff.token}: {diff.baseValue.substring(0, 20)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(grouped.radius.length > 0 ||
              grouped.shadow.length > 0 ||
              grouped.spacing.length > 0 ||
              grouped["letter-spacing"].length > 0) && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Other ({grouped.radius.length + grouped.shadow.length + grouped.spacing.length + grouped["letter-spacing"].length})
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {[...grouped.radius, ...grouped.shadow, ...grouped.spacing, ...grouped["letter-spacing"]].map((diff) => (
                    <div
                      key={`${diff.token}-${diff.mode}`}
                      className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground"
                    >
                      {diff.token}: {diff.baseValue}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface TooltipWrapperProps {
  label: string;
  children: React.ReactNode;
}

const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
  label,
  children,
}) => {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md border whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </div>
  );
};

interface ThemeComparatorProps {
  onClose?: () => void;
}

const ThemeComparator: React.FC<ThemeComparatorProps> = ({ onClose }) => {
  const themeState = useEditorStore((store) => store.themeState);
  const setThemeState = useEditorStore((store) => store.setThemeState);
  const presets = useThemePresetStore((store) => store.getAllPresets());

  const [baseThemeName, setBaseThemeName] = useState<string>("current");
  const [targetThemeName, setTargetThemeName] = useState<string>("");
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [appliedPatch, setAppliedPatch] = useState<{
    operations: PatchOperation[];
    previousStyles: ThemeStyles;
  } | null>(null);

  const themeOptions: ThemeOption[] = useMemo(() => {
    const options: ThemeOption[] = [
      { value: "current", label: "Current Theme" },
      { value: "default", label: "Default" },
    ];

    Object.entries(presets).forEach(([key, preset]) => {
      if (preset.source !== "SAVED") {
        options.push({
          value: key,
          label: preset.label || key,
        });
      }
    });

    return options;
  }, [presets]);

  const getThemeStyles = useCallback(
    (themeName: string): ThemeStyles => {
      if (themeName === "current") {
        return themeState.styles;
      }
      if (themeName === "default") {
        return defaultThemeState.styles;
      }
      const builtIn = getBuiltInThemeStyles(themeName);
      if (builtIn) {
        return builtIn.styles;
      }
      const preset = presets[themeName];
      if (preset) {
        return {
          light: {
            ...defaultThemeState.styles.light,
            ...(preset.styles.light || {}),
          },
          dark: {
            ...defaultThemeState.styles.dark,
            ...(preset.styles.light || {}),
            ...(preset.styles.dark || {}),
          },
        };
      }
      return defaultThemeState.styles;
    },
    [themeState.styles, presets]
  );

  const comparison: TokenDiffResult | null = useMemo(() => {
    if (!targetThemeName) return null;

    const baseStyles = getThemeStyles(baseThemeName);
    const targetStyles = getThemeStyles(targetThemeName);

    return compareThemes(baseStyles, targetStyles);
  }, [baseThemeName, targetThemeName, getThemeStyles]);

  const groupedDifferences = useMemo(() => {
    if (!comparison) return null;
    return groupDifferencesByType(comparison.differences);
  }, [comparison]);

  const handleSelectAll = () => {
    if (!comparison) return;
    const allKeys = new Set(
      comparison.differences.map((d) => `${d.token}-${d.mode}`)
    );
    setSelectedTokens(allKeys);
  };

  const handleClearSelection = () => {
    setSelectedTokens(new Set());
  };

  const handleToggleToken = (key: string) => {
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleApplySelected = () => {
    if (!comparison || selectedTokens.size === 0) return;

    const selectedDifferences = comparison.differences.filter((d) =>
      selectedTokens.has(`${d.token}-${d.mode}`)
    );

    const operations = createPatchOperations(selectedDifferences);
    const newStyles = applyPatch(themeState.styles, operations);

    setAppliedPatch({
      operations,
      previousStyles: { ...themeState.styles },
    });

    setThemeState({
      ...themeState,
      styles: newStyles,
    });

    setSelectedTokens(new Set());
  };

  const handleUndo = () => {
    if (!appliedPatch) return;

    setThemeState({
      ...themeState,
      styles: appliedPatch.previousStyles,
    });

    setAppliedPatch(null);
  };

  const handleSwapThemes = () => {
    const temp = baseThemeName;
    setBaseThemeName(targetThemeName);
    setTargetThemeName(temp);
    setSelectedTokens(new Set());
  };

  const getThemeLabel = (themeName: string) => {
    if (themeName === "current") return "Current Theme";
    if (themeName === "default") return "Default";
    return presets[themeName]?.label || themeName;
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="px-4 py-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Theme Comparator
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Compare themes and apply differences
            </CardDescription>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-end gap-3 shrink-0">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Base Theme</Label>
            <Select
              value={baseThemeName}
              onValueChange={(v) => {
                setBaseThemeName(v);
                setSelectedTokens(new Set());
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select base theme" />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 mb-0.5"
            onClick={handleSwapThemes}
            disabled={!targetThemeName}
          >
            <ArrowDownUp className="size-4" />
          </Button>

          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Target Theme</Label>
            <Select
              value={targetThemeName}
              onValueChange={(v) => {
                setTargetThemeName(v);
                setSelectedTokens(new Set());
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select target theme" />
              </SelectTrigger>
              <SelectContent>
                {themeOptions
                  .filter((o) => o.value !== baseThemeName)
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {comparison && (
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs"
              >
                {comparison.differentCount} differences
              </Badge>
              <Badge
                variant="secondary"
                className="text-xs"
              >
                {comparison.sameCount} identical
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={handleSelectAll}
                className="text-xs h-6"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleClearSelection}
                className="text-xs h-6"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <Separator className="shrink-0" />

        <div className="flex-1 overflow-hidden min-h-0">
          {!comparison ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ArrowDownUp className="size-8 mb-2 opacity-50" />
              <p className="text-sm">Select two themes to compare</p>
            </div>
          ) : comparison.differences.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Check className="size-8 mb-2 opacity-50" />
              <p className="text-sm">Themes are identical</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-2">
              <div className="space-y-4 pb-4">
                {groupedDifferences && (
                  <>
                    {groupedDifferences.color.length > 0 && (
                      <TokenGroup
                        title="Colors"
                        type="color"
                        differences={groupedDifferences.color}
                        selectedTokens={selectedTokens}
                        onToggle={handleToggleToken}
                      />
                    )}
                    {groupedDifferences.font.length > 0 && (
                      <TokenGroup
                        title="Fonts"
                        type="font"
                        differences={groupedDifferences.font}
                        selectedTokens={selectedTokens}
                        onToggle={handleToggleToken}
                      />
                    )}
                    {groupedDifferences.radius.length > 0 && (
                      <TokenGroup
                        title="Radius"
                        type="radius"
                        differences={groupedDifferences.radius}
                        selectedTokens={selectedTokens}
                        onToggle={handleToggleToken}
                      />
                    )}
                    {groupedDifferences.shadow.length > 0 && (
                      <TokenGroup
                        title="Shadows"
                        type="shadow"
                        differences={groupedDifferences.shadow}
                        selectedTokens={selectedTokens}
                        onToggle={handleToggleToken}
                      />
                    )}
                    {groupedDifferences.spacing.length > 0 && (
                      <TokenGroup
                        title="Spacing"
                        type="spacing"
                        differences={groupedDifferences.spacing}
                        selectedTokens={selectedTokens}
                        onToggle={handleToggleToken}
                      />
                    )}
                    {groupedDifferences["letter-spacing"].length > 0 && (
                      <TokenGroup
                        title="Letter Spacing"
                        type="letter-spacing"
                        differences={groupedDifferences["letter-spacing"]}
                        selectedTokens={selectedTokens}
                        onToggle={handleToggleToken}
                      />
                    )}
                  </>
                )}

                {comparison.sameTokens.length > 0 && (
                  <>
                    <Separator />
                    <SameTokensSection sameTokens={comparison.sameTokens} />
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>

      <div className="p-4 border-t shrink-0 bg-background">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!appliedPatch}
            className="gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Undo
          </Button>
          <div className="flex items-center gap-2">
            {selectedTokens.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedTokens.size} selected
              </Badge>
            )}
            <Button
              size="sm"
              onClick={handleApplySelected}
              disabled={selectedTokens.size === 0}
            >
              Apply Selected
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeComparator;
