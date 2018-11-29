import * as React from "react";

type Tracker = {
    /** Registers a callback for the specified event */
    register: <T>(event: string, callback: (value: T) => void) => void;
    /** Sends an event, the reducer will receive the current value and is expected to return the new value */
    send: <T>(event: string, reducer: (current: T) => T) => void;
    /** Gets the last value transmitted for a specified event */
    get: <T>(event: string) => T;
};

const RootTracker = (() => {
    const squawkRegistry: {
        [event: string]: {
            [subscriber: string]: ((value: any) => void) | undefined;
        };
    } = {};

    const squawkState: {
        [event: string]: any
    } = {};

    return {
        register: (
            subscriber: string,
            event: string,
            callback: (value: any) => void
        ): void => {
            if(!squawkRegistry[event]) {
                squawkRegistry[event] = {};
            }
            squawkRegistry[event][subscriber] = callback;
        },
        send: (event: string, reducer: (current: any) => any): void => {
            const newState = reducer(squawkState[event]);
            squawkState[event] = newState;
            if(!squawkRegistry[event]) {
                return;
            }

            Object.getOwnPropertyNames(squawkRegistry[event]).forEach(subscriber => {
                if(!squawkRegistry[event][subscriber]) {
                    return;
                }

                squawkRegistry[event][subscriber](newState);
            });
        },
        unregister: (subscriber: string): void => {
            Object.getOwnPropertyNames(squawkRegistry).forEach(event => {
                squawkRegistry[event][subscriber] = undefined;
            });
        },
        get: (event: string): any => {
            return squawkState[event];
        }
    };
})();

export function squawk<P, S>(
    componentTypeConstructor: (tracker: Tracker) => React.ComponentType
): React.ComponentType {
    const generateName = (): string =>
        Math.random()
            .toString(36)
            .substring(7);

    const name = generateName();

    const trackerWrapper: Tracker = {
        register: (event: string, callback: (value: any) => void): void => {
            RootTracker.register(name, event, callback);
        },
        send: (event: string, reducer: (current: any) => any): void => {
            RootTracker.send(event, reducer);
        },
        get: (event: string): any => {
            return RootTracker.get(event);
        }
    };

    const ConstructedType = componentTypeConstructor(trackerWrapper);

    return class extends React.Component<P, S> {
        render() {
            return <ConstructedType />;
        }

        componentWillUnmount() {
            RootTracker.unregister(name);
        }
    };
}
