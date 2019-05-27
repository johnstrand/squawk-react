# squawk-react
![npm](https://img.shields.io/npm/v/squawk-react.svg?label=Latest%20stable)
![npm (tag)](https://img.shields.io/npm/v/squawk-react/beta.svg?label=Latest%20beta)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![npm bundle size](https://img.shields.io/bundlephobia/minzip/squawk-react.svg)

A simple support library for managing global state in React applications, with hooks! (insert pirate joke here)


# API description

```typescript
function createStore<T, EventProps extends string = never>(globalState: T)

export const { event, get, onEvent, subscribe, update, useEvent, useSquawk } = createStore<IAppState, "updateValue" | "valueUpdated">({ /* ... */ })
```

The type T describes the root object of the store, and the argument is the initial state. 

Any time an event is referenced, it is one of the root properties of T (via keyof T). 

The function returns an object with the following methods:

## get

```typescript
get(prop)

const value = get("myProp");
```

Fetches the current value of the specified state property.

## subscribe

```typescript
subscribe(prop, callback)

const unsubMyEvent = subscribe("myProp", value => { /* ... */ });
/*
...
*/
unsubMyEvent();
```

Creates a subscription for changes to the the specified state property, invoking the callback with the new value on change. The method returns a function which may later be used to cancel the subscription.

This is used for global service classes, and for class-based components. (Always remember to clean up your subscriptions when your component unmounts)

## update

```typescript
update(reducer)
update(key, value)
update(key, reducer)
update(value)

update(state => ({ myProp: state.myProp + 1, myOtherProp: true }));
update("myProp", 1);
update("myProp", myProp => myProp + 1);
update({ myProp: 1, myOtherProp: true });
```

Updates one or more property values, by one of four ways. Two variants to handle when the new value depends on the previous value, and two variaents that will simply overwrite the old value. Two variants that allow for updating more than one property, and two that only allows for updating a single property.

## useSquawk

```typescript
useSquawk(...props)

const [state, dispatch] = useSquawk("myProp", "myOtherProp");
/*
..
*/
</*...*/ onSomeEvent=>{() => dispatch({ myProp: state.myProp + 1 })} />
```

Sets up a hook for the specified properties, and returns the current value and an update method. This works like useState, but is hooked into the global state

# Events
Events are much like the props above, except that they don't have a value, only a name. These are basically here to notify the rest of the application that something has happened, without attaching data to it.

## event (New)

```typescript
event(event)

event("myEvent")
```

Dispatches an event for anyone listening

## onEvent (New)

```typescript
onEvent(event, callback)

onEvent("myEvent", () => { /* ... */ })
```

Invokes a callback when an event occurs. This is the equivalent of subscribe, but separated to make it clear that this is an event and not an updated value

## useEvent (New)

```typescript
useEvent(event, callback)

useEvent("myEvent", () => { /* ... */ })
```

Exactly like onEvent above, except to be used inside functional components