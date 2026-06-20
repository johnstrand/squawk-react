import createStore from "../Squawk";

describe("Squawk", () => {
  describe("createStore validation", () => {
    it("throws error when initial state is null", () => {
      // @ts-ignore
      expect(() => createStore(null)).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is undefined", () => {
      // @ts-ignore
      expect(() => createStore(undefined)).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is an array", () => {
      // @ts-ignore
      expect(() => createStore([])).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is a number", () => {
      // @ts-ignore
      expect(() => createStore(1)).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is a string", () => {
      // @ts-ignore
      expect(() => createStore("string")).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is a boolean", () => {
      // @ts-ignore
      expect(() => createStore(true)).toThrow("Root store value must be an object");
    });

    it("creates store with valid initial state", () => {
      const store = createStore({ foo: "bar" });
      expect(store).toBeDefined();
      expect(store.get()).toEqual({ foo: "bar" });
    });
  });

  it("action promise rejection handles pending state properly", async () => {
    // We need to verify that `store.pending` is called with true initially and then false in the finally block
    // when the action rejects
    const store = createStore({
      testProp: "initial"
    });

    const pendingSpy = jest.spyOn(store, "pending");
    const mockError = new Error("Test rejection error");

    // Action that returns a rejected promise
    const rejectingAction = store.action(() => {
      throw mockError;
    }, ["testProp"]);

    // Attempt to execute the action, expecting it to reject
    await expect(rejectingAction()).rejects.toThrowError(mockError);

    // Verify pending state was toggled properly
    // 1st call: pending(['testProp'], true) before trying to resolve the action
    // 2nd call: pending(['testProp'], false) in the finally block after catching the error
    expect(pendingSpy).toHaveBeenCalledTimes(2);
    expect(pendingSpy).toHaveBeenNthCalledWith(1, ["testProp"], true);
    expect(pendingSpy).toHaveBeenNthCalledWith(2, ["testProp"], false);

    pendingSpy.mockRestore();
  });
});
