import { useEffect, useRef, useState } from "react";

interface ReduxDevTools {
  subscribe(callback: (message: any) => any): void;
  init(state: any): void;
  send(label: string, state: any): void;
}

export default function createStore<TStore>(globalState: TStore, useReduxDevTools = false) {
  const devToolsExt = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  const reduxDevTools: ReduxDevTools | null = useReduxDevTools && devToolsExt ? devToolsExt.connect() : null;

  if (reduxDevTools) {
    reduxDevTools.subscribe((message) => {
      if (message.type === "DISPATCH" && message.state) {
        globalState = JSON.parse(message.state);
        internalDispatch(Object.keys(globalState));
      }
    });
  }

  type StoreProps = keyof TStore;
  type StorePending = {
    [K in StoreProps]: number;
  };

  /** Type alias for reducers: (value: T) => any */
  type Reducer<T = any> = (value: T) => any;

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

    if (reduxDevTools) {
      reduxDevTools.send(Object.keys(value).join(" | "), globalState);
    }

    /** Get a list of affected contexts from value object */
    internalDispatch(Object.keys(value));
  };

  const internalDispatch = (contexts: string[]) => {
    /** Get a (non-unique) list of affected reducers */
    const reducers = contexts.filter((context) => subscribers.has(context)).map((context) => subscribers.get(context)!);

    /** Get unique reducers and invoke them */
    const invokedReducers = new Set<Reducer>();
    const reduceEach = (reducer: Reducer) => {
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

  /** Internal method for setting up and removing subscriptions */
  const internalSubscribe = (contexts: string[], reducer: Reducer) => {
    /** For each supplied context, set up a context->[callback] mapping */
    contexts.forEach((context) => {
      if (!subscribers.has(context)) {
        subscribers.set(context, new Set());
      }
      subscribers.get(context)!.add(reducer);
    });

    /** Return a function that can be used to remove subscriptions */
    return () => contexts.forEach((context) => subscribers.get(context)!.delete(reducer));
  };

  /** Update variants */
  function update<TContext extends StoreProps>(reducer: (value: TStore) => Pick<TStore, TContext>): void;
  function update<TContext extends StoreProps>(key: TContext, value: TStore[TContext]): void;
  function update<TContext extends StoreProps>(key: TContext, reducer: (value: TStore[TContext]) => TStore[TContext]): void;
  function update<TContext extends StoreProps>(value: Pick<TStore, TContext>): void;
  function update(keyOrReducerOrValue: any, reducerOrValue?: any): void {
    if (typeof keyOrReducerOrValue === "function") {
      internalUpdate(keyOrReducerOrValue(globalState));
    } else if (typeof keyOrReducerOrValue === "string") {
      internalUpdate({
        [keyOrReducerOrValue]: typeof reducerOrValue === "function" ? reducerOrValue((globalState as any)[keyOrReducerOrValue]) : reducerOrValue
      });
    } else {
      internalUpdate(keyOrReducerOrValue);
    }
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
        pendingSubscribers.get(ctx as string)!.forEach((callback) => callback(pendingState[ctx] > 0));
      }
    },
    /** Sets up a subscription for a single global state context */
    subscribe<TContext extends StoreProps>(context: TContext, callback: Reducer<TStore[TContext]>): () => void {
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
      const [pending, setPending] = useState(!!pendingState[context]);
      const isMounted = useRef(true);

      if (!pendingSubscribers.has(context as string)) {
        pendingSubscribers.set(context as string, new Set());
      }

      const callback = (state: boolean) => {
        if (isMounted.current) {
          setPending(state);
        }
      };

      pendingSubscribers.get(context as string)!.add(callback);

      useEffect(() => {
        isMounted.current = true;
        return () => {
          pendingSubscribers.get(context as string)!.delete(callback);
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
      const subscriber = useRef((value: any) => {
        if (isMounted.current) {
          /** Filter global state through reducer to get new local state */
          localDispatcher(localReducer.current(value));
        }
      });

      /** Set up subscriptions for the contexts in the local state */
      const unsubscribe = useRef(internalSubscribe(ctx.current as string[], subscriber.current));

      useEffect(() => {
        isMounted.current = true;
        const unsubscribeRef = unsubscribe.current;
        return () => {
          isMounted.current = false;
          unsubscribeRef();
        };
      }, [unsubscribe]);

      return localState;
    }
  };
}
