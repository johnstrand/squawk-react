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

/**
 * Initializes the store
 *
 * @remarks
 *
 * **Note**: Ensure that the **ENTIRE** state is fully initialized in the createStore call, or you will faces issues with crashes.
 * If a prop must support undefined, define it as "foo: type | undefined" rather than "foo?: type".
 */
export default function createStore<T>(initialState: Required<T>, useReduxDevTools = false) {
  if (initialState == null || typeof initialState !== "object" || Array.isArray(initialState)) {
    throw Error(`Root store value must be an object`);
  }

  // eslint-disable-next-line immutable/no-let
  let globalState = { ...initialState };

  type TStore = typeof initialState;

  type StoreProp = keyof TStore;

  /** Type alias for reducers: (value: T) => any */
  type Callback<T = TStore> = (value: T) => void;

  /** Map that links individual keys in TStore to the reducer callbacks */
  const subscribers = new Map<StoreProp, Set<Callback>>();

  /** Ensure that subscriber Map contains all contexts */
  for (const context of Object.keys(initialState)) {
    subscribers.set(context as StoreProp, new Set());
  }

  /** Map that links individual keys in TStore to the pending operation callbacks */
  const pendingState = new Map<StoreProp, number>();
  const pendingSubscribers = new Map<StoreProp, Set<Callback<boolean>>>();

  const internalDispatch = (contexts: StoreProp[]) => {
    /** Get a (non-unique) list of affected reducers */
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reducers = contexts.map((context) => subscribers.get(context)!);

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
        internalDispatch(Object.keys(globalState) as StoreProp[]);
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
    internalDispatch(Object.keys(updatedValues) as StoreProp[]);
  };

  /** Internal method for setting up and removing subscriptions */
  const internalSubscribe = (contexts: StoreProp[], reducer: Callback) => {
    /** For each supplied context, set up a context->[callback] mapping */
    contexts.forEach((context) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      subscribers.get(context)!.add(reducer);
    });

    /** Return a function that can be used to remove subscriptions */
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return () => contexts.forEach((context) => subscribers.get(context)!.delete(reducer));
  };

  /** Update store with new values */
  function update<TContext extends StoreProp>(value: Pick<TStore, TContext>) {
    internalUpdate(value as Partial<TStore>);
  }

  function get<TContext extends StoreProp>(context: TContext): TStore[TContext];
  function get(): Readonly<TStore>;
  function get<TContext extends StoreProp>(context?: TContext) {
    return context ? globalState[context] : globalState;
  }

  type StoreUpdate<T extends unknown[]> = (store: TStore, ...args: T) => Partial<TStore> | Promise<Partial<TStore>> | undefined;

  function action<T extends unknown[]>(resolver: StoreUpdate<T>) {
    return async (...args: T) => {
      const value = await Promise.resolve(resolver(globalState, ...args));
      if (value) {
        internalUpdate(value);
      }
      return globalState;
    };
  }

  function useIfMounted<T extends unknown[]>(action: (...args: T) => void) {
    /** Keep track if the component is mounted */
    const isMounted = useRef(true);

    useEffect(() => {
      // eslint-disable-next-line immutable/no-mutation
      isMounted.current = true;
      return () => {
        // eslint-disable-next-line immutable/no-mutation
        isMounted.current = false;
      };
    }, []);

    return useRef((...args: T) => {
      if (isMounted.current) {
        action(...args);
      }
    }).current;
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
    pending<TContext extends StoreProp>(context: TContext | TContext[], state: boolean) {
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
    subscribe<TContext extends StoreProp>(context: TContext, callback: Callback<TStore[TContext]>): () => void {
      return internalSubscribe([context], (state: TStore) => callback(state[context]));
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
    usePending<TContext extends StoreProp>(context: TContext) {
      const [pending, setPending] = useState(!!pendingState.get(context));

      if (!pendingSubscribers.has(context)) {
        pendingSubscribers.set(context, new Set());
      }

      const callback = useIfMounted((state: boolean) => {
        setPending(state);
      });

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      pendingSubscribers.get(context)!.add(callback);

      useEffect(() => {
        return () => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          pendingSubscribers.get(context)!.delete(callback);
        };
      }, [context, callback]);

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
    useSquawk<TContext extends StoreProp>(...contexts: TContext[]): Pick<TStore, TContext> {
      /** Initialize useState with the local state */
      const [localState, localDispatcher] = useState(globalState);

      /** Define subscribe via callback to guarantee stable identity */
      const subscriber = useIfMounted((value: TStore) => {
        localDispatcher(value);
      });

      /** Set up subscriptions for the contexts in the local state */
      const unsubscribe = useRef(internalSubscribe(contexts, subscriber));

      useEffect(() => {
        const unsubscribeRef = unsubscribe.current;
        return () => {
          unsubscribeRef();
        };
      }, [unsubscribe]);

      return localState;
    }
  };
}
