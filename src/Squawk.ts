import { Component } from 'react';

declare module 'react' {
    interface Component<P, S> {
        register<T>(message: string, callback: (value: T) => void): void;
        unregister(): void;
        send(message: string, value: any): void;
        setSquawk(name: string): void;
        __squawk__name: string;
    }
}

let squawk_registry: { [message: string]: { [subscriber: string]: ((value: any) => void) | undefined } } = {};
let squawk_history: { [message: string]: any } = {};

Component.prototype.setSquawk = function (name: string) {
    this.__squawk__name = name;
}

Component.prototype.register = function <T>(message: string, callback: (value: T) => void) {
    if (!squawk_registry[message]) {
        squawk_registry[message] = {};
    }

    if (!this.__squawk__name) {
        throw 'setSquawk must be run before a component may register for messages';
    }

    let subscriber = this.__squawk__name;

    console.log(`SQUAWK: Registering ${subscriber} for ${message}`);
    squawk_registry[message][subscriber] = callback;

    if (squawk_history[message]) {
        callback(squawk_history[message]);
    }
}

Component.prototype.unregister = function () {
    if (!this.__squawk__name) {
        return;
    }

    let subscriber = this.__squawk__name;
    console.log(`SQUAWK: Unregistering ${subscriber}`);
    let messages = Object.getOwnPropertyNames(squawk_registry);
    messages.forEach(message => squawk_registry[message][subscriber] = undefined);
}

Component.prototype.send = function (message: string, value: any) {
    console.log(`SQUAWK: Sending ${message} => ${value}`);
    squawk_history[message] = value;
    if (!squawk_registry[message]) {
        return;
    }

    Object.getOwnPropertyNames(squawk_registry[message]).forEach(subscriber => {
        let callback = squawk_registry[message][subscriber];
        if (callback)
            callback(value)
    });
}
