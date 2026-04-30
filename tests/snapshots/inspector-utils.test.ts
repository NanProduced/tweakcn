import { segmentClassName } from "@/lib/inspector/segment-classname";
import {
  areInspectorStatesEqual,
  areRectsEqual,
  createInspectorState,
  getEmptyInspectorState,
} from "@/lib/inspector/inspector-state-utils";
import { createTableDrivenSnapshotSuite, TestCase } from "@/tests/test-framework/core";

const segmentClassNameTestCases: TestCase<string, ReturnType<typeof segmentClassName>>[] = [
  { name: "Simple class", input: "bg-red-500" },
  { name: "With opacity modifier", input: "bg-black/50" },
  { name: "With hover selector", input: "hover:bg-blue-500" },
  { name: "With focus-visible selector", input: "focus-visible:ring-2" },
  { name: "With nested selectors", input: "group-hover:opacity-100" },
  { name: "With data attribute selector", input: "data-[state=open]:bg-white" },
  { name: "Complex: selector + opacity", input: "hover:bg-black/20" },
  { name: "Tailwind v4 arbitrary value", input: "bg-[#ff0000]" },
  { name: "Single word class", input: "flex" },
  { name: "Class with multiple dashes", input: "border-r-2" },
];

createTableDrivenSnapshotSuite(
  "Inspector Utils: segmentClassName",
  segmentClassNameTestCases,
  (className) => segmentClassName(className)
);
