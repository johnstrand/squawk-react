/**
 * @jest-environment jsdom
 */
import * as React from "react";
import { render } from "@testing-library/react";

import createStore from "../Squawk";

describe("Security tests for Squawk", () => {
  it("should not crash when a symbol is accessed on the useSquawk proxy", () => {
    const store = createStore({ testVar: "foo" });

    const TestComponent = () => {
      const state = store.useSquawk("testVar");

      // React internally might check for symbols, e.g. Symbol.iterator
      const iterator = (state as any)[Symbol.iterator];

      return React.createElement("div", null, state.testVar);
    };

    const { unmount } = render(React.createElement(TestComponent));

    expect(() => unmount()).not.toThrow();
  });

  it("should not crash when a symbol is accessed on the usePending proxy", () => {
    const store = createStore({ testVar: "foo" });

    const TestComponent = () => {
      const pending = store.usePending("testVar");

      // Access a symbol
      const toStringTag = (pending as any)[Symbol.toStringTag];

      return React.createElement("div", null, pending.testVar ? "loading" : "done");
    };

    const { unmount } = render(React.createElement(TestComponent));

    expect(() => unmount()).not.toThrow();
  });
});
