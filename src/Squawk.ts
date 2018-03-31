import { Component } from "react";

declare module "react" {
    interface Component<P, S> {
        __squawk_identity: string;
        register<T>(message: string, callback: (value: T) => void): void;
        unregister(): void;
        unregister(message: string): void;
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

Component.prototype.squawk = function (name: string): void {
    this.__squawk__name = name;
};

Component.prototype.register = function <T>(message: string, callback: (value: T) => void): void {
    if (!squawkRegistry[message]) {
        squawkRegistry[message] = {};
    }

    if (!this.__squawk__name) {
        throw new Error("squawk must be run before a component may register for messages");
    }

    const subscriber: string = this.__squawk__name;

    squawkRegistry[message][subscriber] = callback;

    if (squawkHistory[message]) {
        callback(squawkHistory[message]);
    }
};

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
