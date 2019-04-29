import * as React from "react";
import { Stack } from "./Stack";

type NotNever<T> = Pick<
    T,
    ({ [P in keyof T]: T[P] extends never ? never : P })[keyof T]
>;

export function createStore<IStore>(initialState: NotNever<IStore>) {
    const generateId = (): string =>
        Math.random()
            .toString(36)
            .substring(7);

    // Helper types to make things less verbose
    type StoreKey = keyof IStore;
    type Reducer<T extends StoreKey> = (value: IStore[T]) => IStore[T];
    type TrackedComponent = { isFunction: boolean };

    // Set initial state, could possibly use JSON.stringify/parse to break references
    const state = initialState as IStore;

    // Tracker for function components, structure is [event][components]
    const functionComponentTracker: Map<
        string,
        Set<React.Component>
    > = new Map();

    // Tracker for class components, structure is [component][events[]]
    const classComponentTracker: Map<
        React.Component,
        (() => void)[]
    > = new Map();

    // Tracker for subscriptions, structure is [event][ID][callback]
    const subscriptions: Map<
        string,
        Map<string, (value: any) => any>
    > = new Map();

    // Returns the value of specified event
    // If called from with a rendering function component, will also set up a subscription
    const get = <T extends StoreKey>(event: T) => {
        if (isRendering) {
            const activeComponent = components.peek() as React.Component &
                TrackedComponent;

            if (activeComponent.isFunction) {
                let set = functionComponentTracker.get(event as string);
                if (!set) {
                    set = new Set<React.Component>();
                }

                functionComponentTracker.set(
                    event as string,
                    set.add(activeComponent)
                );
            }
        }

        return state[event];
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

        const trackedFunctionComponents = functionComponentTracker.get(
            event as string
        );

        if (trackedFunctionComponents) {
            trackedFunctionComponents.forEach(component =>
                component.forceUpdate()
            );
        }

        const subscriptionTrackers = subscriptions.get(event as string);

        if (subscriptionTrackers) {
            subscriptionTrackers.forEach(callback => callback(newValue));
        }
    }

    const components: Stack<React.Component> = new Stack();
    let isRendering: number = 0;

    // extends any is there to stop the transpiler from thinking that <T> is an element
    const renderScope = <T extends any>($this: any, scope: () => T) => {
        isRendering++;
        components.push($this);
        const rendered = scope();
        components.pop();
        isRendering--;
        return rendered;
    };

    return {
        get,
        update,
        subscribe<T extends StoreKey>(
            event: T,
            callback: (value: IStore[T]) => any
        ) {
            if (isRendering) {
                throw Error("Do not call subscribe inside a rendering call");
            }
            const id = generateId();

            const unsubscribe = () => {
                const eventSubscribersToRemove = subscriptions.get(
                    event as string
                );
                if (!eventSubscribersToRemove) {
                    return;
                }

                eventSubscribersToRemove.delete(id);
            };

            if (components.any()) {
                const currentComponent = components.peek() as React.Component &
                    TrackedComponent;
                if (currentComponent.isFunction) {
                    throw Error(
                        "Do not call subscribe from a function component"
                    );
                }

                classComponentTracker.set(currentComponent, [
                    ...(classComponentTracker.get(currentComponent) || []),
                    unsubscribe
                ]);
            }

            const eventSubscribers =
                subscriptions.get(event as string) ||
                new Map<string, (value: any) => any>();

            subscriptions.set(
                event as string,
                eventSubscribers.set(id, callback)
            );

            return unsubscribe;
        },
        squawk<P>(
            ComponentType: React.ComponentType<P>
        ): React.ComponentClass<P> {
            if (ComponentType.prototype.isReactComponent) {
                return class extends (ComponentType as React.ComponentClass<
                    P
                >) {
                    public isFunction = false;
                    render() {
                        return renderScope(this, () => super.render());
                    }

                    componentDidMount() {
                        if (!super.componentDidMount) {
                            return;
                        }
                        components.push(this);
                        super.componentDidMount();
                        components.pop();
                    }

                    componentWillUnmount() {
                        const unsubscribers = classComponentTracker.get(this);
                        if (!unsubscribers) {
                            console.warn(
                                "Component unmounted with any subscribers, remove unnecessary squawk()?"
                            );
                            console.trace();
                            return;
                        }

                        unsubscribers.forEach(unsubscribe => unsubscribe());
                        classComponentTracker.delete(this);
                    }
                };
            } else {
                return class extends React.Component<P> {
                    public isFunction = true;
                    render() {
                        return renderScope(this, () =>
                            (ComponentType as React.FunctionComponent<P>)(
                                this.props
                            )
                        );
                    }

                    componentWillUnmount() {
                        functionComponentTracker.forEach(list =>
                            list.delete(this)
                        );
                    }
                };
            }
        }
    };
}
