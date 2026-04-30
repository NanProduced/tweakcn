import { describe, it, expect, beforeEach } from "vitest";
import {
  generateCssVariables,
  generateShadcnRegistryItem,
  generateV0Payload,
  generateTailwindConfig,
  generateExport,
  generateLayoutCode,
  EXPORT_FORMATS,
  type ExportFormat,
} from "./theme-export";
import { defaultLightThemeStyles, defaultDarkThemeStyles } from "@/config/theme";
import type { ThemeStyles } from "@/types/theme";

describe("theme-export", () => {
  let testThemeStyles: ThemeStyles;

  beforeEach(() => {
    testThemeStyles = {
      light: {
        ...defaultLightThemeStyles,
      },
      dark: {
        ...defaultDarkThemeStyles,
      },
    };
  });

  describe("generateCssVariables", () => {
    it("should generate CSS variables for Tailwind v3 with hsl format", () => {
      const result = generateCssVariables(testThemeStyles, {
        colorFormat: "hsl",
        tailwindVersion: "3",
      });

      expect(result).toBeDefined();
      expect(result).toContain("@tailwind base");
      expect(result).toContain("@tailwind components");
      expect(result).toContain("@tailwind utilities");
      expect(result).toContain(":root");
      expect(result).toContain(".dark");
      expect(result).toContain("--background");
      expect(result).toContain("--foreground");
    });

    it("should generate CSS variables for Tailwind v4 with oklch format", () => {
      const result = generateCssVariables(testThemeStyles, {
        colorFormat: "oklch",
        tailwindVersion: "4",
      });

      expect(result).toBeDefined();
      expect(result).toContain("@import \"tailwindcss\"");
      expect(result).toContain("@theme inline");
      expect(result).toContain("--color-background");
      expect(result).toContain(":root");
      expect(result).toContain(".dark");
    });

    it("should generate valid CSS structure", () => {
      const result = generateCssVariables(testThemeStyles);
      const lines = result.split("\n");

      expect(lines.length).toBeGreaterThan(0);
      expect(result).toMatch(/--background:\s*[^;]+;/);
      expect(result).toMatch(/--primary:\s*[^;]+;/);
    });
  });

  describe("generateShadcnRegistryItem", () => {
    it("should generate valid shadcn registry item JSON", () => {
      const result = generateShadcnRegistryItem("test-theme", testThemeStyles);

      expect(result).toBeDefined();
      const parsed = JSON.parse(result);

      expect(parsed.$schema).toBe("https://ui.shadcn.com/schema/registry-item.json");
      expect(parsed.name).toBe("test-theme");
      expect(parsed.type).toBe("registry:style");
      expect(parsed.cssVars).toBeDefined();
      expect(parsed.cssVars.theme).toBeDefined();
      expect(parsed.cssVars.light).toBeDefined();
      expect(parsed.cssVars.dark).toBeDefined();
    });

    it("should include theme variables in cssVars", () => {
      const result = generateShadcnRegistryItem("my-theme", testThemeStyles);
      const parsed = JSON.parse(result);

      expect(parsed.cssVars.theme["font-sans"]).toBeDefined();
      expect(parsed.cssVars.theme.radius).toBeDefined();
      expect(parsed.cssVars.light.background).toBeDefined();
      expect(parsed.cssVars.dark.background).toBeDefined();
    });

    it("should include shadow variables", () => {
      const result = generateShadcnRegistryItem("shadow-test", testThemeStyles);
      const parsed = JSON.parse(result);

      expect(parsed.cssVars.light["shadow-2xs"]).toBeDefined();
      expect(parsed.cssVars.light["shadow-md"]).toBeDefined();
      expect(parsed.cssVars.light["shadow-2xl"]).toBeDefined();
      expect(parsed.cssVars.dark["shadow-2xs"]).toBeDefined();
    });
  });

  describe("generateV0Payload", () => {
    it("should generate valid v0 payload JSON", () => {
      const result = generateV0Payload("v0-theme", testThemeStyles);

      expect(result).toBeDefined();
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe("v0-theme");
      expect(parsed.type).toBe("registry:item");
      expect(parsed.files).toBeDefined();
      expect(Array.isArray(parsed.files)).toBe(true);
    });

    it("should include required files in v0 payload", () => {
      const result = generateV0Payload("test", testThemeStyles);
      const parsed = JSON.parse(result);

      const fileNames = parsed.files.map((f: { path: string }) => f.path);
      expect(fileNames).toContain("app/globals.css");
      expect(fileNames).toContain("app/layout.tsx");
      expect(fileNames).toContain("app/page.tsx");
    });

    it("should have valid file structure", () => {
      const result = generateV0Payload("test", testThemeStyles);
      const parsed = JSON.parse(result);

      parsed.files.forEach((file: { path: string; content: string; type: string; target: string }) => {
        expect(file.path).toBeDefined();
        expect(file.content).toBeDefined();
        expect(file.type).toBeDefined();
        expect(file.target).toBeDefined();
      });
    });
  });

  describe("generateTailwindConfig", () => {
    it("should generate valid TypeScript Tailwind config with hsl format", () => {
      const result = generateTailwindConfig(testThemeStyles, {
        colorFormat: "hsl",
      });

      expect(result).toBeDefined();
      expect(result).toContain('import type { Config } from "tailwindcss"');
      expect(result).toContain("const config: Config = {");
      expect(result).toContain("darkMode: [\"class\"]");
      expect(result).toContain("export default config");
      expect(result).toContain("colors");
      expect(result).toContain('"hsl(var(--border))"');
    });

    it("should generate valid TypeScript Tailwind config with oklch format", () => {
      const result = generateTailwindConfig(testThemeStyles, {
        colorFormat: "oklch",
      });

      expect(result).toBeDefined();
      expect(result).toContain('import type { Config } from "tailwindcss"');
      expect(result).toContain("export default config");
      expect(result).toContain('"var(--border)"');
      expect(result).toContain("colors");
      expect(result).toContain("borderRadius");
      expect(result).toContain("fontFamily");
    });

    it("should include all required theme extensions", () => {
      const result = generateTailwindConfig(testThemeStyles);

      expect(result).toContain("primary");
      expect(result).toContain("secondary");
      expect(result).toContain("destructive");
      expect(result).toContain("muted");
      expect(result).toContain("accent");
      expect(result).toContain("popover");
      expect(result).toContain("card");
      expect(result).toContain("sidebar");
      expect(result).toContain("chart");
    });
  });

  describe("generateLayoutCode", () => {
    it("should generate layout code without custom fonts", () => {
      const result = generateLayoutCode(testThemeStyles);

      expect(result).toBeDefined();
      expect(result).toContain("import type { Metadata } from \"next\"");
      expect(result).toContain("import \"./globals.css\"");
      expect(result).toContain("export default function RootLayout");
      expect(result).toContain("<html lang=\"en\">");
      expect(result).toContain("className=\"antialiased\"");
    });

    it("should include metadata", () => {
      const result = generateLayoutCode(testThemeStyles);

      expect(result).toContain("title: \"Create Next App\"");
      expect(result).toContain("description: \"Generated by create next app\"");
    });
  });

  describe("generateExport", () => {
    const formats: ExportFormat[] = [
      "css-variables",
      "shadcn-registry",
      "v0-payload",
      "tailwind-config",
    ];

    it.each(formats)("should generate export for format: %s", (format) => {
      const result = generateExport(format, testThemeStyles, {
        themeName: "test-theme",
        colorFormat: "hsl",
        tailwindVersion: "3",
      });

      expect(result).toBeDefined();
      expect(result.format).toBe(format);
      expect(result.content).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.language).toBeDefined();
    });

    it("should return correct file names for each format", () => {
      const cssResult = generateExport("css-variables", testThemeStyles);
      expect(cssResult.fileName).toBe("globals.css");
      expect(cssResult.language).toBe("css");

      const shadcnResult = generateExport("shadcn-registry", testThemeStyles, {
        themeName: "my-theme",
      });
      expect(shadcnResult.fileName).toBe("my-theme.json");
      expect(shadcnResult.language).toBe("json");

      const v0Result = generateExport("v0-payload", testThemeStyles, {
        themeName: "v0-theme",
      });
      expect(v0Result.fileName).toBe("v0-theme-v0.json");
      expect(v0Result.language).toBe("json");

      const tailwindResult = generateExport("tailwind-config", testThemeStyles);
      expect(tailwindResult.fileName).toBe("tailwind.config.ts");
      expect(tailwindResult.language).toBe("typescript");
    });

    it("should throw error for unknown format", () => {
      // @ts-expect-error - testing invalid format
      expect(() => generateExport("unknown-format", testThemeStyles)).toThrow();
    });
  });

  describe("EXPORT_FORMATS", () => {
    it("should have all required formats", () => {
      const formatValues = EXPORT_FORMATS.map((f) => f.value);

      expect(formatValues).toContain("css-variables");
      expect(formatValues).toContain("shadcn-registry");
      expect(formatValues).toContain("v0-payload");
      expect(formatValues).toContain("tailwind-config");
    });

    it("should have labels and descriptions", () => {
      EXPORT_FORMATS.forEach((format) => {
        expect(format.label).toBeDefined();
        expect(format.description).toBeDefined();
        expect(format.label.length).toBeGreaterThan(0);
        expect(format.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle default options gracefully", () => {
      const result = generateCssVariables(testThemeStyles);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle empty theme name defaults", () => {
      const result = generateExport("shadcn-registry", testThemeStyles);
      expect(result.fileName).toBe("my-theme.json");
    });

    it("should generate consistent output for same input", () => {
      const result1 = generateCssVariables(testThemeStyles, {
        colorFormat: "oklch",
        tailwindVersion: "4",
      });
      const result2 = generateCssVariables(testThemeStyles, {
        colorFormat: "oklch",
        tailwindVersion: "4",
      });

      expect(result1).toEqual(result2);
    });
  });
});
