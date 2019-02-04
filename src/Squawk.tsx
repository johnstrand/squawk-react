import * as React from "react";

type Tracker<T> = {
    /** Registers a callback for the specified event */
    subscribe: (event: keyof T, callback: (value: T[keyof T]) => void) => void;
    /** Sends an event, the reducer will receive the current value and is expected to return the new value */
    update: (event: keyof T, reducer: (current: T[keyof T]) => T[keyof T]) => void;
    /** Gets the last value transmitted for a specified event */
    get: (event: keyof T) => T[keyof T];
}
type IDictionary<TValue> = { [key: string]: TValue };

export function createStore<IStore>(initalState: Partial<IStore>) {
    const generateName = (): string =>
        Math.random()
            .toString(36)
            .substring(7);
    
    const state = initalState;
    const callbacks: IDictionary<IDictionary<(value: unknown) => void>> & object = {};

    type StoreKey = keyof IStore;
    type Reducer<T extends StoreKey> = (value: IStore[T]) => IStore[T];

    const get = <T extends StoreKey>(event: T) => state[event];
    const subscribe = <T extends StoreKey>(event: T, subscriber: string, callback: (value: IStore[T]) => void) => {
        if(!callbacks.hasOwnProperty(event)) {
            callbacks[event as string] = {};
        }
        callbacks[event as string][subscriber] = callback;
    };
    const unsubscribe = (subscriber: string) => {
        Object.getOwnPropertyNames(callbacks).forEach(event => {
            delete callbacks[event][subscriber];
        });
    };
    const update = <T extends StoreKey>(event: T, reducer: Reducer<T>): void => {
        const newValue = reducer(state[event]);
        state[event] = newValue;
        if(!callbacks.hasOwnProperty(event)) {
            return;
        }
        Object.getOwnPropertyNames(callbacks[event as string]).forEach(subscriber => {
            callbacks[event as string][subscriber](newValue);
        });
    };

    return {
        get,
        update,
        subscribe<T extends StoreKey>(event: T, callback: (value: IStore[T]) => void) {
            const name = generateName();
            subscribe(event, name, callback);
            return name;
        },
        unsubscribe,
        squawk<P, S>(
            componentTypeConstructor: (tracker: Tracker<IStore>) => React.ComponentType
        ): React.ComponentType {
            const name = generateName();

            const trackerWrapper: Tracker<IStore> = {
                subscribe<T extends StoreKey>(event: T, callback: (value: IStore[T]) => void) {
                    subscribe(event, name, callback);
                },
                update,
                get
            };

            const ConstructedType = componentTypeConstructor(trackerWrapper);

            return class extends React.Component<P, S> {
                render() {
                    return <ConstructedType {...this.props} />;
                }

                componentWillUnmount() {
                    unsubscribe(name);
                }
            };
        }
    };
}
