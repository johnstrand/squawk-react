import { useEffect, useState } from "react";

const createStore = <IStore>(initial: IStore) => {
    const getId = () => Math.random().toString(36);

    /** Type alias for the props in the store */
    type StoreKey = keyof IStore;
    /** Utility type for reducer functions */
    type Reducer<T extends StoreKey> = (value: IStore[T]) => IStore[T];

    /** Map used to track props->id->callback */
    const subscribers: Map<
        StoreKey,
        Map<string, (value: any) => any>
    > = new Map();

    /** Internal subscribe method */
    const internalSubscribe = <TContext extends StoreKey>(
        context: TContext,
        callback: (value: IStore[TContext]) => any
    ) => {
        /** Get or create a map of subscribers for the current context */
        const contextSubscribers =
            subscribers.get(context) || new Map<string, (value: any) => any>();
        const id = getId();
        contextSubscribers.set(id, callback);
        subscribers.set(context, contextSubscribers);
        return () => {
            subscribers.get(context)!.delete(id);
        };
    };

    /** Direct update (without reducer) */
    function update<TContext extends StoreKey>(
        context: TContext,
        value: IStore[TContext]
    ): void;
    /** Update via reducer */
    function update<TContext extends StoreKey>(
        context: TContext,
        reducer: Reducer<TContext>
    ): void;
    /** Implementation */
    function update<TContext extends StoreKey>(
        context: TContext,
        reducerOrValue: any
    ): void {
        const newValue =
            typeof reducerOrValue === "function"
                ? reducerOrValue(initial[context])
                : reducerOrValue;
        
        /** Return if the new value isn't undefined, and the current value is identical to the existing value */
        if(newValue !== undefined && initial[context] === newValue) {
            return;
        }

        initial[context] = newValue;

        /** Find the subscribers mapped to the context */
        const contextSubscribers = subscribers.get(context);
        if (contextSubscribers) {
            contextSubscribers.forEach(callback => callback(newValue));
        }
    }

    return {
        update,
        get<TContext extends StoreKey>(context: TContext): IStore[TContext] {
            return initial[context];
        },
        subscribe<TContext extends StoreKey>(
            context: TContext,
            callback: (value: IStore[TContext]) => any
        ): () => void {
            return internalSubscribe(context, callback);
        },
        useSquawk<TContext extends StoreKey>(
            context: TContext
        ): [IStore[TContext], (value: IStore[TContext]) => any] {
            const [value, setValue] = useState<IStore[TContext]>(
                initial[context]
            );

            /** Setup useEffect to handle unsubscribe when the component unmounts */
            useEffect(() => 
                internalSubscribe(context, value => setValue(value)));

            /** Return value and update function */
            return [
                value as IStore[TContext],
                (value: IStore[TContext]) => update(context, value)
            ];
        }
    };
};

export default createStore;
