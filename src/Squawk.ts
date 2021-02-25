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

const createStoreWrapper = <T>(initialState: T) => {
  // eslint-disable-next-line immutable/no-let
  let globalState = { ...initialState };
  return {
    update(updatedValues: Partial<T>) {
      globalState = { ...globalState, ...updatedValues };
    },
    get() {
      return { ...globalState } as Readonly<T>;
    },
    getValue(prop: keyof T) {
      return globalState[prop];
    },
    setValue<K extends keyof T>(prop: K, value: T[K]) {
      // eslint-disable-next-line immutable/no-mutation
      globalState[prop] = value;
    },
    set(state: Required<T>) {
      globalState = { ...state };
    },
    keys() {
      return Object.keys(globalState) as (keyof T)[];
    }
  };
};

/**
 * Initializes the store
 *
 * @remarks
 *
 * **Note**: Ensure that the **ENTIRE** state is fully initialized in the createStore call, or you will faces issues with crashes.
 * If a prop must support undefined, define it as "foo: type | undefined" rather than "foo?: type".
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function createStore<T>(initialState: Required<T>, useReduxDevTools = false) {
  if (initialState == null || typeof initialState !== "object" || Array.isArray(initialState)) {
    throw Error(`Root store value must be an object`);
  }

  /** Wrapper for the global state, ensures consistency across async calls */
  const globalState = createStoreWrapper(initialState);

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
  const pendingCount = createStoreWrapper({} as PendingCount);
  const pendingState = createStoreWrapper({} as PendingState);

  /** Map that links individual keys in TStore to the pending operation callbacks */
  const pendingSubscribers = new Map<StoreProp, Set<Callback<PendingState>>>();

  /** Ensure that subscriber Map contains all contexts */
  for (const context of globalState.keys()) {
    subscribers.set(context, new Set());
    pendingSubscribers.set(context, new Set());
    pendingCount.setValue(context, 0);
    pendingState.setValue(context, false);
  }

  /** Function for notifying subscribers of a change */
  const notifySubscribers = (contexts: StoreProp[]) => {
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
      subscriber(globalState.get());
    };

    // Call the reducer for each list in subscribers
    // We avoid doing forEach(... => { }) because that would recreate the closure for
    // each loop, and that causes unnecessary allocations
    for (const list of contextSubscribers) {
      list.forEach(reduceEach);
    }
  };

  /** Set up Redux Dev tools (if enabled) */
  const devToolsExt = typeof window !== "undefined" ? (window as WindowWithExtension<TStore>).__REDUX_DEVTOOLS_EXTENSION__ : null;
  const reduxDevTools = useReduxDevTools && devToolsExt ? devToolsExt.connect() : null;

  if (reduxDevTools) {
    reduxDevTools.subscribe((message) => {
      // If Redux dev tools emitted a dispatch, and the state has a value
      if (message.type === "DISPATCH" && message.state) {
        // Deserialize the value and dispatch updates to all subscribers
        globalState.set(JSON.parse(message.state));
        notifySubscribers(globalState.keys());
      }
    });
  }

  /** Actual update method, handles resolving subscribers */
  const dispatchUpdate = (value: Partial<TStore> | (() => Partial<TStore>)) => {
    // If we have received a function, evaluate it before proceeding
    /** The values to update */
    const updatedValues = typeof value === "function" ? value() : value;

    // Make sure that value is not null, and that it is an object
    if (!updatedValues || typeof updatedValues !== "object") {
      return;
    }

    // Merge updated values with global state
    globalState.update(updatedValues);

    if (reduxDevTools) {
      // Send a list of updates props, and the entire state, to Redux dev tools
      // Passing the entire global state means that we can easily revert to a snapsho
      reduxDevTools.send(Object.keys(value).join(" | "), globalState.get());
    }

    /** Get a list of affected contexts from value object */
    notifySubscribers(Object.keys(updatedValues) as StoreProp[]);
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

  /** Hook that ensures that a callback is only called if the component still is mounted */
  function useIfMounted<T extends unknown[]>(action: (...args: T) => void) {
    /** Keep track if the component is mounted */
    const isMounted = useRef(true);

    useEffect(() => {
      // Set the value to true on mount
      // eslint-disable-next-line immutable/no-mutation
      isMounted.current = true;
      return () => {
        // Set the value to false on unmount
        // eslint-disable-next-line immutable/no-mutation
        isMounted.current = false;
      };
    }, []);

    return useRef((...args: T) => {
      // Only invoke action if the parent component is mounted
      if (isMounted.current) {
        action(...args);
      }
    }).current;
  }

  const createdStore = {
    /** Helper function to create "prebaked" update methods */
    action<T extends unknown[]>(resolver: StoreUpdate<T>, affectedContexts: StoreProp[] = []) {
      return async (...args: T) => {
        // Mark the supplied contexts as pending
        createdStore.pending(affectedContexts, true);
        try {
          // Resolve the promise from the resolver
          const value = await Promise.resolve(resolver(globalState.get(), ...args));

          // If the resolve returned something that wasn't undefined
          if (value) {
            dispatchUpdate(value);
          }
        } finally {
          // Ensure that pending is reset regardless of outcome
          createdStore.pending(affectedContexts, false);
        }
        return globalState;
      };
    },
    /** Returns the entire global state */
    get() {
      return globalState.get();
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
    pending<TContext extends StoreProp>(contexts: TContext | TContext[], state: boolean) {
      // Ensure that contextList is an array, no matter what
      const contextList = Array.isArray(contexts) ? contexts : [contexts];
      // Internal set to ensure that we only call each callback once
      const pendingSubscribersInternal = new Set<Callback<PendingState>>();

      // For each context in list
      for (const context of contextList) {
        // Increment or decrement as necessary
        const newValue = pendingCount.getValue(context) + (state ? 1 : -1);
        // Value should never drop below 0
        if (newValue < 0) {
          throw Error(`Too many calls to pending("${context}", false)`);
        }

        // Set pending count of current context to the new value
        pendingCount.setValue(context, newValue);
        // Set pending state of the current context to true as long as the count is greater than 0
        pendingState.setValue(context, newValue > 0);

        // Find all subscribers to the context and add them to the internal set
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pendingSubscribers.get(context)!.forEach((callback) => pendingSubscribersInternal.add(callback));
      }

      // Invoke all unique subscribers with the new pending states
      pendingSubscribersInternal.forEach((subscriber) => subscriber(pendingState.get()));
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
      dispatchUpdate(value as Partial<TStore>);
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
      const [localPending, localDispatch] = useState(pendingState.get());

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
      /** Initialize useState with the global state */
      const [localState, localDispatcher] = useState(globalState.get());

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
        return internalSubscribe(Array.from(contexts.current), subscriber);
      }, [contexts, subscriber]);

      return proxy;
    }
  };

  return createdStore;
}
