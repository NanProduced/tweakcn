import { defaultPresets } from "@/utils/theme-presets";
import { generateThemeRegistryFromPreset } from "@/utils/registry/themes";
import { createTableDrivenSnapshotSuite, TestCase } from "@/tests/test-framework/core";

const themeTestCases: TestCase<string, unknown>[] = Object.entries(defaultPresets).map(
  ([name, preset]) => ({
    name: preset.label || name,
    input: name,
  })
);

createTableDrivenSnapshotSuite(
  "Theme Registry Presets",
  themeTestCases,
  (themeName) => generateThemeRegistryFromPreset(themeName)
);
