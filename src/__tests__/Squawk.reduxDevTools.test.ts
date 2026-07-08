import createStore from "../Squawk";

describe("Squawk Redux DevTools", () => {
  let devToolsSubscribeCallback: ((message: { type: string; state: string }) => void) | null = null;
  let connectMock: jest.Mock;

  beforeEach(() => {
    devToolsSubscribeCallback = null;
    connectMock = jest.fn().mockReturnValue({
      subscribe: jest.fn((cb) => {
        devToolsSubscribeCallback = cb;
      }),
      init: jest.fn(),
      send: jest.fn()
    });

    // Make sure global.window exists in the Node environment for this test
    if (typeof global.window === "undefined") {
      (global as any).window = {};
    }

    (global.window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
      connect: connectMock
    };
  });

  afterEach(() => {
    delete (global.window as any).__REDUX_DEVTOOLS_EXTENSION__;
  });

  it("updates state when receiving valid JSON from DevTools", () => {
    const store = createStore({ foo: "initial" }, true);

    expect(connectMock).toHaveBeenCalled();
    expect(devToolsSubscribeCallback).not.toBeNull();

    if (devToolsSubscribeCallback) {
      devToolsSubscribeCallback({ type: "DISPATCH", state: JSON.stringify({ foo: "updated" }) });
    }

    expect(store.get()).toEqual({ foo: "updated" });
  });

  it("gracefully ignores invalid JSON without crashing", () => {
    const store = createStore({ foo: "initial" }, true);

    expect(connectMock).toHaveBeenCalled();
    expect(devToolsSubscribeCallback).not.toBeNull();

    // Verify it doesn't throw
    expect(() => {
      if (devToolsSubscribeCallback) {
        devToolsSubscribeCallback({ type: "DISPATCH", state: "invalid-json{" });
      }
    }).not.toThrow();

    // Verify state hasn't changed
    expect(store.get()).toEqual({ foo: "initial" });
  });
});
