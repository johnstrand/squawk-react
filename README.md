# ![Logo](https://github.com/johnstrand/squawk-react/raw/master/docs/logo.png "Squawk React") squawk-react

![npm](https://img.shields.io/npm/v/squawk-react.svg?label=Latest%20stable)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![npm bundle size](https://img.shields.io/bundlephobia/minzip/squawk-react.svg)

A global state container library for React applications. Squawk is also compatible with React Native, so long as the underlying React version is up-to-date enough to support hooks.

[Find it on npm](https://www.npmjs.com/package/squawk-react)

Or just add it to your project with `npm i --save squawk-react`

Check out a simple [tutorial](./tutorial.md).

# API description

```typescript
function createStore<T>(globalState: T);

export const {
  action,
  get,
  pending,
  mutableAction,
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
function action(
  reducer: (value: TStore) => Promise<Partial<TStore>> | Partial<TStore>
): () => Promise<Readonly<TStore>>;
function action<T>(
  reducer: (
    value: TStore,
    payload: T
  ) => Promise<Partial<TStore>> | Partial<TStore>
): (payload: T) => Promise<Readonly<TStore>>;

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

1. takes a callback which will accept the current store state, and a value of a specified type, and returns either a `Partial<T>`, or a `Promise<Partial<T>>` of the global state.
2. takes a callback which will accept only the current store state, and returns either a `Partial<T>`, or a `Promise<Partial<T>>` of the global state.

If the action callback returns a promise it will be automatically awaited, and errors will be thrown as exceptions. As such, an action can be made async:

```typescript
const updateRemoteValue = action<Foo>(async (store, foo) => {
    const createdFoo = await fetch(...);

    return { foos: [store.foos, ...createdFoo] };
});
```

Regardless of whether an action callback is async or not, the action itself will return a promise that will be resolved with the updated global state when the callback finishes. As such, it may be used to monitor the progress of an action and show a loading indicator:

```typescript
<button
  onClick={async () => {
    setLoading(true);
    await updateRemoteValue(foo);
    setLoading(false);
  }}
>
  Save
</button>
```

It may also be used internally in an action to chain actions together in a sequence.

## mutableAction (New !)

Introduced with the 4.0 beta, mutableAction uses [immer](https://immerjs.github.io/immer/docs/introduction) to create actions that allow you to manipulate the global state as if it were a mutable object.

```typescript
function mutableAction(
  ...reducer: ((value: TStore) => Promise<void> | void)[]
): () => Promise<Readonly<TStore>>;
function mutableAction<T>(
  ...reducer: ((value: TStore, payload: T) => Promise<void> | void)[]
): (payload: T) => Promise<Readonly<TStore>>;

const updateProp = action<string>((store, payload) => {
  store.prop = payload;
});

const incrementProp = action(store => {
  store.someProp++;
});
```

Other than allowing for store mutations, it behaves identically to regular actions, with one exception: mutableAction accepts a variadic number of callbacks, and will execute them in sequence. This allows for creating several intermediary states in a longer process.

## A note on actions v.s. local state

Sometimes (a lot of the times), an app will require to use data sourced from some API, but the data will only be used in a single component (or its direct descendants). Such an example might be a component that displays related data to another data item. Using actions alone would require putting this data into the global store, which would needlessly crowd the global store and, with time, make it hard to understand how it all works together. The instinct should always be to place data in local state, and only hoist it to global state when it becomes necessary (i.e., a lot of different components, at different parts of the tree needs to access the data).

However, it is still preferable to keep components slim and avoid importing API proxy classes, or even worse, doing direct fetch requests. To simplify this handling, create interfaces for your API proxy classes, and then inject instances of them into the global state. That way, a component can, in a DI-ish fashion, simply ask the store for an API-class, and do its calls, without knowing anything about how or where it is implemented.

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

Updates one or more property values, by one of four ways. Two variants to handle when the new value depends on the previous value, and two variants that will simply overwrite the old value. Two variants that allow for updating more than one property, and two that only allows for updating a single property.

One use case for update is to update a property before an async action awaits an operation, such as clearing a list before re-populating.

## pending

```typescript
pending(prop, state);
pending([prop1, prop2], state);

pending(prop, true);
const value = await fetch(...);
update({ prop });
pending(prop, false);
```

Updates the pending state of the specified state property or properties. Squawk can handle multiple pending operations for the same prop.

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

# Version history

1.0 - First release, a purely event-driven architecture that extended all class-based React components

1.1 - Expanded the API, added support for fetching messages, event registrations for a specific component and made it possible to selectively unregister

1.2 - Better encapsulation to avoid clogging up the main namespace

1.3 - Added argument to the register method to ignore existing store value

1.4 - Version bump due to failing to publish the right version

1.5 - Added logging, and the ability to enable/disable it

1.6 - Removed the logging, because it wasn't very useful. Also added a HoC to handle lifecycle (subscribe, unsubscribe) automatically

1.7 - Mostly just formatting changes, also removed the example project

2.0 - Reworked architecture entirely, now uses a HoC that injects a tracker object with support for register, send, and get, and handles lifecycle entirely automatically.

2.1 - Added a global update method to use outside of components

2.2 - Massive API changes. Now uses the the verb "update" rather than "send" to clarify that we are no longer dealing with events, but rather updates to the global store. Several methods were also exposed to service classes. The HoC will now also forward props properly.

2.3 - Mainly bugfixes and clarifying some types

2.4 - Another re-write, this time the HoC will only receive a subscribe(prop) method, and all other methods are external

2.5 - Added a binder method, which allowed for binding a global state prop to a local one, assuming they had the same name. Added an experimental connect method for creating functional components with props bound to the global store. Also added support for "pure" events, store props with type never, that could be used to pass messages without a payload

2.6 - Added experimental support for a SquawkComponent-class that could be inherited, and would handle lifecycle methods and provide an internal subscribe method

2.7 - Bugfixes, as well as a bit smarter update logic

2.8 - Never published, would have contained a clever (read: insane) way of handling ambient contexts for subscribe calls inside components.

3.0 - (Original, beta only. Expanded on the above concept and added support for functional components. Basically re-implemented hooks, but poorly)

3.0 - (Actual) Introduced a Hooks-based architecture

3.1 - Introduced Action

3.2 - Introduced Action without parameters, usePending hook for monitoring props about to change, and also removed events

3.3 - Introduced awaitable Action, so that components may be notified when an action completes

3.4 - Bugfixes

3.5 - Introduced batched calls to pending

3.6 - Actions now return the new state once completed. Also converted dependencies to dev-dependencies. Reduces bundle size and prevents issues from squawk demanding a specific version of a library. This was primarily an issue with React Native.

# Events (deprecated)

**Events have been removed**

**The main issue with events is that it encourages components to talk directly to each other, rather than channeling all communication through the store. This leads to a more complex and less transparent architecture**
