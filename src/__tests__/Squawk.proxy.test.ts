import createStore from "../Squawk";
import * as React from "react";

// Mock React hooks to simulate hook environment
jest.mock("react", () => {
  const actualReact = jest.requireActual("react");
  return {
    ...actualReact,
    useState: jest.fn((init) => [typeof init === 'function' ? init() : init, jest.fn()]),
    useRef: jest.fn((init) => ({ current: init })),
    useMemo: jest.fn((factory) => factory()),
    useEffect: jest.fn(),
  };
});

describe("Squawk proxy vulnerability", () => {
  it("does not crash or add Symbol properties to contexts in usePending", () => {
    // Clear mocks between tests
    jest.clearAllMocks();

    const store = createStore({ foo: "bar", baz: 123 });
    const pending = store.usePending();

    // Access a Symbol property on the returned proxy
    const sym = Symbol("test");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const value = pending[sym];
    expect(value).toBeUndefined();

    // Since we mocked useRef, we can check its calls
    const useRefCalls = (React.useRef as jest.Mock).mock.calls;
    // useIfMounted has 2 useRef calls, usePending has 1
    const contextsRef = useRefCalls[2][0]; // explicitContexts set

    expect(contextsRef).toBeInstanceOf(Set);
    expect(contextsRef.has(sym)).toBe(false);
  });

  it("does not crash or add Symbol properties to contexts in useSquawk", () => {
    // Clear mocks between tests
    jest.clearAllMocks();

    const store = createStore({ foo: "bar", baz: 123 });
    const state = store.useSquawk();

    // Access a Symbol property on the returned proxy
    const sym = Symbol("test");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const value = state[sym];
    expect(value).toBeUndefined();

    const useRefCalls = (React.useRef as jest.Mock).mock.calls;
    const contextsRef = useRefCalls[2][0]; // explicitContexts set

    expect(contextsRef).toBeInstanceOf(Set);
    expect(contextsRef.has(sym)).toBe(false);
  });
});
