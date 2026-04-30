import { ThemeStyles, ThemeStyleProps } from "@/types/theme";
import { isDeepEqual } from "@/lib/utils";

export type TokenType = "color" | "font" | "radius" | "shadow" | "spacing" | "letter-spacing" | "other";

export interface TokenDifference {
  token: string;
  type: TokenType;
  mode: "light" | "dark" | "common";
  baseValue: string;
  targetValue: string;
  isSame: boolean;
}

export interface TokenDiffResult {
  differences: TokenDifference[];
  sameTokens: TokenDifference[];
  totalTokens: number;
  differentCount: number;
  sameCount: number;
}

export interface PatchOperation {
  token: string;
  mode: "light" | "dark";
  value: string;
}

export const COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
  "shadow-color",
];

export const FONT_TOKENS = ["font-sans", "font-serif", "font-mono"];

export const SHADOW_TOKENS = [
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
];

export const COMMON_TOKENS = [
  "font-sans",
  "font-serif",
  "font-mono",
  "radius",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
  "letter-spacing",
  "spacing",
];

export function getTokenType(token: string): TokenType {
  if (COLOR_TOKENS.includes(token)) return "color";
  if (FONT_TOKENS.includes(token)) return "font";
  if (token === "radius") return "radius";
  if (SHADOW_TOKENS.includes(token)) return "shadow";
  if (token === "spacing") return "spacing";
  if (token === "letter-spacing") return "letter-spacing";
  return "other";
}

export function isCommonToken(token: string): boolean {
  return COMMON_TOKENS.includes(token);
}

export function getAllThemeTokens(): string[] {
  return [
    ...COLOR_TOKENS,
    ...FONT_TOKENS,
    "radius",
    ...SHADOW_TOKENS,
    "letter-spacing",
    "spacing",
  ];
}

export function compareThemes(
  baseTheme: ThemeStyles,
  targetTheme: ThemeStyles
): TokenDiffResult {
  const differences: TokenDifference[] = [];
  const sameTokens: TokenDifference[] = [];
  const allTokens = getAllThemeTokens();

  for (const token of allTokens) {
    for (const mode of ["light", "dark"] as const) {
      const baseValue = baseTheme[mode][token as keyof ThemeStyleProps] || "";
      const targetValue = targetTheme[mode][token as keyof ThemeStyleProps] || "";
      const isSame = isDeepEqual(baseValue, targetValue);

      const diff: TokenDifference = {
        token,
        type: getTokenType(token),
        mode,
        baseValue: String(baseValue),
        targetValue: String(targetValue),
        isSame,
      };

      if (isSame) {
        sameTokens.push(diff);
      } else {
        differences.push(diff);
      }
    }
  }

  return {
    differences,
    sameTokens,
    totalTokens: allTokens.length * 2,
    differentCount: differences.length,
    sameCount: sameTokens.length,
  };
}

export function createPatchOperations(
  selectedDifferences: TokenDifference[]
): PatchOperation[] {
  const operations: PatchOperation[] = [];
  const processed = new Set<string>();

  for (const diff of selectedDifferences) {
    const mode = diff.mode as "light" | "dark";
    const key = `${diff.token}-${mode}`;
    if (processed.has(key)) continue;
    processed.add(key);

    operations.push({
      token: diff.token,
      mode,
      value: diff.targetValue,
    });
  }

  return operations;
}

export function applyPatch(
  theme: ThemeStyles,
  operations: PatchOperation[]
): ThemeStyles {
  const newTheme: ThemeStyles = {
    light: { ...theme.light },
    dark: { ...theme.dark },
  };

  for (const op of operations) {
    newTheme[op.mode][op.token as keyof ThemeStyleProps] = op.value as any;
  }

  return newTheme;
}

export function createRevertPatch(
  theme: ThemeStyles,
  operations: PatchOperation[]
): PatchOperation[] {
  return operations.map((op) => ({
    ...op,
    value: String(theme[op.mode][op.token as keyof ThemeStyleProps] || ""),
  }));
}

export function groupDifferencesByToken(
  differences: TokenDifference[]
): Record<string, TokenDifference[]> {
  const grouped: Record<string, TokenDifference[]> = {};

  for (const diff of differences) {
    if (!grouped[diff.token]) {
      grouped[diff.token] = [];
    }
    grouped[diff.token].push(diff);
  }

  return grouped;
}

export function groupDifferencesByType(
  differences: TokenDifference[]
): Record<TokenType, TokenDifference[]> {
  const grouped: Record<TokenType, TokenDifference[]> = {
    color: [],
    font: [],
    radius: [],
    shadow: [],
    spacing: [],
    "letter-spacing": [],
    other: [],
  };

  for (const diff of differences) {
    grouped[diff.type].push(diff);
  }

  return grouped;
}
