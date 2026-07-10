import createStore from "./src/Squawk";

const store = createStore({ foo: 1, bar: "test" });

let callCount = 0;
const cb = (val: any) => { callCount++; };

// Subscribe many callbacks
for (let i = 0; i < 10000; i++) {
  store.subscribe("foo", cb);
}

const start = Date.now();

for (let i = 0; i < 1000; i++) {
  store.update({ foo: i });
}

const end = Date.now();

console.log(`Call count: ${callCount}`);
console.log(`Time taken: ${end - start}ms`);
