import * as React from "react";
import { Stack, RenderDepth } from "./Utils";

// Helper type to filter out all state props with the type never,
// so that they don't appear in places we don't want them (mostly get)
type NotNever<T> = Pick<
    T,
    ({ [P in keyof T]: T[P] extends never ? never : P })[keyof T]
>;

/** Creates a store of the specified type, where the props of IStore will become
 * tracked values of their respective types
 */
export function createStore<IStore>(initialState: NotNever<IStore>) {
    // IDs are used to track subscriptions
    const generateId = (): string =>
        Math.random()
            .toString(36)
            .substring(7);

    // Helper types to make things less verbose
    type StoreKey = keyof IStore;
    type Reducer<T extends StoreKey> = (
        value: IStore[T]
    ) => Exclude<IStore[T], undefined>;
    type TrackedComponent = { isFunction: boolean };

    // Set initial state, could possibly use JSON.stringify/parse to break references
    const state = initialState as IStore;

    // Tracker for function components, structure is [event][components]
    const functionComponentTracker: Map<
        StoreKey,
        Set<React.Component>
    > = new Map();

    // Tracker for class components, structure is [component][events[]]
    const classComponentTracker: Map<
        React.Component,
        (() => void)[]
    > = new Map();

    // Tracker for subscriptions, structure is [event][ID][callback]
    const subscriptions: Map<
        StoreKey,
        Map<string, (value: any) => any>
    > = new Map();

    // Returns the value of specified event
    // If called from with a rendering function component, will also set up a subscription
    const get = <T extends StoreKey>(event: T) => {
        // Is get() called while rendering?
        if (renderTracker.rendering()) {
            const activeComponent = componentHierarchy.peek() as React.Component &
                TrackedComponent;

            // If the component is a function component, set up a subscriptions
            // in the case of class components, just return the value
            if (activeComponent.isFunction) {
                const trackedComponents =
                    functionComponentTracker.get(event) ||
                    new Set<React.Component>();

                functionComponentTracker.set(
                    event,
                    trackedComponents.add(activeComponent)
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

        // Store the updated value in the state
        state[event] = newValue as IStore[T];

        // Are there any function components interested in the current event?
        const trackedFunctionComponents = functionComponentTracker.get(event);

        if (trackedFunctionComponents) {
            trackedFunctionComponents.forEach(
                component => component.forceUpdate() // Make the component rerender
            );
        }

        // Are there any subscribers to the current event?
        const subscriptionTrackers = subscriptions.get(event);

        if (subscriptionTrackers) {
            subscriptionTrackers.forEach(callback => callback(newValue));
        }
    }

    /** Tracks the component currently being rendered (or waiting to be rendered) */
    const componentHierarchy: Stack<React.Component> = new Stack();
    const renderTracker: RenderDepth = new RenderDepth();

    // extends any is there to stop the transpiler from thinking that <T> is an element
    const renderScope = <T extends any>($this: any, scope: () => T) => {
        renderTracker.push();
        componentHierarchy.push($this);
        const rendered = scope();
        componentHierarchy.pop();
        renderTracker.pop();
        return rendered;
    };

    return {
        get,
        update,
        subscribe<T extends StoreKey>(
            event: T,
            callback: (value: Exclude<IStore[T], undefined>) => any
        ) {
            if (renderTracker.rendering()) {
                throw Error("Do not call subscribe inside a rendering call");
            }
            const id = generateId();

            const unsubscribe = () => {
                const eventSubscribersToRemove = subscriptions.get(event);
                if (!eventSubscribersToRemove) {
                    return;
                }

                eventSubscribersToRemove.delete(id);
            };

            if (componentHierarchy.any()) {
                const currentComponent = componentHierarchy.peek() as React.Component &
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
                subscriptions.get(event) ||
                new Map<string, (value: any) => any>();

            subscriptions.set(event, eventSubscribers.set(id, callback));

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
                        componentHierarchy.push(this);
                        renderTracker.suspend();
                        super.componentDidMount();
                        renderTracker.resume();
                        componentHierarchy.pop();
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
