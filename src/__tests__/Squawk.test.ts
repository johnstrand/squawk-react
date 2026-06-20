import createStore from "../Squawk";

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
