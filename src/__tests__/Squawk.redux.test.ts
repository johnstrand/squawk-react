import createStore from "../Squawk";

describe("Redux DevTools integration", () => {
  it("handles malformed JSON gracefully", () => {
    const devToolsSubscribeCallbacks: Array<(msg: { type: string; state: string }) => void> = [];
    // eslint-disable-next-line immutable/no-mutation, @typescript-eslint/no-explicit-any
    (global as any).window = {
      __REDUX_DEVTOOLS_EXTENSION__: {
        connect: () => ({
          subscribe: (cb: (msg: { type: string; state: string }) => void) => {
            devToolsSubscribeCallbacks.push(cb);
          },
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          send: () => {},
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          init: () => {}
        })
      }
    };

    const store = createStore({ foo: "bar" }, true);

    expect(() => {
      devToolsSubscribeCallbacks[0]({ type: "DISPATCH", state: "invalid json" });
    }).not.toThrow();

    expect(store.get().foo).toBe("bar");

    // clean up
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global as any).window;
  });
});
