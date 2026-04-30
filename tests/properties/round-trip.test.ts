import * as fc from "fast-check";
import * as culori from "culori";
import { colorFormatter, formatHsl } from "@/utils/color-converter";
import {
  areInspectorStatesEqual,
  areRectsEqual,
  createInspectorState,
  getEmptyInspectorState,
} from "@/lib/inspector/inspector-state-utils";
import {
  createInvolutionProperty,
  createRoundTripProperty,
  createPropertyTest,
} from "@/tests/test-framework/core";

interface JsonValue {
  [key: string]: JsonValue;
}

type AnyJson = string | number | boolean | null | AnyJson[] | { [key: string]: AnyJson };

const jsonArbitrary: fc.Arbitrary<AnyJson> = fc.letrec((tie) => ({
  any: fc.oneof(
    fc.constant(null),
    fc.boolean(),
    fc.integer(),
    fc.float({ noDefaultInfinity: true, noNaN: true }),
    fc.string(),
    fc.array(tie("any") as fc.Arbitrary<AnyJson>),
    fc.dictionary(fc.string(), tie("any") as fc.Arbitrary<AnyJson>)
  ),
})).any as fc.Arbitrary<AnyJson>;

createRoundTripProperty(
  "JSON Round-Trip",
  "JSON.stringify -> JSON.parse should return original",
  jsonArbitrary,
  (value) => JSON.stringify(value),
  (encoded) => JSON.parse(encoded)
);

const hexColorArbitrary = fc
  .tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }))
  .map(([r, g, b]) => `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`);

createPropertyTest(
  "Color Conversion",
  "HEX -> RGB -> HEX should preserve color (within precision)",
  hexColorArbitrary,
  (hex) => {
    const rgb = colorFormatter(hex, "rgb");
    const backToHex = colorFormatter(rgb, "hex");
    const original = culori.parse(hex);
    const converted = culori.parse(backToHex);
    if (!original || !converted) return false;
    return Math.abs(original.r - converted.r) < 0.01 &&
           Math.abs(original.g - converted.g) < 0.01 &&
           Math.abs(original.b - converted.b) < 0.01;
  }
);

const rgbArrayArbitrary = fc
  .tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }))
  .map(([r, g, b]) => `rgb(${r} ${g} ${b})`);

createPropertyTest(
  "Color Conversion",
  "RGB -> HSL -> RGB should preserve color (within precision)",
  rgbArrayArbitrary,
  (rgb) => {
    const hslColor = culori.converter("hsl")(culori.parse(rgb)!);
    const hslFormatted = formatHsl(hslColor);
    const backToRgb = colorFormatter(hslFormatted, "rgb");
    const original = culori.parse(rgb);
    const converted = culori.parse(backToRgb);
    if (!original || !converted) return false;
    return Math.abs(original.r - converted.r) < 0.02 &&
           Math.abs(original.g - converted.g) < 0.02 &&
           Math.abs(original.b - converted.b) < 0.02;
  }
);

const safeFloatArbitrary = fc.float({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true });

const domRectArbitrary = fc
  .tuple(
    safeFloatArbitrary,
    safeFloatArbitrary,
    safeFloatArbitrary,
    safeFloatArbitrary
  )
  .map(([x, y, width, height]) => ({
    x,
    y,
    width,
    height,
    top: y,
    right: x + width,
    bottom: y + height,
    left: x,
  })) as fc.Arbitrary<DOMRect>;

const classNamesArbitrary = fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 10 });

const inspectorStateArbitrary = fc
  .tuple(fc.option(domRectArbitrary), classNamesArbitrary)
  .map(([rect, classes]) =>
    rect ? createInspectorState(rect, classes) : getEmptyInspectorState()
  );

createPropertyTest(
  "Inspector State Equality",
  "areInspectorStatesEqual is reflexive: state === state",
  inspectorStateArbitrary,
  (state) => areInspectorStatesEqual(state, state)
);

createPropertyTest(
  "Inspector State Equality",
  "areInspectorStatesEqual is symmetric: a == b implies b == a",
  fc.tuple(inspectorStateArbitrary, inspectorStateArbitrary),
  ([a, b]) => areInspectorStatesEqual(a, b) === areInspectorStatesEqual(b, a)
);

createPropertyTest(
  "DOMRect Equality",
  "areRectsEqual is reflexive: rect === rect",
  domRectArbitrary,
  (rect) => areRectsEqual(rect, rect)
);

createPropertyTest(
  "DOMRect Equality",
  "areRectsEqual handles null correctly",
  fc.option(domRectArbitrary),
  (rect) => areRectsEqual(null, null) && (rect === null || areRectsEqual(rect, rect))
);

const numberArbitrary = fc.integer();

createInvolutionProperty(
  "Number Operations",
  "-(-x) = x (double negation)",
  numberArbitrary,
  (x) => -x,
  (x) => -x
);

createRoundTripProperty(
  "Number Operations",
  "x + 0 round trip",
  numberArbitrary,
  (x) => x + 0,
  (x) => x
);
