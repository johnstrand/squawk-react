import createStore from "../Squawk";

describe("Squawk", () => {
  describe("get()", () => {
    it("returns the correct initial state", () => {
      const initialState = { foo: "bar", count: 0 };
      const store = createStore(initialState);

      expect(store.get()).toEqual(initialState);
    });

    it("returns the correct state after an update", () => {
      const store = createStore({ foo: "bar", count: 0 });

      store.update({ count: 1 });

      expect(store.get()).toEqual({ foo: "bar", count: 1 });
    });
  });
});
