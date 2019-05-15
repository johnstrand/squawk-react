# squawk-react
![npm](https://img.shields.io/npm/v/squawk-react.svg?label=Latest%20stable)
![npm (tag)](https://img.shields.io/npm/v/squawk-react/beta.svg?label=Latest%20beta)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![npm bundle size](https://img.shields.io/bundlephobia/minzip/squawk-react.svg)

A simple support library for managing global state in React applications.

Changes in 3.0:
* Squawk is now based on React Hooks
* subscribe now returns an unsubscribe function, rather than a component name
* Significant rewrite of entire architecture

# A bit of theory

We start by defining a global state (state<sub>G</sub>). This state is a basic JavaScript-object:

state<sub>G</sub> &larr; createStore(initial)

Then, each component gets to define its own local state (state<sub>L</sub>), and a local reducer function (reducer<sub>L</sub>) to derive state<sub>L</sub> from state<sub>G</sub>. The reducer function is defined as:

reducer<sub>L</sub> &larr; state<sub>G</sub> &rArr; state<sub>L</sub>

So that:

( state<sub>L</sub>, dispatch<sub>L</sub> ) &larr; useSquawk(reducer)

When useSquawk is called, the following happens:
* Initial state<sub>L</sub> is derived, and used to set up useReducer, which returns a tuple of ( state<sub>L</sub>, dispatch<sub>internal</sub> )
* For each property in the state<sub>L</sub>, a subscription is created, with the the following callback:

state<sub>G</sub> &rArr; dispatch<sub>internal</sub> ( reducer<sub>L</sub> ( state<sub>G</sub> ) )

The subscription is created in a useEffect-scope, and returns an unsubscribe function, which in turn makes sure that subscriptions are cancelled when the component is unmounted

This makes sure that once state<sub>G</sub> is updated, each affected component is notified and can derive a new state<sub>L</sub>.

The return value is a tuple with the state<sub>L</sub> derived from state<sub>G</sub>, and a dispatch function for updating state<sub>G</sub>. The dispatcher is defined as:

dispatcher &larr; state<sub>U</sub> &rArr; &empty;, where state<sub>U</sub> is the set of values to be updated, and is a subset of state<sub>L</sub>.

When the dispatcher is invoked, the following happens:
* Each property name from the update value is extracted
* A list of unique subscriber IDs is extracted using the list above
* State<sub>G</sub> is updated by merging the current state and the submitted value(s)
* Each subscriber (per unique ID) is invoked, receiving state<sub>G</sub>
* Via the mechanism described above, each component derives a new state<sub>L</sub> and the component updates

# API description

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
update(reducer)

update(state => { myEvent: state.myEvent + 1 });
```

Updates the event value via a reducer.

## useSquawk

```typescript
useSquawk(event)

const [state, dispatch] = useSquawk(globalState => { value: globalState.value });
/*
..
*/
</*...*/ onSomeEvent=>{() => dispatch({ value: state.value + 1 })} />
```

Sets up a hook for the specified context, and returns the current value and an update method. This works like useState, but is hooked into the global state
