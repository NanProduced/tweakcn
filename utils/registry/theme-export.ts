import { ThemeStyles, ThemeStyleProps } from "@/types/theme";
import { ColorFormat } from "@/types";
import {
  defaultLightThemeStyles,
  defaultDarkThemeStyles,
} from "@/config/theme";
import { colorFormatter } from "@/utils/color-converter";
import { extractFontFamily } from "@/utils/fonts";
import {
  getThemeValue,
  convertThemeStyles,
  getShadowMapForExport,
} from "@/utils/registry/themes";
import {
  generateV0GlobalsCss,
  generateV0LayoutTsx,
  generateV0PageTsx,
  generateV0RegistryPayload,
  type V0RegistryPayload,
} from "@/utils/registry/v0";

export type ExportFormat =
  | "css-variables"
  | "shadcn-registry"
  | "v0-payload"
  | "tailwind-config";

export interface ExportResult {
  format: ExportFormat;
  content: string;
  fileName: string;
  language: string;
}

const FONT_SLOTS = [
  { key: "font-sans" as const, varName: "fontSans", cssVar: "--font-sans" },
  { key: "font-serif" as const, varName: "fontSerif", cssVar: "--font-serif" },
  { key: "font-mono" as const, varName: "fontMono", cssVar: "--font-mono" },
];

function generateColorVariables(
  styles: ThemeStyleProps,
  formatColor: (color: string) => string
): string {
  return `  --background: ${formatColor(styles.background)};
  --foreground: ${formatColor(styles.foreground)};
  --card: ${formatColor(styles.card)};
  --card-foreground: ${formatColor(styles["card-foreground"])};
  --popover: ${formatColor(styles.popover)};
  --popover-foreground: ${formatColor(styles["popover-foreground"])};
  --primary: ${formatColor(styles.primary)};
  --primary-foreground: ${formatColor(styles["primary-foreground"])};
  --secondary: ${formatColor(styles.secondary)};
  --secondary-foreground: ${formatColor(styles["secondary-foreground"])};
  --muted: ${formatColor(styles.muted)};
  --muted-foreground: ${formatColor(styles["muted-foreground"])};
  --accent: ${formatColor(styles.accent)};
  --accent-foreground: ${formatColor(styles["accent-foreground"])};
  --destructive: ${formatColor(styles.destructive)};
  --destructive-foreground: ${formatColor(styles["destructive-foreground"])};
  --border: ${formatColor(styles.border)};
  --input: ${formatColor(styles.input)};
  --ring: ${formatColor(styles.ring)};
  --chart-1: ${formatColor(styles["chart-1"])};
  --chart-2: ${formatColor(styles["chart-2"])};
  --chart-3: ${formatColor(styles["chart-3"])};
  --chart-4: ${formatColor(styles["chart-4"])};
  --chart-5: ${formatColor(styles["chart-5"])};
  --sidebar: ${formatColor(styles.sidebar)};
  --sidebar-foreground: ${formatColor(styles["sidebar-foreground"])};
  --sidebar-primary: ${formatColor(styles["sidebar-primary"])};
  --sidebar-primary-foreground: ${formatColor(styles["sidebar-primary-foreground"])};
  --sidebar-accent: ${formatColor(styles["sidebar-accent"])};
  --sidebar-accent-foreground: ${formatColor(styles["sidebar-accent-foreground"])};
  --sidebar-border: ${formatColor(styles["sidebar-border"])};
  --sidebar-ring: ${formatColor(styles["sidebar-ring"])};`;
}

function generateFontVariables(styles: ThemeStyleProps): string {
  return `
  --font-sans: ${styles["font-sans"]};
  --font-serif: ${styles["font-serif"]};
  --font-mono: ${styles["font-mono"]};`;
}

function generateRawShadowVariables(styles: ThemeStyleProps): string {
  return `
  --shadow-x: ${styles["shadow-offset-x"]};
  --shadow-y: ${styles["shadow-offset-y"]};
  --shadow-blur: ${styles["shadow-blur"]};
  --shadow-spread: ${styles["shadow-spread"]};
  --shadow-opacity: ${styles["shadow-opacity"]};
  --shadow-color: ${styles["shadow-color"]};`;
}

function generateTrackingVariables(themeStyles: ThemeStyles): string {
  const styles = themeStyles["light"];
  if (styles["letter-spacing"] === "0em") {
    return "";
  }
  return `

  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-normal: var(--tracking-normal);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);`;
}

function generateThemeVariables(
  themeStyles: ThemeStyles,
  mode: "light" | "dark",
  formatColor: (color: string) => string
): string {
  const selector = mode === "dark" ? ".dark" : ":root";
  const styles = themeStyles[mode];
  const colorVars = generateColorVariables(styles, formatColor);
  const fontVars = generateFontVariables(styles);
  const radiusVar = `\n  --radius: ${styles.radius};`;
  const shadowMap = getShadowMapForExport(themeStyles, mode);
  const shadowVars = `
  --shadow-2xs: ${shadowMap["shadow-2xs"]};
  --shadow-xs: ${shadowMap["shadow-xs"]};
  --shadow-sm: ${shadowMap["shadow-sm"]};
  --shadow: ${shadowMap["shadow"]};
  --shadow-md: ${shadowMap["shadow-md"]};
  --shadow-lg: ${shadowMap["shadow-lg"]};
  --shadow-xl: ${shadowMap["shadow-xl"]};
  --shadow-2xl: ${shadowMap["shadow-2xl"]};`;
  const rawShadowVars = generateRawShadowVariables(styles);
  const spacingVar =
    mode === "light"
      ? `\n  --spacing: ${themeStyles["light"].spacing ?? defaultLightThemeStyles.spacing};`
      : "";

  const trackingVars =
    mode === "light"
      ? `\n  --tracking-normal: ${themeStyles["light"]["letter-spacing"] ?? defaultLightThemeStyles["letter-spacing"]};`
      : "";

  return (
    selector +
    " {" +
    colorVars +
    fontVars +
    radiusVar +
    rawShadowVars +
    shadowVars +
    trackingVars +
    spacingVar +
    "\n}"
  );
}

function generateTailwindV4ThemeInline(themeStyles: ThemeStyles): string {
  return `@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);${generateTrackingVariables(themeStyles)}
}`;
}

function indentBlock(str: string): string {
  return str
    .split("\n")
    .map((line) => (line.length > 0 ? `  ${line}` : line))
    .join("\n");
}

export function generateCssVariables(
  themeStyles: ThemeStyles,
  options: {
    colorFormat?: ColorFormat;
    tailwindVersion?: "3" | "4";
  } = {}
): string {
  const { colorFormat = "hsl", tailwindVersion = "3" } = options;
  const formatColor = (color: string) => colorFormatter(color, colorFormat, tailwindVersion);

  const lightTheme = generateThemeVariables(themeStyles, "light", formatColor);
  const darkTheme = generateThemeVariables(themeStyles, "dark", formatColor);

  if (tailwindVersion === "4") {
    const tailwindV4Theme = generateTailwindV4ThemeInline(themeStyles);

    const bodyLetterSpacing =
      themeStyles["light"]["letter-spacing"] !== "0em"
        ? "\n    letter-spacing: var(--tracking-normal);"
        : "";

    return `@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

${lightTheme}

${darkTheme}

${tailwindV4Theme}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;${bodyLetterSpacing}
  }
}`;
  }

  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
${indentBlock(lightTheme)}

${indentBlock(darkTheme)}
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`;
}

export function generateShadcnRegistryItem(
  themeName: string,
  themeStyles: ThemeStyles
): string {
  const { light, dark } = convertThemeStyles(themeStyles);

  const lightShadows = getShadowMapForExport(
    { light, dark, currentMode: "light" },
    "light"
  );
  const darkShadows = getShadowMapForExport(
    { light, dark, currentMode: "dark" },
    "dark"
  );

  const registryItem = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: themeName,
    type: "registry:style",
    css: {
      "@layer base": {
        body: {
          "letter-spacing": "var(--tracking-normal)",
        },
      },
    },
    cssVars: {
      theme: {
        "font-sans":
          getThemeValue(dark, light, "font-sans") || "Inter, sans-serif",
        "font-mono": getThemeValue(dark, light, "font-mono") || "monospace",
        "font-serif": getThemeValue(dark, light, "font-serif") || "serif",
        radius: getThemeValue(dark, light, "radius") || "0.5rem",
        "tracking-tighter": "calc(var(--tracking-normal) - 0.05em)",
        "tracking-tight": "calc(var(--tracking-normal) - 0.025em)",
        "tracking-wide": "calc(var(--tracking-normal) + 0.025em)",
        "tracking-wider": "calc(var(--tracking-normal) + 0.05em)",
        "tracking-widest": "calc(var(--tracking-normal) + 0.1em)",
      },
      light: {
        ...light,
        "shadow-2xs": lightShadows["shadow-2xs"],
        "shadow-xs": lightShadows["shadow-xs"],
        "shadow-sm": lightShadows["shadow-sm"],
        shadow: lightShadows["shadow"],
        "shadow-md": lightShadows["shadow-md"],
        "shadow-lg": lightShadows["shadow-lg"],
        "shadow-xl": lightShadows["shadow-xl"],
        "shadow-2xl": lightShadows["shadow-2xl"],
        "tracking-normal":
          getThemeValue(dark, light, "letter-spacing") || "0em",
        spacing: getThemeValue(dark, light, "spacing") || "0.25rem",
      },
      dark: {
        ...dark,
        "shadow-2xs": darkShadows["shadow-2xs"],
        "shadow-xs": darkShadows["shadow-xs"],
        "shadow-sm": darkShadows["shadow-sm"],
        shadow: darkShadows["shadow"],
        "shadow-md": darkShadows["shadow-md"],
        "shadow-lg": darkShadows["shadow-lg"],
        "shadow-xl": darkShadows["shadow-xl"],
        "shadow-2xl": darkShadows["shadow-2xl"],
      },
    },
  };

  return JSON.stringify(registryItem, null, 2);
}

export function generateV0Payload(
  themeName: string,
  themeStyles: ThemeStyles
): string {
  const payload = generateV0RegistryPayload(themeName, themeStyles);
  return JSON.stringify(payload, null, 2);
}

export function generateTailwindConfig(
  themeStyles: ThemeStyles,
  options: {
    colorFormat?: ColorFormat;
  } = {}
): string {
  const { colorFormat = "hsl" } = options;

  const colorToken = (key: string) => {
    return colorFormat === "hsl" ? `"hsl(var(--${key}))"` : `"var(--${key})"`;
  };

  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: ${colorToken("border")},
        input: ${colorToken("input")},
        ring: ${colorToken("ring")},
        background: ${colorToken("background")},
        foreground: ${colorToken("foreground")},
        primary: {
          DEFAULT: ${colorToken("primary")},
          foreground: ${colorToken("primary-foreground")},
        },
        secondary: {
          DEFAULT: ${colorToken("secondary")},
          foreground: ${colorToken("secondary-foreground")},
        },
        destructive: {
          DEFAULT: ${colorToken("destructive")},
          foreground: ${colorToken("destructive-foreground")},
        },
        muted: {
            DEFAULT: ${colorToken("muted")},
          foreground: ${colorToken("muted-foreground")},
        },
        accent: {
          DEFAULT: ${colorToken("accent")},
          foreground: ${colorToken("accent-foreground")},
        },
        popover: {
          DEFAULT: ${colorToken("popover")},
          foreground: ${colorToken("popover-foreground")},
        },
        card: {
          DEFAULT: ${colorToken("card")},
          foreground: ${colorToken("card-foreground")},
        },
        sidebar: {
          DEFAULT: ${colorToken("sidebar")},
          foreground: ${colorToken("sidebar-foreground")},
          primary: ${colorToken("sidebar-primary")},
          "primary-foreground": ${colorToken("sidebar-primary-foreground")},
          accent: ${colorToken("sidebar-accent")},
          "accent-foreground": ${colorToken("sidebar-accent-foreground")},
          border: ${colorToken("sidebar-border")},
          ring: ${colorToken("sidebar-ring")},
        },
        chart: {
          1: ${colorToken("chart-1")},
          2: ${colorToken("chart-2")},
          3: ${colorToken("chart-3")},
          4: ${colorToken("chart-4")},
          5: ${colorToken("chart-5")},
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
}`;
}

export function generateExport(
  format: ExportFormat,
  themeStyles: ThemeStyles,
  options: {
    themeName?: string;
    colorFormat?: ColorFormat;
    tailwindVersion?: "3" | "4";
  } = {}
): ExportResult {
  const { themeName = "my-theme", colorFormat = "hsl", tailwindVersion = "3" } = options;

  switch (format) {
    case "css-variables":
      return {
        format: "css-variables",
        content: generateCssVariables(themeStyles, { colorFormat, tailwindVersion }),
        fileName: "globals.css",
        language: "css",
      };

    case "shadcn-registry":
      return {
        format: "shadcn-registry",
        content: generateShadcnRegistryItem(themeName, themeStyles),
        fileName: `${themeName}.json`,
        language: "json",
      };

    case "v0-payload":
      return {
        format: "v0-payload",
        content: generateV0Payload(themeName, themeStyles),
        fileName: `${themeName}-v0.json`,
        language: "json",
      };

    case "tailwind-config":
      return {
        format: "tailwind-config",
        content: generateTailwindConfig(themeStyles, { colorFormat }),
        fileName: "tailwind.config.ts",
        language: "typescript",
      };

    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

export function generateLayoutCode(themeStyles: ThemeStyles): string {
  const lightStyles = themeStyles.light;

  const googleFonts: { importName: string; varName: string; cssVar: string }[] = [];

  for (const slot of FONT_SLOTS) {
    const fontValue = lightStyles[slot.key];
    const fontFamily = extractFontFamily(fontValue);
    if (fontFamily) {
      googleFonts.push({
        importName: fontFamily.replace(/ /g, "_"),
        varName: slot.varName,
        cssVar: slot.cssVar,
      });
    }
  }

  const comment = `// For adding custom fonts with other frameworks, see:\n// https://tailwindcss.com/docs/font-family`;

  if (googleFonts.length === 0) {
    return `${comment}
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}`;
  }

  const importNames = googleFonts.map((f) => f.importName).join(", ");

  const fontConfigs = googleFonts
    .map(
      (f) => `
const ${f.varName} = ${f.importName}({
  subsets: ["latin"],
  variable: "${f.cssVar}",
});`
    )
    .join("\n");

  const classNameParts = googleFonts.map((f) => `\${${f.varName}.variable}`).join(" ");

  return `${comment}
import type { Metadata } from "next";
import { ${importNames} } from "next/font/google";
import "./globals.css";
${fontConfigs}

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={\`${classNameParts} antialiased\`}>
        {children}
      </body>
    </html>
  );
}`;
}

export const EXPORT_FORMATS: {
  value: ExportFormat;
  label: string;
  description: string;
}[] = [
  {
    value: "css-variables",
    label: "CSS Variables",
    description: "CSS variables for direct use in your stylesheet",
  },
  {
    value: "shadcn-registry",
    label: "shadcn Registry",
    description: "Registry item format for shadcn/ui CLI",
  },
  {
    value: "v0-payload",
    label: "v0 Payload",
    description: "Full project payload for v0.dev",
  },
  {
    value: "tailwind-config",
    label: "Tailwind Config",
    description: "Tailwind CSS configuration snippet",
  },
];
