# squawk-react
![npm](https://img.shields.io/npm/v/squawk-react.svg?label=Latest%20stable)
![npm (tag)](https://img.shields.io/npm/v/squawk-react/beta.svg?label=Latest%20beta)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![npm bundle size](https://img.shields.io/bundlephobia/minzip/squawk-react.svg)

A simple support library for managing global state in React applications.

Changes in 3.0:
* Squawk is now based on React Hooks
* subscribe now returns an unsubscribe method, rather than a component name

Using this starts by creating a store:

```typescript
function createStore<T>(initalState: T)

export const { get, subscribe, update, useSquawk } = createStore<IAppState>({ /* ... */ })
```

The type T describes the root object of the store, and the argument is the initial state. 

Any time an event is referenced, it is one of the root properties of T (via keyof T). 

The function returns an object with the following methods:

## get

```typescript
get(event)

const value = get("myEvent");
```

Fetches the current value of the specified event.

## subscribe

```typescript
subscribe(event, callback)

const unsubMyEvent = subscribe("myEvent", value => { /* ... */ });
/*
...
*/
unsubMyEvent();
```

Creates a subscription for the specified event, invoking the callback with the new value whenver the event is invoked. The method returns a function which may later be used to cancel the subscription.

This is used for global service classes, and for class-based components. (Always remember to clean up your subscriptions when your component unmounts)

## update

```typescript
update(event, reducer)
update(event, value)

update("myEvent", value => value + 1);
update("myEvent", value);
```

Updates the event value via a reducer, or via a direct value. The reducer receives the current value of the event and is expected to return the new value.

The value is only passed on to the subscribers if it has changed (or is undefined), so in the case of reference types, make sure to create a new object rather than mutating the existing one.

## useSquawk

```typescript
useSquawk(event)

const [value, updateValue] = useSquawk("myEvent")
/*
..
*/
</*...*/ onSomeEvent=>{() => updateValue(value + 1)}
```

Sets up a hook for the specified context, and returns the current value and an update method. This works like useState, but is hooked into the global state
