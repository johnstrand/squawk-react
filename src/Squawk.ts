import { useEffect, useMemo, useRef, useState } from "react";

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

  // === Type definitions ===
  type TStore = typeof initialState;

  type StoreProp = keyof TStore;

  type PendingCount = { [K in keyof T]: number };

  type PendingState = { [K in keyof T]: boolean };

  /** Type alias for subscribers: (value: T) => any */
  type Callback<T = TStore> = (value: T) => void;

  type StoreUpdate<T extends unknown[]> = (store: TStore, ...args: T) => Partial<TStore> | Promise<Partial<TStore>> | undefined;
  // === End type definitions ===

  /** Map that links individual keys in TStore to the subscriber callbacks */
  const subscribers = new Map<StoreProp, Set<Callback>>();

  /** Structures to track pending state for each store prop */
  const pendingCount = {} as PendingCount;
  // eslint-disable-next-line immutable/no-let
  let pendingState = {} as PendingState;

  /** Map that links individual keys in TStore to the pending operation callbacks */
  const pendingSubscribers = new Map<StoreProp, Set<Callback<PendingState>>>();

  /** Ensure that subscriber Map contains all contexts */
  for (const context of Object.keys(initialState) as StoreProp[]) {
    subscribers.set(context, new Set());
    pendingSubscribers.set(context, new Set());
    // eslint-disable-next-line immutable/no-mutation
    pendingCount[context] = 0;
    // eslint-disable-next-line immutable/no-mutation
    pendingState[context] = false;
  }

  /** Function for notifying subscribers of a change */
  const internalDispatch = (contexts: StoreProp[]) => {
    /** Get a (non-unique) list of affected subscribers */
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const contextSubscribers = contexts.map((context) => subscribers.get(context)!);

    /** Ensure that subscribers are invoked only once */
    const invokedSubscribers = new Set<Callback>();
    const reduceEach = (subscriber: Callback) => {
      // Check if subscriber has been invoked
      if (invokedSubscribers.has(subscriber)) {
        // If so, skip it
        return;
      }
      // Add the subscriber to the list of invoked subscribers
      invokedSubscribers.add(subscriber);
      // and invoke it
      subscriber(globalState);
    };

    for (const list of contextSubscribers) {
      list.forEach(reduceEach);
    }
  };

  /** Set up Redux Dev tools (if enabled) */
  const devToolsExt = (window as WindowWithExtension<TStore>).__REDUX_DEVTOOLS_EXTENSION__;
  const reduxDevTools = useReduxDevTools && devToolsExt ? devToolsExt.connect() : null;

  if (reduxDevTools) {
    reduxDevTools.subscribe((message) => {
      // If Redux dev tools emitted a dispatch, and the state has a value
      if (message.type === "DISPATCH" && message.state) {
        // Deserialize the value and dispatch updates to all subscribers
        globalState = JSON.parse(message.state);
        internalDispatch(Object.keys(globalState) as StoreProp[]);
      }
    });
  }

  /** Actual update method, handles resolving subscribers */
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
      // Send a list of updates props, and the entire state, to Redux dev tools
      // Passing the entire global state means that we can easily revert to a snapsho
      reduxDevTools.send(Object.keys(value).join(" | "), globalState);
    }

    /** Get a list of affected contexts from value object */
    internalDispatch(Object.keys(updatedValues) as StoreProp[]);
  };

  /** Internal method for setting up and removing subscriptions */
  const internalSubscribe = (contexts: StoreProp[], subscriber: Callback) => {
    /** For each supplied context, set up a context->[callback] mapping */
    contexts.forEach((context) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      subscribers.get(context)!.add(subscriber);
    });

    /** Return a function that can be used to remove subscriptions */
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return () => contexts.forEach((context) => subscribers.get(context)!.delete(subscriber));
  };

  function action<T extends unknown[]>(resolver: StoreUpdate<T>) {
    return async (...args: T) => {
      const value = await Promise.resolve(resolver(globalState, ...args));
      if (value) {
        internalUpdate(value);
      }
      return globalState;
    };
  }

  /** Hook that ensures that a callback is only called if the component still is mounted */
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
    /** Returns the entire global state */
    get() {
      return globalState as Readonly<TStore>;
    },
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
      const pendingSubscribersInternal = new Set<Callback<PendingState>>();

      pendingState = { ...pendingState };

      for (const ctx of contextList) {
        const newValue = pendingCount[ctx] + (state ? 1 : -1);
        if (newValue < 0) {
          throw Error(`Too many calls to pending("${ctx}", false)`);
        }
        // eslint-disable-next-line immutable/no-mutation
        pendingCount[ctx] = newValue;
        // eslint-disable-next-line immutable/no-mutation
        pendingState[ctx] = !!newValue;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pendingSubscribers.get(ctx)!.forEach((callback) => pendingSubscribersInternal.add(callback));
      }

      pendingSubscribersInternal.forEach((subscriber) => subscriber(pendingState));
    },
    /** Sets up a subscription for a single global state context */
    subscribe<TContext extends StoreProp>(context: TContext, callback: Callback<TStore[TContext]>): () => void {
      return internalSubscribe([context], (state: TStore) => callback(state[context]));
    },
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
    update<TContext extends StoreProp>(value: Pick<TStore, TContext>) {
      internalUpdate(value as Partial<TStore>);
    },
    /**
     * Subscribe to boolean updates for **async operations** in parts of the global state
     *
     * @remarks
     *
     * How to use `usePending` within a functional component component:
     *
     * ```tsx
     * export const Comp = () => {
     *  const loading = usePending();
     *  ...
     *  if(loading.storeVar1)
     *      return "Loading..";
     *  else
     *      return <div>Content</div>
     * }
     * ```
     * See documentation for `pending()` for more details
     */
    usePending<T extends StoreProp>(...explicitContexts: T[]) {
      const [localPending, localDispatch] = useState(pendingState);

      const subscriber = useIfMounted((value: PendingState) => {
        localDispatch(value);
      });

      const contexts = useRef(new Set<StoreProp>(explicitContexts));

      const proxy = useMemo(
        () =>
          new Proxy(localPending, {
            get(_, prop) {
              contexts.current.add(prop as StoreProp);
              return localPending[prop as StoreProp];
            }
          }),
        [localPending]
      );

      useEffect(() => {
        const _contexts = Array<StoreProp>();
        contexts.current.forEach((context) => {
          _contexts.push(context);
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          pendingSubscribers.get(context)!.add(subscriber);
        });
        return () => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          _contexts.forEach((context) => pendingSubscribers.get(context)!.delete(subscriber));
        };
      }, [subscriber]);

      return proxy;
    },
    /**
     * Subscribes to updates in the global state to re-render a component
     *
     * @remarks
     *
     * How to use `useSquawk` within a functional component:
     *
     * ```tsx
     * export const Comp = () => {
     *  const { storeVar1, storeVar2 } = useSquawk();
     *  ...
     *  return <div>{storevar1} - {storeVar2}</div>
     * }
     * ```
     */
    useSquawk<T extends StoreProp>(...explicitContexts: T[]): TStore {
      /** Initialize useState with the local state */
      const [localState, localDispatcher] = useState(globalState);

      /** Define subscribe via callback to guarantee stable identity */
      const subscriber = useIfMounted((value: TStore) => {
        localDispatcher(value);
      });

      const contexts = useRef(new Set<StoreProp>(explicitContexts));

      const proxy = useMemo(
        () =>
          new Proxy(localState, {
            get(_, prop) {
              contexts.current.add(prop as StoreProp);
              return localState[prop as StoreProp];
            }
          }),
        [localState]
      );

      useEffect(() => {
        const unsubscribe = internalSubscribe(Array.from(contexts.current), subscriber);

        return unsubscribe;
      }, [contexts, subscriber]);

      return proxy;
    }
  };
}
