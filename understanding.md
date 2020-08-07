# The basics of Squawk

So, you want to understand, in a nutshell, how Squawk works? This is going to be a simplified version, but it is enough to understand the basics of how it works.

[Here is a Code Sandbox with the latest iteration of the code](https://codesandbox.io/s/loving-heisenberg-qhp0v)

So, let's start simple, and define our createStore method. Due to how Squawk works, we require the store value to be an object, even if will only hold a single value. Due to a shortcut we want to take, we want the user to specify ALL of the store values (even if they happen to start out as undefined) when they create the store.

## Checkpoint 1

```typescript
function createStore<TStore extends {}>(initialState: Required<TStore>) {}
```

Now, we'll add the 3 main methods: update, get, and subscribe (note: Squawk discourages using any of these, and instead relying on hooks and actions, but the goal here is a more basic understanding rather than production ready code).

We also define a type, `StoreProp`, as matching the keys of the store type. So, if the store type is

```typescript
{
  foo: number;
  bar: string;
}
```

then StoreProp will be `"foo" | "bar"`.

## Checkpoint 2

```typescript
function createStore<TStore extends {}>(initialState: Required<TStore>) {
  type StoreProp = keyof TStore;

  let globalState = { ...initialState };

  return {
    update(values: Partial<TStore>) {
      // Merge current global state with whatever values were supplied
      globalState = { ...globalState, ...values };
    },
    get() {
      return { ...globalState };
    },
    subscribe<TContext extends StoreProp>(callback: (values: TStore) => void, ...contexts: TContext[]) {}
  };
}
```

The `update` method accepts a partial store value, and merges the current store values with the new values, overwriting as necessary. The `subscribe` method is left empty for now.

Moving on, we tire of writing `Required<TStore>` everywhere, so we change `TStore` to `T`, and then add `type TStore = typeof initialState;` This way, we'll have the same type definitions as before, but we won't have to wrap `TStore` in `Required<>` everywhere.

We also add a Map to track subscribers for each property:

```typescript
const subscribers = new Map<StoreProp, Set<(state: TStore) => void>>();
// Object.keys couldn't care less what the source type is, the return value will
// always be typed as "string" | "number" | "Symbol" and then complain that that
// type can't be converted to StoreProp, so just make an explicit type assertion
// Note here that I don't say type conversion. Unlike other languages, TypeScript
// CANNOT affect the underlying type; type assertions is basically just a promise
// to the transpiler that "I pinky swear that this variable is of this type"
for (const key of Object.keys(initialState) as StoreProp[]) {
  subscribers.set(key, new Set());
}
```

This way, we don't have to check that the `subscribers` Map contains a key corresponding to a property everytime we need to access it.

And now, our createStore looks like this:

## Checkpoint 3

```typescript
function createStore<T extends {}>(initialState: Required<T>) {
  type TStore = typeof initialState;
  type StoreProp = keyof TStore;

  let globalState = { ...initialState };

  const subscribers = new Map<StoreProp, Set<(state: TStore) => void>>();
  for (const key of Object.keys(initialState) as StoreProp[]) {
    subscribers.set(key, new Set());
  }

  return {
    update(values: Partial<TStore>) {
      globalState = { ...globalState, ...values };
    },
    get() {
      return { ...globalState };
    },
    subscribe<TContext extends StoreProp>(callback: TStore, ...contexts: TContext[]) {}
  };
}
```

There's no use in tracking subscribers, if we don't actually add any to the list, so we need to implement the subscribe method to do just that:

```typescript
const _contexts = [...contexts];
_contexts.forEach((context) => subscribers.get(context)!.add(callback));
return () => _contexts.forEach((context) => subscribers.get(context)!.delete(callback));
```

First, we clone the supplied context array, this is done so that if the caller modifies the array later, we won't be affected by the changes. Then, for each supplied context, we fetch the matching set and add the supplied subscriber callback.

Finally, we return a method that reverts all the added subscribers, effectively removing all subscriptions. The fact that this is done via a returned callback rather than an explicit `unsubscribe` call is done both for practial reasons, but also because it neatly matches how React's `useEffect` works.

## Checkpoint 4

```typescript
function createStore<T extends {}>(initialState: Required<T>) {
  type TStore = typeof initialState;
  type StoreProp = keyof TStore;

  let globalState = { ...initialState };

  const subscribers = new Map<StoreProp, Set<(state: TStore) => void>>();
  for (const key of Object.keys(initialState) as StoreProp[]) {
    subscribers.set(key, new Set());
  }

  return {
    update(values: Partial<TStore>) {
      globalState = { ...globalState, ...values };
    },
    get() {
      return { ...globalState };
    },
    subscribe<TContext extends StoreProp>(callback: (state: TStore) => void, ...contexts: TContext[]) {
      const _contexts = [...contexts];
      _contexts.forEach((context) => subscribers.get(context)!.add(callback));
      return () => _contexts.forEach((context) => subscribers.get(context)!.delete(callback));
    }
  };
}
```

So, we have reached the point where we can subscribe to changes, but no subscribers are actually notified of changes. Let's fix this. First, we get tired of writing `(state: TStore) => void` everywhere, so we add a type alias `type Callback = (state: TStore) => void;`

Second, we add a bit of code to the update method:

```typescript
const affectedContexts = Object.keys(values) as StoreProp[];
const invokedCallbacks = new Set<Callback>();
const invokeEach = (subscriber: Callback) => {
  if (invokedCallbacks.has(subscriber)) {
    return;
  }
  invokedCallbacks.add(subscriber);
  subscriber(globalState);
};
for (const context of affectedContexts) {
  subscribers.get(context)!.forEach(invokeEach);
}
```

First, we extract from the supplied values the properties it contains. This will be the properties (or contexts) that have been affected by the update, and whose subscribers should be notified.

Then, we create a Set to track which callbacks have been invoked. Let's say we have a component that subscribes to changes in `Foo` and `Bar`. If both those properties are updated at the same time, we only want to call that callback once.

We then iterate over the affected contexts, find their callbacks and, via the `invokeEach` method ensures that each callback is invoked once and only once.

## Checkpoint 5

```typescript
function createStore<T extends {}>(initialState: Required<T>) {
  type TStore = typeof initialState;
  type StoreProp = keyof TStore;
  type Callback = (state: TStore) => void;

  let globalState = { ...initialState };

  const subscribers = new Map<StoreProp, Set<Callback>>();
  for (const key of Object.keys(initialState) as StoreProp[]) {
    subscribers.set(key, new Set());
  }

  return {
    update(values: Partial<TStore>) {
      globalState = { ...globalState, ...values };
      const affectedContexts = Object.keys(values) as StoreProp[];
      const invokedCallbacks = new Set<Callback>();
      const invokeEach = (subscriber: Callback) => {
        if (invokedCallbacks.has(subscriber)) {
          return;
        }
        invokedCallbacks.add(subscriber);
        subscriber(globalState);
      };
      for (const context of affectedContexts) {
        subscribers.get(context)!.forEach(invokeEach);
      }
    },
    get() {
      return { ...globalState };
    },
    subscribe<TContext extends StoreProp>(callback: Callback, ...contexts: TContext[]) {
      const _contexts = [...contexts];
      _contexts.forEach((context) => subscribers.get(context)!.add(callback));
      return () => _contexts.forEach((context) => subscribers.get(context)!.delete(callback));
    }
  };
}
```

At this point, we are in a position to actually use the store, so let's create a store object with the value `{ count : 0 }`

```typescript
const store = createStore({ count: 0 });
```

Then, we create a component to display the value, and we grab the current value to use as initialize for `React.useState`. Currently, our state manager doesn't have any React bindings, and the React application will have to ensure that re-renders are triggered as necessary.

```tsx
const Counter = () => {
  const [count, setCount] = React.useState(store.get().count);

  return <div>Count: {count}</div>;
};
```

Never the less, we would like to react to changes, so we'll import `React.useEffect`, and adding

```typescript
React.useEffect(() => {
  return store.subscribe((store) => setCount(store.count), "count");
}, []);
```

we ensure that not only will the state update whenever the global state updates, the subscription will be removed when the component unmounts. This leaves us with a `Counter` component looking like this:

```tsx
const Counter = () => {
  const [count, setCount] = React.useState(store.get().count);

  React.useEffect(() => {
    return store.subscribe((store) => setCount(store.count), "count");
  }, []);

  return <div>Count: {count}</div>;
};
```

We would also like to be able to update the store, so let's create an `Increment` component like so:

```tsx
const Increment = () => {
  const increment = () => {
    store.update({ count: store.get().count + 1 });
  };
  return <button onClick={increment}>Increment</button>;
};
```

Every time the button is clicked, the store is updated. However, this has a drawback. The value derived from `store.get().count` might be stale by the time the update actually triggers, and that will cause issues. Also, it's pretty tedious to repeat that bit of code if other components need to update the same value.

We could have changes the update to supply the current store value, so that the same update call would have been:

```typescript
store.update({ count } => ({ count: count + 1 }));
```

and while that would work, it would have the same issue with sharing code. Instead, let us introduce our old friend the `Action`. These are prewrapped custom bits of logic to handle store updates:

We start by adding a type

```typescript
type StoreAction<TArg extends unknown[]> = (store: TStore, ...args: TArg) => Partial<TStore> | undefined;
```

This type basically clones a function definition, and allows us to create a proxy function with parameters with the same names and types as the original. This type says that a store action should take one parameter of the same type as the store, and then 0..n parameters of not-yet-known types, and it will return a partial store value, or undefined.

Then, implementing the actual `action` function like so:

```typescript
action<TArg extends unknown[]>(resolver: StoreAction<TArg>) {
  return (...args: TArg) => {
    const value = resolver(globalState, ...args);
    if (value) {
      this.update(value);
    }
    return globalState;
  };
}
```

This returns a method with the same arguments as the supplied method, minus the first (the store). When the returned method is invoked, the wrapped method will be supplied with the current global state, as well as whatever arguments are supplied when it was called.

If the method then returns a value (rather than undefined), that value will then be used to update the global state (and ensure that affected subscribers are invoked).

## Checkpoint 6

```typescript
function createStore<T extends {}>(initialState: Required<T>) {
  type TStore = typeof initialState;
  type StoreProp = keyof TStore;
  type Callback = (state: TStore) => void;
  type StoreAction<TArg extends unknown[]> = (store: TStore, ...args: TArg) => Partial<TStore> | undefined;

  let globalState = { ...initialState };

  const subscribers = new Map<StoreProp, Set<Callback>>();
  for (const key of Object.keys(initialState) as StoreProp[]) {
    subscribers.set(key, new Set());
  }

  return {
    action<TArg extends unknown[]>(resolver: StoreAction<TArg>) {
      return (...args: TArg) => {
        const value = resolver(globalState, ...args);
        if (value) {
          this.update(value);
        }
        return globalState;
      };
    },
    update(values: Partial<TStore>) {
      globalState = { ...globalState, ...values };
      const affectedContexts = Object.keys(values) as StoreProp[];
      const invokedCallbacks = new Set<Callback>();
      const invokeEach = (subscriber: Callback) => {
        if (invokedCallbacks.has(subscriber)) {
          return;
        }
        invokedCallbacks.add(subscriber);
        subscriber(globalState);
      };
      for (const context of affectedContexts) {
        subscribers.get(context)!.forEach(invokeEach);
      }
    },
    get() {
      return { ...globalState };
    },
    subscribe<TContext extends StoreProp>(callback: Callback, ...contexts: TContext[]) {
      const _contexts = [...contexts];
      _contexts.forEach((context) => subscribers.get(context)!.add(callback));
      return () => _contexts.forEach((context) => subscribers.get(context)!.delete(callback));
    }
  };
}
```

This way, a "global" `increment` method can be implemented as such:

```typescript
const increment = store.action((state) => {
  return { count: state.count + 1 };
});
```

And the `Increment` component can be changed to this:

```tsx
const Increment = () => {
  return <button onClick={increment}>Increment</button>;
};
```

"But wait", you say, "I want to have async actions". "Ok", says I, here's how to do that:

Update the `StoreAction` type to this:

```typescript
type StoreAction<TArg extends unknown[]> = (store: TStore, ...args: TArg) => Partial<TStore> | Promise<Partial<TStore>> | undefined;
```

and then change

```typescript
return (...args: TArg) => {
```

and

```typescript
const value = resolver(globalState, ...args);
```

to

```typescript
return async (...args: TArg) => {
```

and

```typescript
const value = await Promise.resolve(resolver(globalState, ...args));
```

## Checkpoint 7

```typescript
function createStore<T extends {}>(initialState: Required<T>) {
  type TStore = typeof initialState;
  type StoreProp = keyof TStore;
  type Callback = (state: TStore) => void;
  type StoreAction<TArg extends unknown[]> = (store: TStore, ...args: TArg) => Partial<TStore> | Promise<Partial<TStore>> | undefined;

  let globalState = { ...initialState };

  const subscribers = new Map<StoreProp, Set<Callback>>();
  for (const key of Object.keys(initialState) as StoreProp[]) {
    subscribers.set(key, new Set());
  }

  return {
    action<TArg extends unknown[]>(resolver: StoreAction<TArg>) {
      return async (...args: TArg) => {
        const value = await Promise.resolve(resolver(globalState, ...args));
        if (value) {
          this.update(value);
        }
        return globalState;
      };
    },
    update(values: Partial<TStore>) {
      globalState = { ...globalState, ...values };
      const affectedContexts = Object.keys(values) as StoreProp[];
      const invokedCallbacks = new Set<Callback>();
      const invokeEach = (subscriber: Callback) => {
        if (invokedCallbacks.has(subscriber)) {
          return;
        }
        invokedCallbacks.add(subscriber);
        subscriber(globalState);
      };
      for (const context of affectedContexts) {
        subscribers.get(context)!.forEach(invokeEach);
      }
    },
    get() {
      return { ...globalState };
    },
    subscribe<TContext extends StoreProp>(callback: Callback, ...contexts: TContext[]) {
      const _contexts = [...contexts];
      _contexts.forEach((context) => subscribers.get(context)!.add(callback));
      return () => _contexts.forEach((context) => subscribers.get(context)!.delete(callback));
    }
  };
}
```

# React Bindings

"This is all good and well", you say, "but I want React bindings. I don't want to keep mucking with local state like some sort of cave man, I want all of this to work through magic". So, let's sprinkle a bit React magic on top of it all.

For the next step, I refer you to [this Sandbox](https://codesandbox.io/s/elegant-haze-01xo2), as I've changed a few things when adding the React hook.

Here is our very own useState method (normally, I'd recommend naming it anything but something that could collide with built-in React names, but this is just a demo)

```typescript
useState<TContext extends StoreProp>(...contexts: TContext[]) {
  // Initialize local state from global state
  const [localState, setLocalState] = React.useState(globalState);
  // Copy supplied contexts to a reference. Why? Because each time the component
  // renders, the array inside contexts will be redefined, and if we then refer
  // to it inside useEffect, we must add it to the dependency array, and useEffect
  // will be called every time. Since we don't care if the content of the array
  // changes (and it really shouldn't), we capture the first one we see and re-use it
  const _contexts = React.useRef(contexts);

  React.useEffect(() => {
    // Create a subscription for each supplied context and then return the callback
    // so that useEffect will clean things up for us
    return this.subscribe(
      (state) => setLocalState(state),
      ..._contexts.current
    );
  }, []);

  // Why cast the state as a Pick type, when it actually contains all props?
  // Well, we don't care if the caller should happen to access any of the other
  // props, but we want to make it clear that the component will NOT re-render
  // if they change
  return localState as Pick<TStore, TContext>;
}
```

## Checkpoint 8

```typescript
function createStore<T extends {}>(initialState: Required<T>) {
  type TStore = typeof initialState;
  type StoreProp = keyof TStore;
  type Callback = (state: TStore) => void;
  type StoreAction<TArg extends unknown[]> = (store: TStore, ...args: TArg) => Partial<TStore> | Promise<Partial<TStore>> | undefined;

  let globalState = { ...initialState };

  const subscribers = new Map<StoreProp, Set<Callback>>();
  for (const key of Object.keys(initialState) as StoreProp[]) {
    subscribers.set(key, new Set());
  }

  return {
    action<TArg extends unknown[]>(resolver: StoreAction<TArg>) {
      return async (...args: TArg) => {
        const value = await Promise.resolve(resolver(globalState, ...args));
        if (value) {
          this.update(value);
        }
        return globalState;
      };
    },
    update(values: Partial<TStore>) {
      globalState = { ...globalState, ...values };
      const affectedContexts = Object.keys(values) as StoreProp[];
      const invokedCallbacks = new Set<Callback>();
      const invokeEach = (subscriber: Callback) => {
        if (invokedCallbacks.has(subscriber)) {
          return;
        }
        invokedCallbacks.add(subscriber);
        subscriber(globalState);
      };
      for (const context of affectedContexts) {
        subscribers.get(context)!.forEach(invokeEach);
      }
    },
    get() {
      return { ...globalState };
    },
    subscribe<TContext extends StoreProp>(callback: Callback, ...contexts: TContext[]) {
      const _contexts = [...contexts];
      _contexts.forEach((context) => subscribers.get(context)!.add(callback));
      return () => _contexts.forEach((context) => subscribers.get(context)!.delete(callback));
    },
    useState<TContext extends StoreProp>(...contexts: TContext[]) {
      const [localState, setLocalState] = React.useState(globalState);
      const _contexts = React.useRef(contexts);

      React.useEffect(() => {
        return this.subscribe((state) => setLocalState(state), ..._contexts.current);
      }, []);

      return localState as Pick<TStore, TContext>;
    }
  };
}
```

Having done this, the `Counter` component can now be changed to this:

```tsx
const Counter = () => {
  const { count } = store.useState("count");

  return <div>Count: {count}</div>;
};
```
