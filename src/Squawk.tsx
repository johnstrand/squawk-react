import * as React from "react";

type IDictionary<TValue> = { [key: string]: TValue };

type NotNever<T> = Pick<
    T,
    ({ [P in keyof T]: T[P] extends never ? never : P })[keyof T]
>;

export function createStore<IStore>(initialState: NotNever<IStore>) {
    const generateName = (): string =>
        Math.random()
            .toString(36)
            .substring(7);

    const eventsFromReducer = (reducer: Function) => {
        const reducerSrc: string = reducer.toString();
        var m = new RegExp(/function(\s+\w+)?\s*\((.+?)\)/).exec(reducerSrc);
        let stateVar: string;
        if (m) {
            stateVar = m[2];
        } else {
            m = new RegExp(/\(?(\w+)\)?\s*=>/).exec(reducerSrc);
            if (!m) {
                throw new Error(`Unable to parse reducer`);
            }
            stateVar = m[1];
        }
        const re = new RegExp(stateVar + "\\.(\\w+)", "g");
        const events: { [key: string]: boolean } = {};
        while (!!(m = re.exec(reducerSrc))) {
            events[m[1]] = true;
        }

        return Object.getOwnPropertyNames(events);
    };

    // Set initial state, could possibly use JSON.stringify/parse to break references
    const state = initialState as IStore;
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

    function update<T extends StoreKey>(
        event: IStore[T] extends never ? T : never
    ): void;
    function update<T extends StoreKey>(event: T, reducer: Reducer<T>): void;
    function update<T extends StoreKey>(event: T, reducer?: Reducer<T>): void {
        // Calculate the new value by passing the current value to the reducer
        const newValue = !!reducer ? reducer(state[event]) : undefined;

        // If the value hasn't changed, don't bother with an update
        // Unless the value is undefined, then we might be dealing with a
        // pure event
        if (state[event] === newValue && newValue !== undefined) {
            return;
        }

        state[event] = newValue as IStore[T];
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
    }

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
            return <T extends StoreKey>(...events: T[]) => {
                events.forEach(event =>
                    subscriber(event, value => ref.setState({ [event]: value }))
                );
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
            return class extends React.Component<P> {
                public name = generateName();
                public _type?: React.ComponentType<P>;

                componentSubscribe = <T extends StoreKey>(
                    event: T,
                    callback: (value: IStore[T]) => any
                ) => {
                    subscribe(event, this.name, callback);
                }

                render() {
                    const ConstructedType = (this._type || (this._type = componentTypeConstructor(this.componentSubscribe)));
                    return <ConstructedType {...this.props} />;
                }

                componentWillUnmount() {
                    // When the HoC is unmounted, remove the subscriptions
                    unsubscribe(this.name);
                }
            };
        },
        connect<P>(
            Component: React.FunctionComponent<P>,
            reducer: (state: IStore) => Pick<P, keyof P>
        ) {
            return class extends React.Component<P, P> {
                public name: string;
                constructor(props: P) {
                    super(props);
                    this.state = reducer({ ...props, ...state });
                }
                render() {
                    const { props, state } = this;
                    const combined = { ...props, ...state };
                    return <Component {...combined} />;
                }

                componentWillMount() {
                    this.name = generateName();
                    const events: string[] = eventsFromReducer(reducer);
                    events.forEach(event =>
                        subscribe(event as keyof IStore, this.name, () => {
                            this.setState(reducer(state));
                        })
                    );
                }

                componentWillUnmount() {
                    unsubscribe(name);
                }
            };
        },
        SquawkComponent: class<P = any, S = any> extends React.Component<P, S> {
            public name: string = generateName();
            public subscribe<K extends keyof IStore>(
                event: K,
                callback: (value: IStore[K]) => void
            ) {
                subscribe(event, this.name, callback);
            }
            public componentWillUnmount() {
                unsubscribe(this.name);
            }
        }
    };
}
