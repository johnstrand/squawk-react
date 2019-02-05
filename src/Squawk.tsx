import * as React from "react";

type IDictionary<TValue> = { [key: string]: TValue };

export function createStore<IStore>(initalState: IStore) {
    const generateName = (): string =>
        Math.random()
            .toString(36)
            .substring(7);
    
    const state = initalState;
    const callbacks: IDictionary<IDictionary<(value: any) => void>> & object = {};

    type StoreKey = keyof IStore;
    type Reducer<T extends StoreKey> = (value: IStore[T]) => IStore[T];
    type Callback<T extends StoreKey> = (value: IStore[T]) => any;

    const get = <T extends StoreKey>(event: T) => state[event];
    const subscribe = <T extends StoreKey>(event: T, subscriber: string, callback: Callback<T>) => {
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
        subscribe<T extends StoreKey>(event: T, callback: Callback<T>) {
            const name = generateName();
            subscribe(event, name, callback);
            return name;
        },
        unsubscribe,
        squawk<P>(
            componentTypeConstructor: (subscribe: <T extends StoreKey>(event: T, callback: (value: IStore[T]) => any) => void) => React.ComponentType<P>
        ): React.ComponentType<P> {
            const name = generateName();

            const componentSubscribe = <T extends StoreKey>(event: T, callback: (value: IStore[T]) => any) => {
                subscribe(event, name, callback);
            };

            const ConstructedType = componentTypeConstructor(componentSubscribe);

            return class extends React.Component<P> {
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
