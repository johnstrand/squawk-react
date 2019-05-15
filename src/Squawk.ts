import { useReducer, useEffect } from "react";

export default function createStore<TStore>(initial: TStore) {
    /** Type alias for the keys of TStore */
    type StoreKey = keyof TStore;

    /** Helper method to generate random string */
    const getId = () => Math.random().toString(36);

    /** Helper method to inline object mutation */
    const mutate = <T>(obj: T, mutation: () => any) => {
        mutation();
        return obj;
    };

    /** Helper method to produce unique union */
    const union = (...arrays: string[][]) => {
        return Object.keys(
            arrays.reduce(
                (acc: { [key: string]: number }, cur) =>
                    mutate(acc, () => cur.forEach(c => (acc[c] = 1))),
                {}
            )
        );
    };

    /** Map that links individual keys in TStore to the subscriber IDs */
    const subscribers = new Map<string, Set<string>>();
    /** Map that links subscriber IDs to their respective update methods */
    const subscriberCallbacks = new Map<string, (value: any) => any>();

    /** Actual update method, handles resolving subscribers and IDs */
    const internalUpdate = (value: any) => {
        /** Make sure that value is not null, and that it is an object */
        if (!value || typeof value !== "object") {
            return;
        }
        /** Get a list of affected contexts from value object */
        const contexts = Object.keys(value);
        /** Get a (non-unique) list of affected ids */
        const ids = contexts
            .filter(context => subscribers.has(context))
            .map(context => Array.from(subscribers.get(context)!));

        /** Merge updated values with global state */
        initial = { ...initial, ...value };

        /** Get unique ids and invoke callbacks for each */
        union(...ids).forEach(id => {
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
        /** For each supplied context, set up a context->id mapping (and associated callback) */
        contexts.forEach(context => {
            if (!subscribers.has(context)) {
                subscribers.set(context, new Set<string>());
            }
            subscribers.get(context)!.add(id);
        });

        subscriberCallbacks.set(id, reducer);

        /** Return a function that can be used to remove subscriptions */
        return () => {
            subscribers.forEach(s => s.delete(id));
            subscriberCallbacks.delete(id);
        };
    };

    return {
        /** Returns a specific named value from the global state */
        get<T extends StoreKey>(context: T): TStore[T] {
            return initial[context];
        },
        /** Sets up a subscription for a single global state context */
        subscribe<T extends StoreKey>(
            context: T,
            callback: (value: TStore[T]) => any
        ): () => void {
            return internalSubscribe([context as string], (state: TStore) =>
                callback(state[context])
            );
        },
        /** Update 1 or more global state contexts. The callback receives the global state and what contexts are updated are determined by what it returns */
        update<T extends StoreKey>(
            reducer: (value: TStore) => Pick<TStore, T>
        ): void {
            internalUpdate(reducer(initial));
        },
        /** Use the squawk hook. The local state will be whatever the reducer returns */
        useSquawk<T extends StoreKey>(
            localReducer: (value: TStore) => Pick<TStore, T>
        ): [Pick<TStore, T>, (state: Pick<TStore, T>) => void] {
            /** Simple merging reducer, as we will only dispatch partial states */
            const reducer = (state: any, action: any) => ({
                ...state,
                ...action
            });

            /** Derive local state from global state */
            const localValue = localReducer(initial);

            /** Initialize useReducer with the local state */
            const [value, dispatcher] = useReducer(reducer, localValue);

            useEffect(() =>
                /** Set up subscriptions for the contexts in the local state */
                internalSubscribe(Object.keys(localValue), value =>
                    /** value will be the global state, so run it through the local reducer before dispatching it locally */
                    dispatcher(localReducer(value))
                )
            );

            return [value, (state: Pick<TStore, T>) => internalUpdate(state)];
        }
    };
}
