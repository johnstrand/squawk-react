import * as React from "react";

const createStore = <IStore>(initial: IStore) => {
    const getId = () => Math.random().toString(36);

    type StoreKey = keyof IStore;
    type Reducer<T extends StoreKey> = (value: IStore[T]) => IStore[T];

    const subscribers: Map<
        StoreKey,
        Map<string, (value: any) => any>
    > = new Map();

    const internalSubscribe = <TContext extends StoreKey>(
        context: TContext,
        callback: (value: IStore[TContext]) => any
    ) => {
        const contextSubscribers =
            subscribers.get(context) || new Map<string, (value: any) => any>();
        const id = getId();
        contextSubscribers.set(id, callback);
        subscribers.set(context, contextSubscribers);
        return () => {
            subscribers.get(context)!.delete(id);
        };
    };

    function update<TContext extends StoreKey>(
        context: TContext,
        value: IStore[TContext]
    ): void;
    function update<TContext extends StoreKey>(
        context: TContext,
        reducer: Reducer<TContext>
    ): void;
    function update<TContext extends StoreKey>(
        context: TContext,
        reducerOrValue: any
    ): void {
        const newValue =
            typeof reducerOrValue === "function"
                ? reducerOrValue(initial[context])
                : reducerOrValue;
        
        if(initial[context] === newValue) {
            return;
        }

        initial[context] = newValue;
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
            const [value, setValue] = React.useState<IStore[TContext]>(
                initial[context]
            );

            React.useEffect(() => {
                return internalSubscribe(context, value => setValue(value));
            });

            return [
                value as IStore[TContext],
                (value: IStore[TContext]) => update(context, value)
            ];
        }
    };
};

export default createStore;
