import { describe, it, expect } from "vitest";
import { parseCssInput } from "./parse-css-input";

describe("parseCssInput", () => {
  describe("basic :root and .dark parsing", () => {
    it("should parse basic :root variables", () => {
      const css = `
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: #3e2723;
}
      `;

      const result = parseCssInput(css);

      expect(result.successCount).toBeGreaterThan(0);
      expect(result.lightColors.background).toBeDefined();
      expect(result.lightColors.foreground).toBeDefined();
      expect(result.lightColors.primary).toBeDefined();
    });

    it("should parse .dark variables separately", () => {
      const css = `
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 0 0% 100%;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBe("#ffffff");
      expect(result.darkColors.foreground).toBe("#ffffff");
      expect(result.lightColors.background).not.toBe(result.darkColors.background);
    });

    it("should handle :root.dark selector", () => {
      const css = `
:root {
  --background: 0 0% 100%;
}

:root.dark {
  --background: 222.2 84% 4.9%;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBeDefined();
      expect(result.darkColors.background).toBeDefined();
    });
  });

  describe("@layer base support", () => {
    it("should parse variables inside @layer base", () => {
      const css = `
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 0 0% 100%;
  }
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBe("#ffffff");
      expect(result.darkColors.foreground).toBe("#ffffff");
      expect(result.successCount).toBeGreaterThanOrEqual(4);
    });

    it("should handle nested @layer base with :root.dark", () => {
      const css = `
@layer base {
  :root {
    --primary: #ff0000;
  }
  
  :root.dark {
    --primary: #00ff00;
  }
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.primary).toBe("#ff0000");
      expect(result.darkColors.primary).toBe("#00ff00");
    });
  });

  describe("CSS comments support", () => {
    it("should skip single-line comments", () => {
      const css = `
:root {
  // This is a comment
  --background: 0 0% 100%;
  // Another comment
  --foreground: 222.2 84% 4.9%;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBeDefined();
      expect(result.lightColors.foreground).toBeDefined();
    });

    it("should skip multi-line comments", () => {
      const css = `
:root {
  /* This is a multi-line
     comment that spans
     multiple lines */
  --background: 0 0% 100%;
  /* Another comment */
  --foreground: 222.2 84% 4.9%;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBeDefined();
      expect(result.lightColors.foreground).toBeDefined();
    });

    it("should handle comments with CSS-like content", () => {
      const css = `
/* :root {
  --should-not-parse: red;
} */

:root {
  --background: 0 0% 100%;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors["should-not-parse"]).toBeUndefined();
      expect(result.lightColors.background).toBeDefined();
    });
  });

  describe("color format support", () => {
    it("should parse hex colors", () => {
      const css = `
:root {
  --primary: #ff5733;
  --secondary: #33ff57;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.primary).toBe("#ff5733");
      expect(result.lightColors.secondary).toBe("#33ff57");
    });

    it("should parse short hex colors", () => {
      const css = `
:root {
  --primary: #f00;
  --secondary: #0f0;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.primary).toBe("#ff0000");
      expect(result.lightColors.secondary).toBe("#00ff00");
    });

    it("should parse rgb colors", () => {
      const css = `
:root {
  --primary: rgb(255, 87, 51);
  --secondary: rgb(51, 255, 87);
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.primary).toBeDefined();
      expect(result.lightColors.secondary).toBeDefined();
    });

    it("should parse rgba colors", () => {
      const css = `
:root {
  --primary: rgba(255, 87, 51, 0.8);
  --secondary: rgba(51, 255, 87, 0.5);
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.primary).toBeDefined();
      expect(result.lightColors.secondary).toBeDefined();
    });

    it("should parse hsl colors without hsl() wrapper", () => {
      const css = `
:root {
  --background: 0 0% 100%;
  --primary: 0 100% 50%;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBe("#ffffff");
      expect(result.lightColors.primary).toBe("#ff0000");
    });

    it("should parse hsl() colors", () => {
      const css = `
:root {
  --primary: hsl(10, 100%, 60%);
  --secondary: hsl(130, 100%, 60%);
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.primary).toBeDefined();
      expect(result.lightColors.secondary).toBeDefined();
    });

    it("should parse oklch colors", () => {
      const css = `
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.52 0.13 144.17);
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBeDefined();
      expect(result.lightColors.foreground).toBeDefined();
      expect(result.lightColors.primary).toBeDefined();
    });
  });

  describe("non-color variables", () => {
    it("should parse radius variable", () => {
      const css = `
:root {
  --radius: 0.5rem;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.radius).toBe("0.5rem");
    });

    it("should parse font variables", () => {
      const css = `
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco;
  --font-serif: ui-serif, Georgia, Cambria;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors["font-sans"]).toBe("ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont");
      expect(result.lightColors["font-mono"]).toBe("ui-monospace, SFMono-Regular, Menlo, Monaco");
      expect(result.lightColors["font-serif"]).toBe("ui-serif, Georgia, Cambria");
    });

    it("should parse shadow variables", () => {
      const css = `
:root {
  --shadow-opacity: 0.1;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-offset-x: 0;
  --shadow-offset-y: 1px;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors["shadow-opacity"]).toBe("0.1");
      expect(result.lightColors["shadow-blur"]).toBe("3px");
      expect(result.lightColors["shadow-spread"]).toBe("0px");
      expect(result.lightColors["shadow-offset-x"]).toBe("0");
      expect(result.lightColors["shadow-offset-y"]).toBe("1px");
    });

    it("should parse letter-spacing", () => {
      const css = `
:root {
  --letter-spacing: 0.02em;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors["letter-spacing"]).toBe("0.02em");
    });
  });

  describe("robust parsing - complex values", () => {
    it("should handle values with colons inside", () => {
      const css = `
:root {
  --font-sans: "Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900", system-ui;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors["font-sans"]).toBe('"Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900", system-ui');
    });

    it("should handle values with nested parentheses", () => {
      const css = `
:root {
  --font-sans: var(--font-geist-sans, ui-sans-serif);
  --primary: rgb(calc(255 - 10), 87, 51);
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors["font-sans"]).toBe("var(--font-geist-sans, ui-sans-serif)");
    });

    it("should handle values with quoted strings containing semicolons", () => {
      const css = `
:root {
  --font-sans: "Font with ; semicolon", system-ui;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors["font-sans"]).toBe('"Font with ; semicolon", system-ui');
    });
  });

  describe("error handling and diagnostics", () => {
    it("should not fail when some variables are invalid", () => {
      const css = `
:root {
  --background: 0 0% 100%;
  --invalid-color: not-a-valid-color;
  --foreground: 222.2 84% 4.9%;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBeDefined();
      expect(result.lightColors.foreground).toBeDefined();
      expect(result.successCount).toBeGreaterThan(0);
    });

    it("should generate diagnostics for invalid color values", () => {
      const css = `
:root {
  --background: 0 0% 100%;
  --primary: invalid-color-value;
}
      `;

      const result = parseCssInput(css);

      const colorWarnings = result.diagnostics.filter(
        (d) => d.severity === "warning" && d.variableName === "primary"
      );
      expect(colorWarnings.length).toBeGreaterThan(0);
      expect(colorWarnings[0].message).toContain("Failed to parse");
    });

    it("should generate info diagnostics for unknown variables", () => {
      const css = `
:root {
  --background: 0 0% 100%;
  --unknown-variable: #ff0000;
}
      `;

      const result = parseCssInput(css);

      const unknownInfos = result.diagnostics.filter(
        (d) => d.severity === "info" && d.variableName === "unknown-variable"
      );
      expect(unknownInfos.length).toBeGreaterThan(0);
      expect(unknownInfos[0].message).toContain("Unknown variable");
    });

    it("should warn when no CSS blocks are found", () => {
      const css = `
This is not valid CSS
No blocks here
      `;

      const result = parseCssInput(css);

      const noBlockWarnings = result.diagnostics.filter(
        (d) => d.severity === "warning" && d.message.includes("No CSS blocks found")
      );
      expect(noBlockWarnings.length).toBe(1);
    });

    it("should handle malformed CSS gracefully", () => {
      const css = `
:root {
  --background: 0 0% 100%
  missing semicolon
  --foreground: 222.2 84% 4.9%;
}
      `;

      const result = parseCssInput(css);

      expect(result.successCount).toBeGreaterThan(0);
      expect(result.failureCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Tailwind v4 compatible formats", () => {
    it("should parse Tailwind v4 style variables", () => {
      const css = `
:root {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.145 0 0);
  --radius: 0.625rem;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.radius).toBe("0.625rem");
    });
  });

  describe("sidebar variables", () => {
    it("should parse sidebar-related variables", () => {
      const css = `
:root {
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.sidebar).toBeDefined();
      expect(result.lightColors["sidebar-foreground"]).toBeDefined();
      expect(result.lightColors["sidebar-primary"]).toBeDefined();
      expect(result.lightColors["sidebar-primary-foreground"]).toBeDefined();
      expect(result.lightColors["sidebar-accent"]).toBeDefined();
      expect(result.lightColors["sidebar-accent-foreground"]).toBeDefined();
      expect(result.lightColors["sidebar-border"]).toBeDefined();
      expect(result.lightColors["sidebar-ring"]).toBeDefined();
    });
  });

  describe("chart variables", () => {
    it("should parse chart variables", () => {
      const css = `
:root {
  --chart-1: oklch(0.81 0.10 252);
  --chart-2: oklch(0.62 0.19 260);
  --chart-3: oklch(0.55 0.22 263);
  --chart-4: oklch(0.49 0.22 264);
  --chart-5: oklch(0.42 0.18 266);
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors["chart-1"]).toBeDefined();
      expect(result.lightColors["chart-2"]).toBeDefined();
      expect(result.lightColors["chart-3"]).toBeDefined();
      expect(result.lightColors["chart-4"]).toBeDefined();
      expect(result.lightColors["chart-5"]).toBeDefined();
    });
  });

  describe("real-world shadcn/ui theme examples", () => {
    it("should parse a typical shadcn/ui theme", () => {
      const css = `
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
      `;

      const result = parseCssInput(css);

      expect(result.successCount).toBeGreaterThanOrEqual(40);
      expect(result.lightColors.background).toBeDefined();
      expect(result.darkColors.background).toBeDefined();
      expect(result.lightColors.background).not.toBe(result.darkColors.background);
      expect(result.lightColors.primary).toBeDefined();
      expect(result.darkColors.primary).toBeDefined();
      expect(result.lightColors.radius).toBe("0.5rem");
    });
  });

  describe("partial success scenarios", () => {
    it("should parse valid variables even when some are invalid", () => {
      const css = `
:root {
  --background: 0 0% 100%;
  --foreground: invalid-color-value;
  --primary: also-invalid-color;
  --secondary: #00ff00;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBe("#ffffff");
      expect(result.lightColors.secondary).toBe("#00ff00");

      const warnings = result.diagnostics.filter((d) => d.severity === "warning");
      expect(warnings.length).toBeGreaterThanOrEqual(2);
    });

    it("should not crash on completely invalid CSS", () => {
      const css = `
this is not css at all
{ { { { } } } }
:root {
  --background: 0 0% 100%;
}
      `;

      const result = parseCssInput(css);

      expect(result.lightColors.background).toBeDefined();
    });
  });
});
