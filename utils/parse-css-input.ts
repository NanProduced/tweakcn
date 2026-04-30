import { ThemeStyleProps } from "@/types/theme";
import { colorFormatter } from "./color-converter";
import { COMMON_STYLES, defaultThemeState } from "@/config/theme";
import * as culori from "culori";

export const variableNames = Object.keys(defaultThemeState.styles.light);
const nonColorVariables = COMMON_STYLES;
const VARIABLE_PREFIX = "--";
const TAILWIND_V4_COLOR_PREFIX = "color-";

function mapTailwindV4VariableName(name: string): string {
  if (name.startsWith(TAILWIND_V4_COLOR_PREFIX)) {
    return name.slice(TAILWIND_V4_COLOR_PREFIX.length);
  }
  return name;
}

export interface ParseDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  line?: number;
  column?: number;
  variableName?: string;
  rawValue?: string;
}

export interface ParseResult {
  lightColors: ThemeStyleProps;
  darkColors: ThemeStyleProps;
  diagnostics: ParseDiagnostic[];
  successCount: number;
  failureCount: number;
}

interface CssBlock {
  selector: string;
  content: string;
  startLine: number;
}

interface DeclarationWithLine {
  declaration: string;
  startLine: number;
}

const CSS_SELECTORS = {
  ROOT: [":root"],
  DARK: [".dark", ":root.dark"],
};

function stripComments(input: string): { stripped: string; diagnostics: ParseDiagnostic[] } {
  const diagnostics: ParseDiagnostic[] = [];
  let result = "";
  let i = 0;
  let line = 1;
  let column = 1;

  while (i < input.length) {
    if (input[i] === "/" && input[i + 1] === "*") {
      diagnostics.push({
        severity: "info",
        message: "Found multi-line comment, skipping",
        line,
        column,
      });
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) {
        if (input[i] === "\n") {
          line++;
          column = 1;
        } else {
          column++;
        }
        i++;
      }
      i += 2;
      continue;
    }

    if (input[i] === "/" && input[i + 1] === "/") {
      diagnostics.push({
        severity: "info",
        message: "Found single-line comment, skipping",
        line,
        column,
      });
      i += 2;
      while (i < input.length && input[i] !== "\n") {
        i++;
      }
      if (input[i] === "\n") {
        line++;
        column = 1;
        i++;
      }
      continue;
    }

    if (input[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }

    result += input[i];
    i++;
  }

  return { stripped: result, diagnostics };
}

function findAllBlocks(input: string): CssBlock[] {
  const blocks: CssBlock[] = [];
  const strippedComments = stripComments(input);
  const css = strippedComments.stripped;

  let i = 0;
  let line = 1;

  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) {
      if (css[i] === "\n") line++;
      i++;
    }

    if (i >= css.length) break;

    const selectorStart = i;
    let inSelector = true;
    let selector = "";

    while (i < css.length) {
      const char = css[i];

      if (inSelector) {
        if (char === "{") {
          selector = css.slice(selectorStart, i).trim();
          inSelector = false;
          let braceCount = 1;
          i++;
          const contentStart = i;
          const blockStartLine = line;

          while (i < css.length && braceCount > 0) {
            if (css[i] === "{") {
              braceCount++;
            } else if (css[i] === "}") {
              braceCount--;
            } else if (css[i] === "\n") {
              line++;
            }
            i++;
          }

          const content = css.slice(contentStart, braceCount === 0 ? i - 1 : i).trim();

          if (selector && content) {
            blocks.push({
              selector,
              content,
              startLine: blockStartLine,
            });
          }
          break;
        } else if (char === "\n") {
          line++;
        }
        i++;
      } else {
        break;
      }
    }

    if (inSelector && i < css.length) {
      i++;
    }
  }

  return blocks;
}

function matchesDarkSelector(selector: string): boolean {
  const darkPatterns = [
    /^\.dark\b/,
    /\s\.dark\b/,
    /:root\.dark\b/,
    /\.dark\s+:root\b/,
    /@media\s*\([^)]*prefers-color-scheme\s*:\s*dark[^)]*\)/,
  ];
  return darkPatterns.some((pattern) => pattern.test(selector));
}

function extractBlocksForMode(
  blocks: CssBlock[],
  mode: "light" | "dark"
): CssBlock[] {
  const result: CssBlock[] = [];

  for (const block of blocks) {
    const isDarkSelector = matchesDarkSelector(block.selector);

    if (block.selector === "@layer base" || block.selector.startsWith("@layer base ")) {
      const nestedBlocks = findAllBlocks(block.content);
      for (const nested of nestedBlocks) {
        const nestedIsDark = matchesDarkSelector(nested.selector);
        if (mode === "light" && !nestedIsDark) {
          result.push({
            ...nested,
            startLine: block.startLine + nested.startLine - 1,
          });
        } else if (mode === "dark" && nestedIsDark) {
          result.push({
            ...nested,
            startLine: block.startLine + nested.startLine - 1,
          });
        }
      }
    } else if (mode === "light" && !isDarkSelector) {
      if (CSS_SELECTORS.ROOT.some((s) => block.selector.includes(s))) {
        result.push(block);
      }
    } else if (mode === "dark" && isDarkSelector) {
      result.push(block);
    }
  }

  return result;
}

function splitDeclarationsWithLines(content: string, blockStartLine: number): DeclarationWithLine[] {
  const declarations: DeclarationWithLine[] = [];
  let current = "";
  let depth = 0;
  let inString = false;
  let stringChar = "";
  let declarationStartLine = 1;
  let line = 1;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === "\n") {
      line++;
    }

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      current += char;
      continue;
    }

    if (inString && char === stringChar && content[i - 1] !== "\\") {
      inString = false;
      current += char;
      continue;
    }

    if (!inString) {
      if (char === "(" || char === "[" || char === "{") {
        depth++;
      } else if (char === ")" || char === "]" || char === "}") {
        depth--;
      } else if (char === ";" && depth === 0) {
        if (current.trim()) {
          declarations.push({
            declaration: current.trim(),
            startLine: blockStartLine + declarationStartLine - 1,
          });
        }
        current = "";
        declarationStartLine = line;
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    declarations.push({
      declaration: current.trim(),
      startLine: blockStartLine + declarationStartLine - 1,
    });
  }

  return declarations;
}

function parseVariableDeclaration(
  declaration: string,
  lineOffset: number = 0
): {
  name: string;
  value: string;
  success: boolean;
  diagnostic?: ParseDiagnostic;
} {
  const trimmed = declaration.trim();

  if (!trimmed || !trimmed.startsWith(VARIABLE_PREFIX)) {
    return {
      name: "",
      value: "",
      success: false,
      diagnostic: {
        severity: "info",
        message: "Skipping non-variable declaration",
        line: lineOffset,
        rawValue: trimmed,
      },
    };
  }

  const colonMatch = trimmed.match(/^(--[^:]+):\s*/);
  if (!colonMatch) {
    return {
      name: "",
      value: "",
      success: false,
      diagnostic: {
        severity: "error",
        message: "Invalid variable declaration format: missing colon after variable name",
        line: lineOffset,
        rawValue: trimmed,
      },
    };
  }

  const name = colonMatch[1].slice(2);
  const afterName = trimmed.slice(colonMatch[0].length);

  let value = "";
  let depth = 0;
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < afterName.length; i++) {
    const char = afterName[i];

    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      value += char;
      continue;
    }

    if (inString && char === stringChar && afterName[i - 1] !== "\\") {
      inString = false;
      value += char;
      continue;
    }

    if (!inString) {
      if (char === "(" || char === "[" || char === "{") {
        depth++;
      } else if (char === ")" || char === "]" || char === "}") {
        depth--;
      } else if (char === ";" && depth === 0) {
        break;
      }
    }

    value += char;
  }

  value = value.trim();

  if (!value) {
    return {
      name,
      value: "",
      success: false,
      diagnostic: {
        severity: "warning",
        message: `Variable "${name}" has empty value`,
        line: lineOffset,
        variableName: name,
      },
    };
  }

  return {
    name,
    value,
    success: true,
  };
}

function processValueForToken(
  name: string,
  value: string,
  lineOffset: number = 0
): {
  processed: string;
  success: boolean;
  diagnostic?: ParseDiagnostic;
} {
  if (nonColorVariables.includes(name)) {
    return {
      processed: value,
      success: true,
    };
  }

  let colorValue = value;
  if (/^\d/.test(value) && !value.startsWith("#") && !value.startsWith("rgb") && !value.startsWith("hsl")) {
    colorValue = `hsl(${value})`;
  }

  const parsedColor = culori.parse(colorValue);
  if (!parsedColor) {
    return {
      processed: value,
      success: false,
      diagnostic: {
        severity: "warning",
        message: `Failed to parse color value for "${name}": invalid color format`,
        line: lineOffset,
        variableName: name,
        rawValue: value,
      },
    };
  }

  const formattedValue = colorFormatter(colorValue, "hex");
  return {
    processed: formattedValue,
    success: true,
  };
}

function parseColorVariablesFromBlocks(
  blocks: CssBlock[],
  target: ThemeStyleProps,
  validNames: string[]
): ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];

  for (const block of blocks) {
    const declarationsWithLines = splitDeclarationsWithLines(block.content, block.startLine);

    for (const { declaration, startLine } of declarationsWithLines) {
      const result = parseVariableDeclaration(declaration, startLine);

      if (result.diagnostic) {
        diagnostics.push(result.diagnostic);
      }

      if (!result.success) {
        continue;
      }

      const { name, value } = result;

      let mappedName = mapTailwindV4VariableName(name);

      if (!validNames.includes(mappedName)) {
        diagnostics.push({
          severity: "info",
          message: `Unknown variable "${name}"${mappedName !== name ? ` (mapped to "${mappedName}")` : ""}, skipping`,
          line: startLine,
          variableName: name,
          rawValue: value,
        });
        continue;
      }

      const processed = processValueForToken(mappedName, value, startLine);

      if (processed.diagnostic) {
        diagnostics.push(processed.diagnostic);
      }

      if (processed.success) {
        target[mappedName as keyof ThemeStyleProps] = processed.processed;
      }
    }
  }

  return diagnostics;
}

export const parseCssInput = (input: string): ParseResult => {
  const lightColors: ThemeStyleProps = {} as ThemeStyleProps;
  const darkColors: ThemeStyleProps = {} as ThemeStyleProps;
  const diagnostics: ParseDiagnostic[] = [];

  try {
    const stripped = stripComments(input);
    diagnostics.push(...stripped.diagnostics);

    const blocks = findAllBlocks(input);

    if (blocks.length === 0) {
      diagnostics.push({
        severity: "warning",
        message: "No CSS blocks found. Expected :root, .dark, or @layer base selectors.",
      });
    }

    const lightBlocks = extractBlocksForMode(blocks, "light");
    const darkBlocks = extractBlocksForMode(blocks, "dark");

    if (lightBlocks.length > 0) {
      const lightDiagnostics = parseColorVariablesFromBlocks(lightBlocks, lightColors, variableNames);
      diagnostics.push(...lightDiagnostics);
    }

    if (darkBlocks.length > 0) {
      const darkDiagnostics = parseColorVariablesFromBlocks(darkBlocks, darkColors, variableNames);
      diagnostics.push(...darkDiagnostics);
    }
  } catch (error) {
    diagnostics.push({
      severity: "error",
      message: `Unexpected parsing error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  const successCount = Object.keys(lightColors).length + Object.keys(darkColors).length;
  const failureCount = diagnostics.filter((d) => d.severity === "error").length;

  return {
    lightColors,
    darkColors,
    diagnostics,
    successCount,
    failureCount,
  };
};
