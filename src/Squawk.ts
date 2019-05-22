import { useReducer, useEffect } from "react";

export default function createStore<TStore>(globalState: TStore) {
    /** Type alias for the keys of TStore */
    type StoreKey = keyof TStore;
    /** Type alias for reducers: (value: T) => any */
    type Reducer<T = any> = (value: T) => any;

    /** Helper method to produce unique union */
    const union = <T>(...arrays: T[][]) => {
        const items = new Set<T>();
        arrays.forEach(array => array.forEach(item => items.add(item)));
        return Array.from(items);
    };

    /** Map that links individual keys in TStore to the reducer callbacks */
    const subscribers = new Map<string, Set<Reducer>>();
    const subscriberCache = new Map();

    /** Actual update method, handles resolving subscribers and reducers */
    const internalUpdate = (value: any) => {
        /** Make sure that value is not null, and that it is an object */
        if (!value || typeof value !== "object") {
            return;
        }
        /** Get a list of affected contexts from value object */
        const contexts = Object.keys(value);
        /** Get a (non-unique) list of affected reducers */
        const reducers = contexts
            .filter(context => subscribers.has(context))
            .map(context => Array.from(subscribers.get(context)!));

        /** Merge updated values with global state */
        globalState = { ...globalState, ...value };

        /** Get unique reducers and invoke them */
        union(...reducers).forEach(reducer => {
            reducer(globalState);
        });
    };

    /** Internal method for setting up and removing subscriptions */
    const internalSubscribe = (contexts: string[], reducer: Reducer) => {
        /** For each supplied context, set up a context->[callback] mapping */
        contexts.forEach(context => {
            if (!subscribers.has(context)) {
                subscribers.set(context, new Set());
            }
            subscribers.get(context)!.add(reducer);
        });

        /** Return a function that can be used to remove subscriptions */
        return () => {
            subscribers.forEach(s => s.delete(reducer));
        };
    };
    
    /** Update variants */
    function update<TContext extends StoreKey>(reducer: (value: TStore) => Pick<TStore, TContext>): void;
    function update<TContext extends StoreKey>(key: TContext, value: TStore[TContext]): void;
    function update<TContext extends StoreKey>(value: Pick<TStore, TContext>): void;
    function update(keyOrReducerOrValue: any, optionalValue?: any): void {
        if(typeof keyOrReducerOrValue === "function") {
            internalUpdate(keyOrReducerOrValue(globalState));
        } else if(typeof keyOrReducerOrValue === "string") {
            internalUpdate({ [keyOrReducerOrValue]: optionalValue });
        } else {
            internalUpdate(keyOrReducerOrValue);
        }
    }

    return {
        /** Returns a specific named value from the global state */
        get<TContext extends StoreKey>(context: TContext): TStore[TContext] {
            return globalState[context];
        },
        /** Sets up a subscription for a single global state context */
        subscribe<TContext extends StoreKey>(
            context: TContext,
            callback: Reducer<TStore[TContext]>
        ): () => void {
            return internalSubscribe([context as string], (state: TStore) =>
                callback(state[context])
            );
        },
        /** Update 1 or more global state contexts. The callback receives the global state and what contexts are updated are determined by what it returns */
        update,
        /** Use the squawk hook. The local state will be whatever the reducer returns. The method returns the current local state, and a method to update the global state */
        useSquawk<TContext extends StoreKey>(
            ...contexts: TContext[]
        ): [
            Pick<TStore, TContext>,
            <TUpdate extends keyof TStore>(state: Pick<TStore, TUpdate>) => void
        ] {
            /** Local reducer simply copies the contexts from the state */
            const localReducer = (state: TStore) => {
                return contexts.reduce(
                    (acc, cur) => ({ ...acc, ...{ [cur]: state[cur] } }),
                    {}
                ) as Pick<TStore, TContext>;
            };

            /** Simple merging reducer, as we will only dispatch partial states */
            const mergingReducer = (state: any, action: any) => ({
                ...state,
                ...action
            });

            /** Derive local state from global state */
            const initialLocalState = localReducer(globalState);

            /** Initialize useReducer with the local state */
            const [localState, localDispatcher] = useReducer(
                mergingReducer,
                initialLocalState
            );

            /** Set up subscriptions for the contexts in the local state */
            const unsubscribe = subscriberCache.has(localDispatcher)
                ? subscriberCache.get(localDispatcher)
                : internalSubscribe(Object.keys(initialLocalState), value =>
                      /** value will be the global state, so run it through the local reducer before dispatching it locally */
                      localDispatcher(localReducer(value))
                  );

            useEffect(() => () => {
                unsubscribe();
                subscriberCache.delete(localDispatcher);
            }, [unsubscribe]);

            return [localState, state => internalUpdate(state)];
        }
    };
}
