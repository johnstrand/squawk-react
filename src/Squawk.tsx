import * as React from "react";

type IDictionary<TValue> = { [key: string]: TValue };

export function createStore<IStore>(initialState: IStore) {
    const generateName = (): string =>
        Math.random()
            .toString(36)
            .substring(7);

    // Set initial state, could possibly use JSON.stringify/parse to break references
    const state = initialState;
    // The callback structure is callbacks[event][subscriber]
    const callbacks: IDictionary<IDictionary<(value: any) => void>> &
        object = {};

    // Helper types to make things less verbose
    type StoreKey = keyof IStore;
    type Reducer<T extends StoreKey> = (value: IStore[T]) => IStore[T];
    type Callback<T extends StoreKey> = (value: IStore[T]) => any;

    // Simply returns the value of specified event
    const get = <T extends StoreKey>(event: T) => state[event];

    // Subscribe helper method
    const subscribe = <T extends StoreKey>(
        event: T,
        subscriber: string,
        callback: Callback<T>
    ) => {

        // Have we seen this event before? If not, add it
        if (!callbacks.hasOwnProperty(event)) {
            callbacks[event as string] = {};
        }

        // Register the event callback for the subscriber
        callbacks[event as string][subscriber] = callback;
    };

    const unsubscribe = (subscriber: string) => {
        // Loop through all events in the callback root object
        Object.getOwnPropertyNames(callbacks).forEach(event => {
            // And delete the subscriber property (if the subscriber doesn't exist on the event, this is a no-op)
            delete callbacks[event][subscriber];
        });
    };

    const update = <T extends StoreKey>(
        event: T,
        reducer: Reducer<T>
    ): void => {
        // Calculate the new value by passing the current value to the reducer
        const newValue = reducer(state[event]);
        state[event] = newValue;
        // If no one is listening, exit the method here
        if (!callbacks.hasOwnProperty(event)) {
            return;
        }

        // Loop through every subscriber registered for the event and
        // invoke the their callbacks with the new value
        Object.getOwnPropertyNames(callbacks[event as string]).forEach(
            subscriber => {
                callbacks[event as string][subscriber](newValue);
            }
        );
    };

    return {
        get,
        update,
        subscribe<T extends StoreKey>(event: T, callback: Callback<T>) {
            // Generate a random name to use for setting up the subscription
            const name = generateName();
            subscribe(event, name, callback);
            return name;
        },
        unsubscribe,
        createBinder(
            ref: React.Component,
            subscriber: <T extends StoreKey>(
                event: T,
                callback: (value: IStore[T]) => any
            ) => any
        ) {
            // Return a function that captures the component reference and subscriber callback
            // and simplifies subscribing to an event with the same name as a local event
            return <T extends StoreKey>(event: T) => {
                subscriber(event, value => ref.setState({ [event]: value }));
            };
        },
        squawk<P>(
            componentTypeConstructor: (
                subscribe: <T extends StoreKey>(
                    event: T,
                    callback: (value: IStore[T]) => any
                ) => void
            ) => React.ComponentType<P>
        ): React.ComponentType<P> {
            // Create a random name for the HoC
            const name = generateName();

            // Wrap the subscribe method, using the previously generated name
            const componentSubscribe = <T extends StoreKey>(
                event: T,
                callback: (value: IStore[T]) => any
            ) => {
                subscribe(event, name, callback);
            };

            // Create the component type by invoking the callback
            // (Note that this does not create the component, it creates the class representing the component)
            const ConstructedType = componentTypeConstructor(
                componentSubscribe
            );

            return class extends React.Component<P> {
                render() {
                    return <ConstructedType {...this.props} />;
                }

                componentWillUnmount() {
                    // When the HoC is unmounted, remove the subscriptions
                    unsubscribe(name);
                }
            };
        }
    };
}
