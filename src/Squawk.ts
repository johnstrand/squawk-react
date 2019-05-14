import { useReducer, useEffect } from "react";

export default function createStore<TStore>(initial: TStore) {
    type StoreKey = keyof TStore;
    const getId = () => Math.random().toString(36);

    const subscribers = new Map<string, Set<string>>();
    const subscriberCallbacks = new Map<string, (value: any) => any>();

    const internalUpdate = (value: any) => {
        const contexts = Object.getOwnPropertyNames(value);
        const ids = contexts
            .filter(context => subscribers.has(context))
            .map(context => Array.from(subscribers.get(context)!))
            .reduce((acc, cur) => [...acc, ...cur]);

        initial = { ...initial, ...value };

        ids.forEach(id => {
            if (!subscriberCallbacks.has(id)) {
                return;
            }

            subscriberCallbacks.get(id)!(initial);
        });
    };

    const internalSubscribe = (
        contexts: string[],
        reducer: (state: any) => any
    ) => {
        const id = getId();
        contexts.forEach(context => {
            if (!subscribers.has(context)) {
                subscribers.set(context, new Set<string>());
            }
            subscribers.get(context)!.add(id);
        });

        subscriberCallbacks.set(id, reducer);

        return () => {
            subscribers.forEach(s => s.delete(id));
            subscriberCallbacks.delete(id);
        };
    };

    return {
        get<T extends StoreKey>(context: T): TStore[T] {
            return initial[context];
        },
        subscribe<T extends StoreKey>(
            context: T,
            callback: (value: TStore[T]) => any
        ): () => void {
            return internalSubscribe([context as string], (state: TStore) =>
                callback(state[context])
            );
        },
        update<T extends StoreKey>(
            reducer: (value: TStore) => Pick<TStore, T>
        ): void {
            internalUpdate(reducer(initial));
        },
        useSquawk<T extends StoreKey>(
            localReducer: (value: TStore) => Pick<TStore, T>
        ): [Pick<TStore, T>, (state: Pick<TStore, T>) => void] {
            const reducer = (state: any, action: any) => ({
                ...state,
                ...action
            });

            const localValue = localReducer(initial);

            const [value, dispatcher] = useReducer(reducer, localValue);

            useEffect(() =>
                internalSubscribe(
                    Object.getOwnPropertyNames(localValue),
                    value => dispatcher(localReducer(value))
                )
            );

            return [value, (state: Pick<TStore, T>) => internalUpdate(state)];
        }
    };
}
