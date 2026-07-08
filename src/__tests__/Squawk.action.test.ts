import createStore from "../Squawk";

describe("Squawk action", () => {
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
