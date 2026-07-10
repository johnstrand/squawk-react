import createStore from "../Squawk";

describe("Squawk pending", () => {
  it("throws error when pending count drops below zero", () => {
    const store = createStore({
      testProp: "initial"
    });

    // Calling pending with false when count is 0 should throw
    expect(() => {
      store.pending("testProp", false);
    }).toThrowError('Too many calls to pending("testProp", false)');
  });

  it("handles happy path of pending correctly", () => {
    const store = createStore({
      testProp: "initial"
    });

    // Initially setting to true should not throw
    expect(() => {
      store.pending("testProp", true);
    }).not.toThrow();

    // Setting back to false should also not throw (count returns to 0)
    expect(() => {
      store.pending("testProp", false);
    }).not.toThrow();
  });
});
