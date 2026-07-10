import createStore from "../Squawk";

describe("Squawk update", () => {
  it("updates partial state correctly", () => {
    const store = createStore({
      prop1: "initial1",
      prop2: "initial2"
    });

    store.update({ prop1: "updated1" });

    expect(store.get()).toEqual({
      prop1: "updated1",
      prop2: "initial2"
    });
  });

  it("updates multiple properties correctly", () => {
    const store = createStore({
      prop1: "initial1",
      prop2: "initial2"
    });

    store.update({ prop1: "updated1", prop2: "updated2" });

    expect(store.get()).toEqual({
      prop1: "updated1",
      prop2: "updated2"
    });
  });

  it("ignores invalid update values", () => {
    const store = createStore({
      prop1: "initial1",
      prop2: "initial2"
    });

    store.update(null as any);
    expect(store.get()).toEqual({
      prop1: "initial1",
      prop2: "initial2"
    });

    store.update("string" as any);
    expect(store.get()).toEqual({
      prop1: "initial1",
      prop2: "initial2"
    });
  });
});
