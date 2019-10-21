# squawk-react

![npm](https://img.shields.io/npm/v/squawk-react.svg?label=Latest%20stable)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![npm bundle size](https://img.shields.io/bundlephobia/minzip/squawk-react.svg)

A simple support library for managing global state in React applications, with hooks! (insert pirate joke here)

# API description

```typescript
function createStore<T>(globalState: T);

export const {
    action,
    get,
    pending,
    subscribe,
    update,
    usePending,
    useSquawk
} = createStore<IAppState>({
    /* ... */
});
```

The type T describes the root object of the store, and the argument is the initial state.

Any time an event is referenced, it is one of the root properties of T (via keyof T).

The function returns an object with the following methods:

# Primary methods

## useSquawk

```typescript
useSquawk(...props)

const { myProp, myOtherProp } = useSquawk("myProp", "myOtherProp");
/*
..
*/
</*...*/ someProp={myProp} />
```

Sets up a hook for the specified properties, and returns an object with the current values. Also triggers an update whenever one or more properties are updated. This method is basically like a global useState, but there is no dispatch and the initializer accepts a list of properties to monitor.

## action

```typescript
action<TPayload>(reducer: (store: T, payload: TPayload) => Partial<T>)
action(reducer: (value: TStore) => Promise<Partial<TStore>> | Partial<TStore>)

const updateProp = action<string>((store, payload) => {
    return { prop: payload };
});

const incrementProp = action(store => {
    return { someProp: store.someProp + 1 };
});

/* ... */

updateProp("the new value");
incrementProp();
```

Creates a reusable action to update parts or all of the global state. The function has two variants:

1. takes a callback which will accept the current store state, and a value of a specified type, and returns either a Partial<T>, or a Promise<Partial<T>> of the global state.
2. takes a callback which will accept only the current store state, and returns either a Partial<T>, or a Promise<Partial<T>> of the global state.

If the action callback returns a promise it will be automatically awaited, and errors will be thrown as exceptions. As such, an action can be made async:

```typescript
const updateRemoteValue = action<Foo>(async (store, foo) => {
    const createdFoo = await fetch(...);

    return { foos: [store.foos, ...createdFoo] };
});
```

Regardless of whether an action callback is async or not, the action itself will return a promise that will be resolved when the callback finishes. As such, it may be used to monitor the progress of an action and show a loading indicator:

```typescript
<button
    onClick={async () => {
        setLoading(true);
        await updateRemoveValue(foo);
        setLoading(false);
    }}
>
    Save
</button>
```

It may also be used internally in an action to chain actions together in a sequence.

# Support methods

These methods exist to help with specific scenarios, and should be used in select places. Avoid using update in other places than actions, doing it directly in components can lead to a confusing architecture.

## update

```typescript
update(reducer);
update(key, value);
update(key, reducer);
update(value);

update(state => ({ myProp: state.myProp + 1, myOtherProp: true }));
update("myProp", 1);
update("myProp", myProp => myProp + 1);
update({ myProp: 1, myOtherProp: true });
```

Updates one or more property values, by one of four ways. Two variants to handle when the new value depends on the previous value, and two variaents that will simply overwrite the old value. Two variants that allow for updating more than one property, and two that only allows for updating a single property.

One use case for update is to update a property before an async action awaits an operation, such as clearing a list before re-populating.

## pending

```typescript
pending(prop, state);

pending(prop, true);
const value = await fetch(...);
update({ prop });
pending(prop, false);
```

Updates the pending state of the specified state property. Squawk can handle multiple pending operations for the same prop.

## usePending

```typescript
usePending(prop);

const myPropLoading = usePending("myProp");
```

Sets up a hook for the pending state of the specified property, and returns true if the number of pending operations is greater than 0.

# Legacy methods

These methods should generally not be used, they are a remnant from before actions were introduced.

## get

```typescript
get(prop);
get();

const value = get("myProp");
const store = get();
```

Fetches the current value of the specified state property, or the entire global state. Be careful with doing modifications, or risk the wrath of the ghost of references past.

## subscribe

```typescript
subscribe(prop, callback);

const unsubMyEvent = subscribe("myProp", value => {
    /* ... */
});
/*
...
*/
unsubMyEvent();
```

Creates a subscription for changes to the the specified state property, invoking the callback with the new value on change. The method returns a function which may later be used to cancel the subscription.

This is used for global service classes, and for class-based components. (Always remember to clean up your subscriptions when your component unmounts)

# Events (deprecated)

**Events have been removed**

**The main issue with events is that it encourages components to talk directly to each other, rather than channeling all communication through the store. This leads to a more complex and less transparent architecture**
