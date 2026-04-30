import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

export interface TestCase<TInput, TOutput> {
  name: string;
  input: TInput;
  expected?: TOutput;
}

export const createTableDrivenSnapshotSuite = <TInput>(
  suiteName: string,
  testCases: TestCase<TInput, unknown>[],
  transform: (input: TInput) => unknown
) => {
  describe(suiteName, () => {
    testCases.forEach(({ name, input }) => {
      it(`snapshot: ${name}`, () => {
        const result = transform(input);
        expect(result).toMatchSnapshot();
      });
    });
  });
};

export const createPropertyTest = <TArbitrary>(
  suiteName: string,
  testName: string,
  arbitrary: fc.Arbitrary<TArbitrary>,
  predicate: (value: TArbitrary) => boolean | Promise<boolean>,
  options?: fc.Parameters<TArbitrary>
) => {
  describe(suiteName, () => {
    it(testName, async () => {
      await fc.assert(fc.asyncProperty(arbitrary, async (value) => {
        return await predicate(value);
      }), options);
    });
  });
};

export const createInvolutionProperty = <T>(
  suiteName: string,
  testName: string,
  arbitrary: fc.Arbitrary<T>,
  forward: (value: T) => T,
  backward?: (value: T) => T,
  options?: fc.Parameters<T>
) => {
  const invert = backward || ((x) => x);
  createPropertyTest(
    suiteName,
    testName,
    arbitrary,
    (value) => {
      const transformed = forward(value);
      const inverted = invert(transformed);
      return JSON.stringify(inverted) === JSON.stringify(value);
    },
    options
  );
};

export const createRoundTripProperty = <T1, T2>(
  suiteName: string,
  testName: string,
  arbitrary: fc.Arbitrary<T1>,
  encode: (value: T1) => T2,
  decode: (value: T2) => T1,
  options?: fc.Parameters<T1>
) => {
  createPropertyTest(
    suiteName,
    testName,
    arbitrary,
    (value) => {
      const encoded = encode(value);
      const decoded = decode(encoded);
      return JSON.stringify(decoded) === JSON.stringify(value);
    },
    options
  );
};
