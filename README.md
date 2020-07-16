# ![Logo](https://github.com/johnstrand/squawk-react/raw/master/docs/logo.png "Squawk React") squawk-react

![npm](https://img.shields.io/npm/v/squawk-react.svg?label=Latest%20stable)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![npm bundle size](https://img.shields.io/bundlephobia/minzip/squawk-react.svg)

A simple support library for managing global state in React applications, with hooks! (insert pirate joke here). Squawk is also compatible with React Native, so long as the underlying React version is up-to-date enough to support hooks.

**New**: Squawk also features an integration with Redux Dev Tools, and supports time-travelling.

**Note**: Starting with 4.0, Squawk targets ES2017. If you have to support a browser that doesn't support ES2017, you'll have to use appropriate polyfills.

## [Find it on npm](https://www.npmjs.com/package/squawk-react)

Or just add it to your project with `npm i --save squawk-react`

## Check out a simple [tutorial](./tutorial.md).

# API description

```typescript
function createStore<T>(globalState: T, useReduxDevTools: boolean = false);

export const { action, get, pending, subscribe, update, usePending, useSquawk } = createStore<IAppState>(
  {
    /* ... */
  },
  true | false
);
```

The type T describes the root object of the store, and the first argument is the initial state. The second argument toggles integration with Redux Dev Tools

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
action(reducer: (store: T, ...payload: any[]) => Promise<Partial<TStore>> | Partial<TStore>)

const updateProp = action((store, payload: string) => {
    return { prop: payload };
});

const updateTwoProps = action((store, payload1: number, payload2: string) => {
  return { prop1: payload1, prop2: payload2 };
})

const incrementProp = action(store => {
    return { someProp: store.someProp + 1 };
});

/* ... */

updateProp("the new value");
incrementProp();
```

Creates a reusable action to update parts or all of the global state. The first parameter passed in will always be the current state, followed by 0 to many optional parameters. The returned action will copy the parameters and their types from the reducer, and have an identical signature.

_Note: Earlier version required the user to create an object to pass more than one parameter, this new version allows for an arbitrary number of parameters_

If the action callback returns a promise it will be automatically awaited, and errors will be thrown as exceptions. As such, an action can be made async:

```typescript
const updateRemoteValue = action(async (store, foo: Foo) => {
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

## A note on actions v.s. local state

Sometimes (a lot of the times), an app will require to use data sourced from some API, but the data will only be used in a single component (or its direct descendants). Such an example might be a component that displays related data to another data item. Using actions alone would require putting this data into the global store, which would needlessly crowd the global store and, with time, make it hard to understand how it all works together. The instinct should always be to place data in local state, and only hoist it to global state when it becomes necessary (i.e., a lot of different components, at different parts of the tree needs to access the data).

However, it is still preferable to keep components slim and avoid importing API proxy classes, or even worse, doing direct fetch requests. To simplify this handling, create interfaces for your API proxy classes, and then inject instances of them into the global state. That way, a component can, in a DI-ish fashion, simply ask the store for an API-class, and do its calls, without knowing anything about how or where it is implemented.

# Support methods

These methods exist to help with specific scenarios, and should be used in select places. Avoid using update in other places than actions, doing it directly in components can lead to a confusing architecture.

## update

```typescript
update(value);

update({ myProp: 1, myOtherProp: true });
```

Updates one or more property values, by either replacing all or parts of the current state in a single operation.

One use case for update is to update a property before an async action awaits an operation, such as clearing a list before re-populating. Normally, all state updates should happen through actions, but sometimes there's a need to update the store while an action is executing.

**Note: There were previously 3 other variants to update, they have been deprecated and removed. Use actions to cover those use-cases instead**

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

const unsubMyEvent = subscribe("myProp", (value) => {
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

3.7 - Bugfixes

3.8 - Reworked the useSquawk method somewhat. Also added Redux Dev Tools integration

3.9 - Reworked action signature, as well as some performance improvements

4.0 - Changed ES target to ES2017, to generate more clean code

# Events (deprecated)

**Events have been removed**

**The main issue with events is that it encourages components to talk directly to each other, rather than channeling all communication through the store. This leads to a more complex and less transparent architecture**
