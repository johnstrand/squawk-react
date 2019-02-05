# squawk-react
A simple support library to insert message passing capabilities into React applications.

Note: The architecture is rewritten with squawk-react 2.0

Unlike Flux-based implementations, squawk does not handle automatic injection via properties, but instead expects each component to track it's own state (and update it via the global state as needed)

While this duplicates code, it also leads to a more easily understood structure

Using this starts by creating a store:

```typescript
function createStore<T>(initalState: T)

export const { get, subscribe, unsubscribe, update, squawk } = createStore<IAppState>({ /* ... */ })
```

The type T describes the root object of the store, and the argument is the initial state. 

Any time an event is referenced, it is one of the root properties of T (via keyof T)

The function returns an object with 5 methods:

## get

```typescript
get(event)

const value = get("myEvent");
```

Fetches the current value of the specified event.
## subscribe

```typescript
subscribe(event, callback)

const id = subscribe("myEvent", value => { /* ... */ });
```

Creates a subscription for the specified event, invoking the callback with the new value whenver the event is invoked. The method returns a random name which can later be used to cancel the subscription.

## unsubscribe

```typescript
unsubscribe(subscriber)

unsubscribe(id);
```

Removes the specified subscription.

## update

```typescript
update(event, reducer)

update("myEvent", value => value + 1);
```

Updates the event value via a reducer. The reducer receives the current value of the event and is expected to return the new value. Resist the urge to modify the value, and instead treat it as immutable.

## squawk

```typescript
squawk(componentConstructor)
```

Finally, the squawk method creates a HoC that wraps the specified component. It expects a function that receives a subscription function, and returns a component. The subscription method looks like the one above, but does not return a name. It follows the life cycle of the wrapping component, and clears all subscriptions when the component unmounts.

Using the method could look something like this
```typescript
export const MyComponent = squawk(subscribe => class extends React.Component {
    render() {
        // ...
    }

    componentDidMount() {
        subscribe("myEvent", value => this.setState({ value }));
    }
});
```

There is a sample application available at https://johnstrand.github.io/squawk/build/index.html.