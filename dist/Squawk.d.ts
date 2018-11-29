import * as React from "react";
declare type Tracker = {
    /** Registers a callback for the specified event */
    register: <T>(event: string, callback: (value: T) => void) => void;
    /** Sends an event, the reducer will receive the current value and is expected to return the new value */
    send: <T>(event: string, reducer: (current: T) => T) => void;
    /** Gets the last value transmitted for a specified event */
    get: <T>(event: string) => T;
};
declare function update<T>(event: string, reducer: (current: T) => T): void;
declare function squawk<P, S>(componentTypeConstructor: (tracker: Tracker) => React.ComponentType): React.ComponentType;
export { squawk, update };
