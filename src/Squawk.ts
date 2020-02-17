import { useEffect, useState, useRef } from "react";

export default function createStore<TStore>(globalState: TStore) {
  type StoreProps = keyof TStore;
  type StorePending = {
    [K in StoreProps]: number;
  };

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

  /** Map that links individual keys in TStore to the pending operation callbacks */
  const pendingState: StorePending = ({} as unknown) as StorePending;
  const pendingSubscribers = new Map<string, Set<(state: boolean) => void>>();

  /** Actual update method, handles resolving subscribers and reducers */
  const internalUpdate = (value: any) => {
    /** If we have received a function, evaluate it before proceeding */
    if (typeof value === "function") {
      value = value();
    }
    /** Make sure that value is not null, and that it is an object */
    if (!value || typeof value !== "object") {
      return;
    }

    /** Merge updated values with global state */
    globalState = { ...globalState, ...value };

    /** Get a list of affected contexts from value object */
    const contexts = Object.keys(value);
    /** Get a (non-unique) list of affected reducers */
    const reducers = contexts
      .filter(context => subscribers.has(context))
      .map(context => Array.from(subscribers.get(context)!));

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
    return () =>
      contexts.forEach(context => subscribers.get(context)!.delete(reducer));
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
  function update(keyOrReducerOrValue: any, reducerOrValue?: any): void {
    if (typeof keyOrReducerOrValue === "function") {
      internalUpdate(keyOrReducerOrValue(globalState));
    } else if (typeof keyOrReducerOrValue === "string") {
      internalUpdate({
        [keyOrReducerOrValue]:
          typeof reducerOrValue === "function"
            ? reducerOrValue((globalState as any)[keyOrReducerOrValue])
            : reducerOrValue
      });
    } else {
      internalUpdate(keyOrReducerOrValue);
    }
  }

  function get<TContext extends StoreProps>(
    context: TContext
  ): TStore[TContext];
  function get(): Readonly<TStore>;
  function get<TContext extends StoreProps>(context?: TContext) {
    return context ? globalState[context] : globalState;
  }

  function action(
    reducer: (value: TStore) => Promise<Partial<TStore>> | Partial<TStore>
  ): () => Promise<Readonly<TStore>>;
  function action<T>(
    reducer: (
      value: TStore,
      payload: T
    ) => Promise<Partial<TStore>> | Partial<TStore>
  ): (payload: T) => Promise<Readonly<TStore>>;
  function action(
    reducer: (
      value: TStore,
      payload?: any
    ) => Promise<Partial<TStore>> | Partial<TStore>
  ) {
    return async (payload?: any) => {
      const value = await Promise.resolve(reducer(globalState, payload));
      internalUpdate(value);
      return globalState;
    };
  }

  return {
    /** Helper function to create "prebaked" update methods */
    action,
    /** Returns a specific named value from the global state */
    get,
    /** Updates the pending status of the specified context */
    pending<TContext extends StoreProps>(
      context: TContext | TContext[],
      state: boolean
    ) {
      if (!Array.isArray(context)) {
        context = [context];
      }

      for (const ctx of context) {
        const newValue = (pendingState[ctx] || 0) + (state ? 1 : -1);
        if (newValue < 0) {
          throw Error(`Too many calls to pending("${ctx}", false)`);
        }
        pendingState[ctx] = newValue;
      }

      for (const ctx of context) {
        if (!pendingSubscribers.has(ctx as string)) {
          return;
        }
        pendingSubscribers
          .get(ctx as string)!
          .forEach(callback => callback(pendingState[ctx] > 0));
      }
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
    /** Use the pending hook, the value will be true if the number of pending operations per context is greater than 0 */
    usePending<TContext extends StoreProps>(context: TContext) {
      const [pending, setPending] = useState(!!pendingState[context]);

      if (!pendingSubscribers.has(context as string)) {
        pendingSubscribers.set(context as string, new Set());
      }

      let callback = (state: boolean) => setPending(state);

      pendingSubscribers.get(context as string)!.add(callback);

      useEffect(() => {
        return () => {
          pendingSubscribers.get(context as string)!.delete(callback);
          (callback as any) = undefined;
        };
      }, [context]);

      return pending;
    },
    /** Use the squawk hook. The local state will be whatever the reducer returns. The method returns the current local state, and a method to update the global state */
    useSquawk<TContext extends StoreProps>(
      ...contexts: TContext[]
    ): Pick<TStore, TContext> {
      /** context list should never change */
      const ctx = useRef(contexts);
      /** Keep track if the component is mounted */
      const isMounted = useRef(true);

      /** Define reducer with useRef to guarantee stable identity */
      const localReducer = useRef((state: TStore) => {
        return ctx.current.reduce(
          (acc, cur) => ({ ...acc, ...{ [cur]: state[cur] } }),
          {}
        ) as Pick<TStore, TContext>;
      });

      /** Initialize useState with the local state */
      const [localState, localDispatcher] = useState(
        localReducer.current(globalState)
      );

      /** Define subscribe via callback to guarantee stable identity */
      const subscriber = useRef((value: any) => {
        if (isMounted.current) {
          /** Filter global state through reducer to get new local state */
          localDispatcher(localReducer.current(value));
        }
      });

      /** Set up subscriptions for the contexts in the local state */
      const unsubscribe = useRef(
        internalSubscribe(ctx.current as string[], subscriber.current)
      );

      useEffect(() => {
        isMounted.current = true;
        const _unsubscribe = unsubscribe.current;
        return () => {
          isMounted.current = false;
          _unsubscribe();
        };
      }, [unsubscribe]);

      return localState;
    }
  };
}
