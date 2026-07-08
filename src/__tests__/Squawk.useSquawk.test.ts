import * as React from "react";

import createStore from "../Squawk";

// Mock variables to track state across hook calls
// eslint-disable-next-line immutable/no-let
let stateDispatchers: jest.Mock[] = [];
// eslint-disable-next-line immutable/no-let
let effectCallbacks: (() => (() => void) | void)[] = [];
// eslint-disable-next-line immutable/no-let
let unmountCallbacks: (() => void)[] = [];

// Mock React hooks to simulate hook environment without external libraries
jest.mock("react", () => {
  return {
    useState: jest.fn((init) => {
      const state = typeof init === "function" ? init() : init;
      const dispatcher = jest.fn();
      stateDispatchers.push(dispatcher);
      return [state, dispatcher];
    }),
    useRef: jest.fn((init) => {
      return { current: init };
    }),
    useMemo: jest.fn((factory) => factory()),
    useEffect: jest.fn((cb) => {
      effectCallbacks.push(cb);
    })
  };
});

describe("useSquawk", () => {
  beforeEach(() => {
    stateDispatchers = [];
    effectCallbacks = [];
    unmountCallbacks = [];
    jest.clearAllMocks();
  });

  // Test setup helper to simulate component mount and return cleanups
  const simulateMount = () => {
    effectCallbacks.forEach((cb) => {
      const cleanup = cb();
      if (cleanup) {
        unmountCallbacks.push(cleanup);
      }
    });
    effectCallbacks = []; // clear after mounting
  };

  const simulateUnmount = () => {
    unmountCallbacks.forEach((cb) => cb());
    unmountCallbacks = [];
  };

  it("should return the initial state", () => {
    const store = createStore({ foo: "bar", baz: 123 });
    const state = store.useSquawk();
    expect(state.foo).toBe("bar");
    expect(state.baz).toBe(123);
  });

  it("should track contexts implicitly via proxy", () => {
    const store = createStore({ foo: "bar", baz: 123 });
    const state = store.useSquawk();

    // Access property to trigger proxy getter
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    state.foo;

    // Check that contexts ref has "foo"
    const useRefCalls = (React.useRef as jest.Mock).mock.calls;
    // useIfMounted has 2 useRef calls, useSquawk has 1
    const contextsRef = useRefCalls[2][0];

    expect(contextsRef).toBeInstanceOf(Set);
    expect(contextsRef.has("foo")).toBe(true);
    expect(contextsRef.has("baz")).toBe(false);
  });

  it("should track contexts explicitly passed as arguments", () => {
    const store = createStore({ foo: "bar", baz: 123 });
    store.useSquawk("baz");

    const useRefCalls = (React.useRef as jest.Mock).mock.calls;
    const contextsRef = useRefCalls[2][0];

    expect(contextsRef).toBeInstanceOf(Set);
    expect(contextsRef.has("baz")).toBe(true);
    expect(contextsRef.has("foo")).toBe(false);
  });

  it("should receive updates when subscribed contexts change", () => {
    const store = createStore({ foo: "bar", baz: 123 });
    const state = store.useSquawk();

    // Access foo to subscribe to it
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    state.foo;

    // Simulate component mount to run useEffect and set up subscription
    simulateMount();

    // Trigger update
    store.update({ foo: "newBar" });

    // Check if dispatcher was called with updated state
    expect(stateDispatchers.length).toBe(1);
    expect(stateDispatchers[0]).toHaveBeenCalledWith(expect.objectContaining({ foo: "newBar", baz: 123 }));
  });

  it("should not receive updates when unsubscribed (component unmounts)", () => {
    const store = createStore({ foo: "bar", baz: 123 });
    const state = store.useSquawk();

    // Access foo to subscribe
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    state.foo;

    // Simulate mount then unmount
    simulateMount();
    simulateUnmount();

    // Clear dispatcher calls from any initial setup
    stateDispatchers[0].mockClear();

    // Trigger update
    store.update({ foo: "newBar" });

    // Dispatcher should not be called since component unmounted
    expect(stateDispatchers[0]).not.toHaveBeenCalled();
  });
});
