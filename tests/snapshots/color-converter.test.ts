import { colorFormatter, formatHsl, formatNumber } from "@/utils/color-converter";
import { createTableDrivenSnapshotSuite, TestCase } from "@/tests/test-framework/core";

type ColorFormat = "hsl" | "rgb" | "oklch" | "hex";

interface ColorTestInput {
  color: string;
  format: ColorFormat;
}

const colorTestCases: TestCase<ColorTestInput, string>[] = [
  { name: "HEX to HSL - Blue", input: { color: "#3b82f6", format: "hsl" } },
  { name: "HEX to RGB - Blue", input: { color: "#3b82f6", format: "rgb" } },
  { name: "HEX to OKLCH - Blue", input: { color: "#3b82f6", format: "oklch" } },
  { name: "HEX to HEX - Blue", input: { color: "#3b82f6", format: "hex" } },
  { name: "HSL to HSL - Red", input: { color: "hsl(0 84% 60%)", format: "hsl" } },
  { name: "HSL to RGB - Red", input: { color: "hsl(0 84% 60%)", format: "rgb" } },
  { name: "HSL to OKLCH - Red", input: { color: "hsl(0 84% 60%)", format: "oklch" } },
  { name: "RGB to HSL - Green", input: { color: "rgb(34 197 94)", format: "hsl" } },
  { name: "RGB to RGB - Green", input: { color: "rgb(34 197 94)", format: "rgb" } },
  { name: "OKLCH to HSL - Purple", input: { color: "oklch(0.6 0.25 300)", format: "hsl" } },
  { name: "OKLCH to OKLCH - Purple", input: { color: "oklch(0.6 0.25 300)", format: "oklch" } },
  { name: "HEX with alpha", input: { color: "#ff000080", format: "hsl" } },
  { name: "CSS named color", input: { color: "cornflowerblue", format: "hsl" } },
];

createTableDrivenSnapshotSuite(
  "Color Converter",
  colorTestCases,
  ({ color, format }) => colorFormatter(color, format as ColorFormat)
);
