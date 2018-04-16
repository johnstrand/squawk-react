import { Component } from "react";

declare module "react" {
    interface Component<P, S> {
        __squawk_identity: string;
        getMessage<T>(message: string): T | undefined;
        getRegistrations(): string[];
        register<T>(message: string, callback: (value: T) => void): void;
        send(message: string, value: any): void;
        squawk(name: string): void;
        unregister(message?: string): void;
    }
}

(() => {
    const squawkRegistry: {
        [message: string]: {
            [subscriber: string]: ((value: any) => void) | undefined
        }
    } = {};

    const squawkHistory: {
        [message: string]: any
    } = {};

    /**
     * Retrieves the last seen message of the specified type
     * @param {string} message Message type
     * @returns {T | undefined} A message of type T (or undefined, if the message has not been previously seen)
     */
    Component.prototype.getMessage = function <T>(message: string): T | undefined {
        if (squawkHistory[message]) {
            return squawkHistory[message];
        } else {
            return undefined;
        }
    }

    /**
     * Retrieves a list of message types that the current component is subscribed to
     * @returns {string[]} A list of message types
     */
    Component.prototype.getRegistrations = function (): string[] {
        const subscriber: string = this.__squawk_identity;
        return Object.getOwnPropertyNames(squawkRegistry).filter(message => !!squawkRegistry[message][subscriber]);
    }

    /**
     * Registers a subscription for a specific message. If Squawk has seen at least one message of that type before, the callback will
     * be immediately invoked with the last seen message.
     * @param {string} message The message type
     * @param {(value: T) => void} callback The callback which will be invoked when a message of previously specified type appears
     */
    Component.prototype.register = function <T>(message: string, callback: (value: T) => void): void {
        if (!squawkRegistry[message]) {
            squawkRegistry[message] = {};
        }

        if (!this.__squawk_identity) {
            throw new Error("squawk() must be run before a component may register for messages");
        }

        const subscriber: string = this.__squawk_identity;

        squawkRegistry[message][subscriber] = callback;

        if (squawkHistory[message]) {
            callback(squawkHistory[message]);
        }
    };

    /**
     * Sends a message of the specified type and value
     * @param {string} message The message type
     * @param {any} value The message value
     */
    Component.prototype.send = function (message: string, value: any): void {
        squawkHistory[message] = value;
        if (!squawkRegistry[message]) {
            return;
        }

        Object.getOwnPropertyNames(squawkRegistry[message]).forEach(subscriber => {
            let callback: ((message: any) => void) | undefined = squawkRegistry[message][subscriber];
            if (callback) {
                callback(value);
            }
        });
    };

    /** 
     * Sets the name of the component, which is used to track subscriptions
     * @param {string} name The name of the component
     */
    Component.prototype.squawk = function (name: string): void {
        this.__squawk_identity = name;
    };

    /**
     * Unregisters the component's subscriptions, either a specific one or all of them
     * @param {string} message Optional parameter specifying which subscription to cancel. If undefined, all subscriptions will be cancelled
     */
    Component.prototype.unregister = function (message?: string): void {
        if (!this.__squawk_identity) {
            return;
        }

        if (message && !squawkRegistry[message]) {
            return;
        }

        const subscriber: string = this.__squawk_identity;

        if (message) {
            squawkRegistry[message][subscriber] = undefined;
        } else {
            const messages: string[] = Object.getOwnPropertyNames(squawkRegistry);
            messages.forEach((message) => squawkRegistry[message][subscriber] = undefined);
        }
    };
})();
