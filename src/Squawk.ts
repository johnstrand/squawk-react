import { Component } from "react";

declare module "react" {
    interface Component<P, S> {
        __squawk_identity: string;
        register<T>(message: string, callback: (value: T) => void): void;
        unregister(message?: string): void;
        send(message: string, value: any): void;
        squawk(name: string): void;
    }
}

const squawkRegistry: { 
    [message: string]: { 
        [subscriber: string]: ((value: any) => void) | undefined 
    } 
} = {};

const squawkHistory: { 
    [message: string]: any 
} = {};

/** 
 * Sets the name of the component, which is used to track subscriptions
 * @param {string} name The name of the component
 */
Component.prototype.squawk = function (name: string): void {
    this.__squawk__name = name;
};

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

    if (!this.__squawk__name) {
        throw new Error("squawk() must be run before a component may register for messages");
    }

    const subscriber: string = this.__squawk__name;

    squawkRegistry[message][subscriber] = callback;

    if (squawkHistory[message]) {
        callback(squawkHistory[message]);
    }
};

/**
 * Unregisters the component's subscriptions, either a specific one or all of them
 * @param {string} message Optional parameter specifying which subscription to cancel. If undefined, all subscriptions will be cancelled
 */
Component.prototype.unregister = function (message?: string): void {
    if (!this.__squawk__name) {
        return;
    }

    if (message && !squawkRegistry[message]) {
        return;
    }

    const subscriber: string = this.__squawk__name;

    if (message) {
        squawkRegistry[message][subscriber] = undefined;
    } else {
        const messages: string[] = Object.getOwnPropertyNames(squawkRegistry);
        messages.forEach((message) => squawkRegistry[message][subscriber] = undefined);
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
        let callback: (message: any) => void = squawkRegistry[message][subscriber];
        if (callback) {
            callback(value);
        }
    });
};
