import createStore from "../Squawk";

describe("Squawk subscribe", () => {
  it("should notify subscriber when the subscribed context is updated", () => {
    const store = createStore({
      testProp: "initial",
      otherProp: 1
    });

    const callback = jest.fn();
    const unsubscribe = store.subscribe("testProp", callback);

    // Update the subscribed property
    store.update({ testProp: "updated" });

    // The subscriber should be notified with the new value
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("updated");

    unsubscribe();
  });

  it("should not notify subscriber when an unrelated context is updated", () => {
    const store = createStore({
      testProp: "initial",
      otherProp: 1
    });

    const callback = jest.fn();
    store.subscribe("testProp", callback);

    // Update an unrelated property
    store.update({ otherProp: 2 });

    // The subscriber should not be notified
    expect(callback).not.toHaveBeenCalled();
  });

  it("should no longer notify subscriber after unsubscribe is called", () => {
    const store = createStore({
      testProp: "initial"
    });

    const callback = jest.fn();
    const unsubscribe = store.subscribe("testProp", callback);

    // Update the subscribed property
    store.update({ testProp: "updated" });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("updated");

    // Unsubscribe
    unsubscribe();

    // Update the property again
    store.update({ testProp: "updated again" });

    // The subscriber should not be notified a second time
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
