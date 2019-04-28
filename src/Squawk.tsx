import * as React from "react";
import { Stack } from "./Stack";

type NotNever<T> = Pick<
    T,
    ({ [P in keyof T]: T[P] extends never ? never : P })[keyof T]
>;

type FunctionComponentHandler = {
    callback: () => void;
    events: Set<string>;
};

type FunctionComponentTracker = CallbackTracker<FunctionComponentHandler>;

type CallbackTracker<T> = Map<string, T>;

type ClassComponentTracker = Map<string, CallbackTracker<(value: any) => void>>;

export function createStore<IStore>(initialState: NotNever<IStore>) {
    const generateName = (): string =>
        Math.random()
            .toString(36)
            .substring(7);

    // Set initial state, could possibly use JSON.stringify/parse to break references
    const state = initialState as IStore;
    // The callback structure is callbacks[event][subscriber]
    const classComponentCallbacks: ClassComponentTracker = new Map();
    const functionComponentCallbacks: FunctionComponentTracker = new Map();

    // Helper types to make things less verbose
    type StoreKey = keyof IStore;
    type Reducer<T extends StoreKey> = (value: IStore[T]) => IStore[T];
    type Callback<T extends StoreKey> = (value: IStore[T]) => any;

    // Simply returns the value of specified event
    const get = <T extends StoreKey>(event: T) => {
        if (renderingFunctionalComponent) {
            const componentName = functionalComponentContexts.peek();
            (functionComponentCallbacks.get(
                componentName
            ) as FunctionComponentHandler).events.add(event as string);
        }
        return state[event];
    };

    // Subscribe helper method
    const subscribe = <T extends StoreKey>(
        event: T,
        subscriber: string,
        callback: Callback<T>
    ) => {
        // Have we seen this event before? If not, add it
        if (!classComponentCallbacks.has(event as string)) {
            classComponentCallbacks.set(event as string, new Map());
        }

        // Register the event callback for the subscriber
        (classComponentCallbacks.get(event as string) as Map<string, any>).set(
            subscriber,
            callback
        );
    };

    const unsubscribe = <T extends StoreKey>(subscriber: string, event?: T) => {
        if (event) {
            //delete classComponentCallbacks[event as string][subscriber];
            (classComponentCallbacks.get(event as string) as Map<
                string,
                any
            >).delete(subscriber);
            return;
        }

        classComponentCallbacks.forEach(k => k.delete(subscriber));
    };

    function update<T extends StoreKey>(
        event: IStore[T] extends never ? T : never
    ): void;
    function update<T extends StoreKey>(event: T, reducer: Reducer<T>): void;
    function update<T extends StoreKey>(event: T, reducer?: Reducer<T>): void {
        // Calculate the new value by passing the current value to the reducer
        const newValue = !!reducer ? reducer(state[event]) : undefined;

        // If the value hasn't changed, don't bother with an update
        // Unless the value is undefined, then we might be dealing with a
        // pure event
        if (state[event] === newValue && newValue !== undefined) {
            return;
        }

        state[event] = newValue as IStore[T];

        functionComponentCallbacks.forEach(subscriber => {
            if (subscriber.events.has(event as string)) {
                subscriber.callback();
            }
        });

        // If no one is listening, exit the method here
        if (!classComponentCallbacks.has(event as string)) {
            return;
        }

        // Loop through every subscriber registered for the event and
        // invoke the their callbacks with the new value

        (classComponentCallbacks.get(event as string) as Map<
            string,
            Callback<T>
        >).forEach(callback => {
            callback(newValue as IStore[T]);
        });
    }

    const classComponentContexts: Stack<string> = new Stack();
    const functionalComponentContexts: Stack<string> = new Stack();
    let renderingFunctionalComponent: boolean = false;
    let inConstructor: boolean = false;

    return {
        get,
        update,
        subscribe<T extends StoreKey>(event: T, callback: Callback<T>) {
            if (inConstructor) {
                throw Error(
                    "Do not use subscribe() in constructor, use componentDidMount()"
                );
            }
            // If any ambient context exists, use that, otherwise generate a random name to use for setting up the subscription
            const name = classComponentContexts.any()
                ? classComponentContexts.peek()
                : generateName();
            subscribe(event, name, callback);
            return () => unsubscribe(name, event);
        },
        createBinder(
            ref: React.Component,
            subscriber: <T extends StoreKey>(
                event: T,
                callback: (value: IStore[T]) => any
            ) => any
        ) {
            // Return a function that captures the component reference and subscriber callback
            // and simplifies subscribing to an event with the same name as a local event
            return <T extends StoreKey>(...events: T[]) => {
                events.forEach(event =>
                    subscriber(event, value => ref.setState({ [event]: value }))
                );
            };
        },
        squawk<P>(
            SquawkComponent: React.ComponentClass<P>
        ): React.ComponentType<P> {
            return class extends SquawkComponent {
                private name: string = generateName();

                constructor(props: P) {
                    // Ugly hack, or ugliest hack?
                    // This makes sure that the current context is set
                    // before invoking the parent constructor
                    super(
                        (() => {
                            inConstructor = true;
                            renderingFunctionalComponent = false;
                            return props;
                        })()
                    );
                    this.name = generateName();
                    inConstructor = false;
                }

                render() {
                    renderingFunctionalComponent = false;
                    return super.render();
                }

                componentDidMount() {
                    if (!super.componentDidMount) {
                        return;
                    }
                    renderingFunctionalComponent = false;
                    classComponentContexts.push(this.name);
                    super.componentDidMount();
                    classComponentContexts.pop();
                }

                componentWillUnmount() {
                    if (super.componentWillUnmount) {
                        super.componentWillUnmount();
                    }
                    unsubscribe(this.name);
                }
            };
        },
        connect<P>(Component: React.FunctionComponent<P>) {
            return class extends React.Component<P, P> {
                public name: string = generateName();

                constructor(props: P) {
                    super(props);
                    functionComponentCallbacks.set(this.name, {
                        callback: () => this.forceUpdate(),
                        events: new Set()
                    });
                }

                render() {
                    renderingFunctionalComponent = true;
                    functionalComponentContexts.push(this.name);
                    const renderedComponent = Component(this.props);
                    functionalComponentContexts.pop();
                    return renderedComponent;
                }

                componentWillUnmount() {
                    functionComponentCallbacks.delete(this.name);
                }
            };
        }
    };
}
