import { useEffect, useReducer } from "react";

export default function createStore<TStore, EventProps extends string = never>(
    globalState: TStore
) {
    type StoreProps = keyof TStore;

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
    function update<TContext extends StoreProps>(
        reducer: (value: TStore) => Pick<TStore, TContext>
    ): void;
    function update<TContext extends StoreProps>(
        key: TContext,
        value: TStore[TContext]
    ): void;
    function update<TContext extends StoreProps>(
        key: TContext,
        reducer: (value: TStore[TContext]) => TStore[TContext]
    ): void;
    function update<TContext extends StoreProps>(
        value: Pick<TStore, TContext>
    ): void;
    function update(keyOrReducerOrValue: any, optionalValue?: any): void {
        if (typeof keyOrReducerOrValue === "function") {
            internalUpdate(keyOrReducerOrValue(globalState));
        } else if (typeof keyOrReducerOrValue === "string") {
            internalUpdate({
                [keyOrReducerOrValue]:
                    typeof optionalValue === "function"
                        ? optionalValue(
                              (globalState as any)[keyOrReducerOrValue]
                          )
                        : optionalValue
            });
        } else {
            internalUpdate(keyOrReducerOrValue);
        }
    }

    function get<TContext extends StoreProps>(
        context: TContext
    ): TStore[TContext];
    function get(): TStore;
    function get<TContext extends StoreProps>(context?: TContext) {
        return context ? globalState[context] : globalState;
    }

    function action<T>(reducer: (value: TStore, payload: T) => Promise<Partial<TStore>> | Partial<TStore>): (payload: T) => any
    function action(reducer: (value: TStore) => Promise<Partial<TStore>> | Partial<TStore>): () => any
    function action<T>(reducer: (value: TStore, payload: T) => Promise<Partial<TStore>> | Partial<TStore>): (payload: T) => any {
        return (payload: T) => {
            Promise.resolve(reducer(globalState, payload)).then(internalUpdate);
        };
    }

    return {
        /** Helper function to create "prebaked" update methods */
        action,
        /** Returns a specific named value from the global state */
        get,
        event<TEvent extends EventProps>(event: TEvent): void {
            internalUpdate({ [event]: undefined });
        },
        /** Sets up an event subscription, returns a method that will unsubscribe when invoked */
        onEvent<TEvent extends EventProps>(
            event: TEvent,
            callback: () => any
        ): () => void {
            return internalSubscribe([event as string], callback);
        },
        /** Sets up a subscription for a single global state context */
        subscribe<TContext extends StoreProps>(
            context: TContext,
            callback: Reducer<TStore[TContext]>
        ): () => void {
            return internalSubscribe([context as string], (state: TStore) =>
                callback(state[context])
            );
        },
        /** Update 1 or more global state contexts. The callback receives the global state and what contexts are updated are determined by what it returns */
        update,
        useEvent<TEvent extends EventProps>(
            event: TEvent,
            callback: () => any
        ) {
            useEffect(() => internalSubscribe([event as string], callback));
        },
        /** Use the squawk hook. The local state will be whatever the reducer returns. The method returns the current local state, and a method to update the global state */
        useSquawk<TContext extends StoreProps>(
            ...contexts: TContext[]
        ): Pick<TStore, TContext> {
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

            useEffect(
                () => () => {
                    unsubscribe();
                    subscriberCache.delete(localDispatcher);
                },
                [unsubscribe]
            );

            return localState;
        }
    };
}
