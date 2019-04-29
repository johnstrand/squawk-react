# squawk-react
[![npm](https://img.shields.io/npm/v/squawk-react.svg)](https://www.npmjs.com/package/squawk-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple support library to insert message passing capabilities into React applications.

Changes in 3.0:
* squawk now handles both class and function components
* subscribe is an ambient method now, much like useState in React Hooks
* SquawkComponent class has been removed
* unsubscribe() has been removed
* subscribe now returns an unsubscribe method, rather than a component name



Unlike Flux-based implementations, squawk does not handle automatic injection via properties, but instead expects each component to track it's own state (and update it via the global state as needed)

While this duplicates code, it also leads to a more easily understood structure

Using this starts by creating a store:

```typescript
function createStore<T>(initalState: T)

export const { get, subscribe, update, squawk } = createStore<IAppState>({ /* ... */ })
```

The type T describes the root object of the store, and the argument is the initial state. 

Any time an event is referenced, it is one of the root properties of T (via keyof T). Squawk also handles events without data, by adding a property of type never to the type T.

The function returns an object with the following methods:

## get

```typescript
get(event)

const value = get("myEvent");
```

Fetches the current value of the specified event. If called from within the body of a function component, it will set up a subscription so that the component is re-rendered when the value changes

## subscribe

```typescript
subscribe(event, callback)

const unsubMyEvent = subscribe("myEvent", value => { /* ... */ });
/*
...
*/
unsubMyEvent();
```

Creates a subscription for the specified event, invoking the callback with the new value whenver the event is invoked. The method returns a function which may later be used to cancel the subscription. For events without payload, value will have type never and the value undefined.

If called from componentDidMount in a class component, subscribe will automaticall bind to the components life cycle and all subscriptions will be removed when the component is unmounted. As such, there is no need to call the unsubscribe-callback manually (though doing so is a noop)

## update

```typescript
update(event, reducer)

update("myEvent", value => value + 1);
update("myEventWithoutValue");
```

Updates the event value via a reducer. The reducer receives the current value of the event and is expected to return the new value.

The value is only passed on to the subscribers if it has changed (or is undefined), so in the case of reference types, make sure to create a new object rather than mutating the existing one.

For events without value, the update method requires only an event name, and the reducer should be omitted.

## squawk

```typescript
squawk(React.ComponentType)
```

The squawk method creates a HoC that wraps the specified component. It expects a class component type, and can use the ambient subscribe method. The subscribe method may be called in the constructor or in componentDidMount, though it is advisable to only do so in componentDidMount. It follows the life cycle of the wrapping component, and clears all subscriptions when the component unmounts.

Using the method could look something like this
```typescript
class MyComponent extends React.Component {
    render() {
        // ...
    }

    componentDidMount() {
        subscribe("myEvent", value => this.setState({ value }));
    }
});

export default squawk(MyComponent);
```

or

```typescript
const MyComponent = () => {
    const myValue = get("myEvent");
    return (/* ... */);
};

export default squawk(MyComponent);
```

There is a sample application available at https://johnstrand.github.io/squawk/build/index.html. (Not yet updated for 3.0)