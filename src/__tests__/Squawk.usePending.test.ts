import * as React from "react";
import * as renderer from "react-test-renderer";

import createStore from "../Squawk";

const { act } = renderer;

// React 16.8 react-test-renderer act doesn't support async, so we use a standard trick.
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("usePending", () => {
  it("tracks pending state correctly", async () => {
    const store = createStore({ foo: "bar", baz: 123 });

    // eslint-disable-next-line immutable/no-let, @typescript-eslint/no-explicit-any
    let currentPending: any;

    const TestComponent = () => {
      currentPending = store.usePending();
      // Access foo to track it
      return React.createElement("div", null, currentPending.foo ? "loading" : "done");
    };

    act(() => {
      renderer.create(React.createElement(TestComponent));
    });

    // Initially not pending
    expect(currentPending.foo).toBe(false);
    expect(currentPending.baz).toBe(false);

    // Make an action to trigger pending state
    // We do not await inside the action as we control the resolution
    // eslint-disable-next-line immutable/no-let, @typescript-eslint/no-explicit-any
    let resolveAction: any;
    const action = store.action(async () => {
      return new Promise<void>((resolve) => {
        resolveAction = resolve;
      });
    }, ["foo"]);

    // Start action
    // eslint-disable-next-line immutable/no-let, @typescript-eslint/no-explicit-any
    let promise: Promise<any>;
    act(() => {
      promise = action();
    });

    // After action start, should be pending
    expect(currentPending.foo).toBe(true);

    act(() => {
      resolveAction();
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await promise!;
    await flushPromises();

    // The promise resolves outside of act, so state updates in Squawk fire outside of act.
    // In test-renderer, we need to artificially flush these to not get a warning and to see the updated state.
    act(() => {
      // We do not return anything to avoid the act warning.
      // The act itself triggers the react update batching.
    });

    // After action completes, should no longer be pending
    expect(currentPending.foo).toBe(false);
  });

  it("includes explicit contexts in the tracked list", async () => {
    const store = createStore({ foo: "bar", baz: 123 });

    // eslint-disable-next-line immutable/no-let, @typescript-eslint/no-explicit-any
    let currentPending: any;

    const TestComponent = () => {
      currentPending = store.usePending("baz");
      return React.createElement("div", null, currentPending.baz ? "loading baz" : "done baz");
    };

    act(() => {
      renderer.create(React.createElement(TestComponent));
    });

    expect(currentPending.baz).toBe(false);

    // eslint-disable-next-line immutable/no-let, @typescript-eslint/no-explicit-any
    let resolveAction: any;
    const action = store.action(async () => {
      return new Promise<void>((resolve) => {
        resolveAction = resolve;
      });
    }, ["baz"]);

    // eslint-disable-next-line immutable/no-let, @typescript-eslint/no-explicit-any
    let promise: Promise<any>;
    act(() => {
      promise = action();
    });

    expect(currentPending.baz).toBe(true);
    // foo was not requested or accessed
    expect(currentPending.foo).toBe(false);

    act(() => {
      resolveAction();
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await promise!;
    await flushPromises();

    act(() => {
      // Flush effects
    });

    expect(currentPending.baz).toBe(false);
  });
});
