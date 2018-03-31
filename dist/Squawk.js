import { Component } from "react";
var squawkRegistry = {};
var squawkHistory = {};
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
    var subscriber = this.__squawk__name;
    return Object.getOwnPropertyNames(squawkRegistry).filter(function (message) { return !!squawkRegistry[message][subscriber]; });
};
/**
 * Registers a subscription for a specific message. If Squawk has seen at least one message of that type before, the callback will
 * be immediately invoked with the last seen message.
 * @param {string} message The message type
 * @param {(value: T) => void} callback The callback which will be invoked when a message of previously specified type appears
 */
Component.prototype.register = function (message, callback) {
    if (!squawkRegistry[message]) {
        squawkRegistry[message] = {};
    }
    if (!this.__squawk__name) {
        throw new Error("squawk() must be run before a component may register for messages");
    }
    var subscriber = this.__squawk__name;
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
Component.prototype.send = function (message, value) {
    squawkHistory[message] = value;
    if (!squawkRegistry[message]) {
        return;
    }
    Object.getOwnPropertyNames(squawkRegistry[message]).forEach(function (subscriber) {
        var callback = squawkRegistry[message][subscriber];
        if (callback) {
            callback(value);
        }
    });
};
/**
 * Sets the name of the component, which is used to track subscriptions
 * @param {string} name The name of the component
 */
Component.prototype.squawk = function (name) {
    this.__squawk__name = name;
};
/**
 * Unregisters the component's subscriptions, either a specific one or all of them
 * @param {string} message Optional parameter specifying which subscription to cancel. If undefined, all subscriptions will be cancelled
 */
Component.prototype.unregister = function (message) {
    if (!this.__squawk__name) {
        return;
    }
    if (message && !squawkRegistry[message]) {
        return;
    }
    var subscriber = this.__squawk__name;
    if (message) {
        squawkRegistry[message][subscriber] = undefined;
    }
    else {
        var messages = Object.getOwnPropertyNames(squawkRegistry);
        messages.forEach(function (message) { return squawkRegistry[message][subscriber] = undefined; });
    }
};
