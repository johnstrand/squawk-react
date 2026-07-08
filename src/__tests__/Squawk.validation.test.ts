import createStore from "../Squawk";

describe("Squawk", () => {
  describe("createStore validation", () => {
    it("throws error when initial state is null", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => createStore(null)).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is undefined", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => createStore(undefined)).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is an array", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => createStore([])).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is a number", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => createStore(1)).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is a string", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => createStore("string")).toThrow("Root store value must be an object");
    });

    it("throws error when initial state is a boolean", () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => createStore(true)).toThrow("Root store value must be an object");
    });

    it("creates store with valid initial state", () => {
      const store = createStore({ foo: "bar" });
      expect(store).toBeDefined();
      expect(store.get()).toEqual({ foo: "bar" });
    });
  });
});
