import { useEffect, useRef, useState } from "react";

interface ReduxDevTools<T> {
  subscribe(callback: (message: { type: string; state: string }) => void): void;
  init(state: T): void;
  send(label: string, state: T): void;
}

interface WindowWithExtension<T> extends Window {
  __REDUX_DEVTOOLS_EXTENSION__?: {
    connect(): ReduxDevTools<T>;
  };
}

export default function createStore<TStore>(initialState: TStore, useReduxDevTools = false) {
  // eslint-disable-next-line immutable/no-let
  let globalState = { ...initialState };

  type StoreProps = keyof TStore;

  /** Type alias for reducers: (value: T) => any */
  type Callback<T = TStore> = (value: T) => void;

  /** Map that links individual keys in TStore to the reducer callbacks */
  const subscribers = new Map<string, Set<Callback>>();

  /** Map that links individual keys in TStore to the pending operation callbacks */
  const pendingState = new Map<StoreProps, number>();
  const pendingSubscribers = new Map<StoreProps, Set<Callback<boolean>>>();

  const internalDispatch = (contexts: string[]) => {
    /** Get a (non-unique) list of affected reducers */
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reducers = contexts.filter((context) => subscribers.has(context)).map((context) => subscribers.get(context)!);

    /** Ensure that reducers are invoked only once */
    const invokedReducers = new Set<Callback>();
    const reduceEach = (reducer: Callback) => {
      if (invokedReducers.has(reducer)) {
        return;
      }
      invokedReducers.add(reducer);
      reducer(globalState);
    };
    for (const list of reducers) {
      list.forEach(reduceEach);
    }
  };

  /** Set up Redux Dev tools (if enabled) */
  const devToolsExt = (window as WindowWithExtension<TStore>).__REDUX_DEVTOOLS_EXTENSION__;
  const reduxDevTools = useReduxDevTools && devToolsExt ? devToolsExt.connect() : null;

  if (reduxDevTools) {
    reduxDevTools.subscribe((message) => {
      if (message.type === "DISPATCH" && message.state) {
        globalState = JSON.parse(message.state);
        internalDispatch(Object.keys(globalState));
      }
    });
  }

  /** Actual update method, handles resolving subscribers and reducers */
  const internalUpdate = (value: Partial<TStore> | (() => Partial<TStore>)) => {
    /** If we have received a function, evaluate it before proceeding */
    const updatedValues = typeof value === "function" ? value() : value;

    /** Make sure that value is not null, and that it is an object */
    if (!updatedValues || typeof updatedValues !== "object") {
      return;
    }

    /** Merge updated values with global state */
    globalState = { ...globalState, ...updatedValues };

    if (reduxDevTools) {
      reduxDevTools.send(Object.keys(value).join(" | "), globalState);
    }

    /** Get a list of affected contexts from value object */
    internalDispatch(Object.keys(updatedValues));
  };

  /** Internal method for setting up and removing subscriptions */
  const internalSubscribe = (contexts: string[], reducer: Callback) => {
    /** For each supplied context, set up a context->[callback] mapping */
    contexts.forEach((context) => {
      if (!subscribers.has(context)) {
        subscribers.set(context, new Set());
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      subscribers.get(context)!.add(reducer);
    });

    /** Return a function that can be used to remove subscriptions */
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return () => contexts.forEach((context) => subscribers.get(context)!.delete(reducer));
  };

  /** Update variants */
  function update<TContext extends StoreProps>(value: Pick<TStore, TContext>) {
    internalUpdate(value as Partial<TStore>);
  }

  function get<TContext extends StoreProps>(context: TContext): TStore[TContext];
  function get(): Readonly<TStore>;
  function get<TContext extends StoreProps>(context?: TContext) {
    return context ? globalState[context] : globalState;
  }

  type StoreUpdate<T extends unknown[]> = (store: TStore, ...args: T) => Partial<TStore> | Promise<Partial<TStore>>;

  function action<T extends unknown[]>(resolver: StoreUpdate<T>) {
    return async (...args: T) => {
      const value = await Promise.resolve(resolver(globalState, ...args));
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
    /**
     * Updates boolean status for **pending operations** in parts of the global state
     *
     * @remarks
     *
     * `pending` are to be used within an `action`.
     *
     * How to use `pending` within an `action`:
     *
     * ```ts
     * const foo = action(async () => {
     *  pending(["stateVar1", "stateVar2"], true);
     *
     *  const stateVar1 = await api("url1");
     *  const stateVar2 = await api("url2");
     *
     *  pending(["stateVar1", "stateVar2"], false);
     *  return { stateVar1, stateVar2 }
     * });
     * ```
     */
    pending<TContext extends StoreProps>(context: TContext | TContext[], state: boolean) {
      const contextList = Array.isArray(context) ? context : [context];
      for (const ctx of contextList) {
        const newValue = (pendingState.get(ctx) ?? 0) + (state ? 1 : -1);
        if (newValue < 0) {
          throw Error(`Too many calls to pending("${ctx}", false)`);
        }
        pendingState.set(ctx, newValue);
      }

      for (const ctx of contextList) {
        if (!pendingSubscribers.has(ctx)) {
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pendingSubscribers.get(ctx)!.forEach((callback) => callback((pendingState.get(ctx) ?? 0) > 0));
      }
    },
    /** Sets up a subscription for a single global state context */
    subscribe<TContext extends StoreProps>(context: TContext, callback: Callback<TStore[TContext]>): () => void {
      return internalSubscribe([context as string], (state: TStore) => callback(state[context]));
    },
    /** Update 1 or more global state contexts. The callback receives the global state and what contexts are updated are determined by what it returns */
    /**
     * Update one or more parts of the global state.
     *
     * @remarks
     *
     * `update` are to be used within an `action`. It allows for state updates before an action is finished.
     * The function receives an object that represents parts of the global state.
     *
     * How to use `update` within an `action`:
     *
     * ```ts
     * const foo = action(() => {
     *  ...
     *  update({ storeVar1: "foo", storeVar2: 1});
     *  ...
     * });
     * ```
     */
    update,
    /** Use the pending hook, the value will be true if the number of pending operations per context is greater than 0 */
    /**
     * Subscribe to boolean updates for **async operations** in parts of the global state
     *
     * @remarks
     *
     * How to use `usePending` within a functional component component:
     *
     * ```tsx
     * export const Comp = () => {
     *  const loading = usePending("storeVar1");
     *  ...
     *  if(loading)
     *      return "Loading..";
     *  else
     *      return <div>Content</div>
     * }
     * ```
     */
    usePending<TContext extends StoreProps>(context: TContext) {
      const [pending, setPending] = useState(!!pendingState.get(context));
      const isMounted = useRef(true);

      if (!pendingSubscribers.has(context)) {
        pendingSubscribers.set(context, new Set());
      }

      const callback = (state: boolean) => {
        if (isMounted.current) {
          setPending(state);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      pendingSubscribers.get(context)!.add(callback);

      useEffect(() => {
        // eslint-disable-next-line immutable/no-mutation
        isMounted.current = true;
        return () => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          pendingSubscribers.get(context)!.delete(callback);
          // eslint-disable-next-line immutable/no-mutation
          isMounted.current = false;
        };
      }, [context]);

      return pending;
    },
    /** Use the squawk hook. The local state will be whatever the reducer returns. The method returns the current local state, and a method to update the global state */
    /**
     * Subscribes to updates in the global state to re-render a component
     *
     * @remarks
     *
     * How to use `useSquawk` within a functional component:
     *
     * ```tsx
     * export const Comp = () => {
     *  const { storeVar1, storeVar2 } = useSquawk("storeVar1", "storeVar2");
     *  ...
     *  return <div>{storevar1} - {storeVar2}</div>
     * }
     * ```
     */
    useSquawk<TContext extends StoreProps>(...contexts: TContext[]): Pick<TStore, TContext> {
      /** context list should never change */
      const ctx = useRef(contexts);
      /** Keep track if the component is mounted */
      const isMounted = useRef(true);

      /** Define reducer with useRef to guarantee stable identity */
      const localReducer = useRef((state: TStore) => {
        const reducedState: { [key: string]: unknown } = {};
        // eslint-disable-next-line immutable/no-mutation
        ctx.current.forEach((context) => (reducedState[context as string] = state[context]));

        return reducedState as Pick<TStore, TContext>;
      });

      /** Initialize useState with the local state */
      const [localState, localDispatcher] = useState(localReducer.current(globalState));

      /** Define subscribe via callback to guarantee stable identity */
      const subscriber = useRef((value: TStore) => {
        if (isMounted.current) {
          /** Filter global state through reducer to get new local state */
          localDispatcher(localReducer.current(value));
        }
      });

      /** Set up subscriptions for the contexts in the local state */
      const unsubscribe = useRef(internalSubscribe(ctx.current as string[], subscriber.current));

      useEffect(() => {
        // eslint-disable-next-line immutable/no-mutation
        isMounted.current = true;
        const unsubscribeRef = unsubscribe.current;
        return () => {
          // eslint-disable-next-line immutable/no-mutation
          isMounted.current = false;
          unsubscribeRef();
        };
      }, [unsubscribe]);

      return localState;
    }
  };
}
