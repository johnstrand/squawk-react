var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { Component } from "react";
import * as React from "react";
(function () {
    /**
     * Contains a list of messages and their subscribers
     */
    var squawkRegistry = {};
    /**
     * Contains the last payload of each message type
     */
    var squawkHistory = {};
    /**
     * Removes the last seen message of the specified type
     * @param {string} message Message type
     */
    Component.prototype.clear = function (message) {
        squawkHistory[message] = undefined;
    };
    /**
     * Retrieves the last seen message of the specified type
     * @param {string} message Message type
     * @returns {T | undefined} A message of type T (or undefined, if the message has not been previously seen)
     */
    Component.prototype.getMessage = function (message) {
        if (squawkHistory[message]) {
            return squawkHistory[message];
        }
        else {
            return undefined;
        }
    };
    /**
     * Retrieves a list of message types that the current component is subscribed to
     * @returns {string[]} A list of message types
     */
    Component.prototype.getRegistrations = function () {
        var subscriber = this.__squawk_identity;
        return Object.getOwnPropertyNames(squawkRegistry).filter(function (message) { return !!squawkRegistry[message][subscriber]; });
    };
    /**
     * Registers a subscription for a specific message. If Squawk has seen at least one message of that type before, the callback will
     * be immediately invoked with the last seen message.
     * @param {string} message The message type
     * @param {(value: T) => void} callback The callback which will be invoked when a message of previously specified type appears
     * @param {boolean} ignoreLast Indicates that the callback should not be immediately called even if there exists a previous message of the specified type
     */
    Component.prototype.register = function (message, callback, skipLast) {
        if (!squawkRegistry[message]) {
            squawkRegistry[message] = {};
        }
        if (!this.__squawk_identity) {
            throw new Error("squawk() must be run before a component may register for messages");
        }
        var subscriber = this.__squawk_identity;
        squawkRegistry[message][subscriber] = callback;
        // Immediately run callback if previous message exists, and skipLast flag is set to false
        if (!skipLast && squawkHistory[message]) {
            callback(squawkHistory[message]);
        }
    };
    /**
     * Sends a message of the specified type and value
     * @param {string} message The message type
     * @param {any} value The message value, or reducer, which will receive the previous value as a parameter
     */
    Component.prototype.send = function (message, value) {
        if (typeof value === "function") {
            value = value(squawkHistory[message]);
        }
        squawkHistory[message] = value;
        if (!squawkRegistry[message]) {
            return;
        }
        Object.getOwnPropertyNames(squawkRegistry[message]).forEach(function (subscriber) {
            var callback = squawkRegistry[message][subscriber];
            if (!callback) {
                return;
            }
            callback(value);
        });
    };
    /**
     * Sets the name of the component, which is used to track subscriptions
     * @param {string} name The name of the component
     */
    Component.prototype.squawk = function (name) {
        this.__squawk_identity = name;
    };
    /**
     * Unregisters the component's subscriptions, either a specific one or all of them
     * @param {string} message Optional parameter specifying which subscription to cancel. If undefined, all subscriptions will be cancelled
     */
    Component.prototype.unregister = function (message) {
        if (!this.__squawk_identity) {
            return;
        }
        if (message && !squawkRegistry[message]) {
            return;
        }
        var subscriber = this.__squawk_identity;
        if (message) {
            squawkRegistry[message][subscriber] = undefined;
        }
        else {
            var messages = Object.getOwnPropertyNames(squawkRegistry);
            messages.forEach(function (message) { return (squawkRegistry[message][subscriber] = undefined); });
        }
    };
})();
export function squawk(Component) {
    var generateName = function () {
        return Math.random()
            .toString(36)
            .substring(7);
    };
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1(props) {
            var _this = _super.call(this, props) || this;
            Component.prototype.squawk(generateName());
            return _this;
        }
        class_1.prototype.render = function () {
            return React.createElement(Component, null);
        };
        class_1.prototype.componentWillUnmount = function () {
            Component.prototype.unregister();
        };
        return class_1;
    }(React.Component));
}
