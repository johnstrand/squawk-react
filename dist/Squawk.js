import { Component } from 'react';
var squawk_registry = {};
var squawk_history = {};
Component.prototype.setSquawk = function (name) {
    this.__squawk__name = name;
};
Component.prototype.register = function (message, callback) {
    if (!squawk_registry[message]) {
        squawk_registry[message] = {};
    }
    if (!this.__squawk__name) {
        throw 'setSquawk must be run before a component may register for messages';
    }
    var subscriber = this.__squawk__name;
    squawk_registry[message][subscriber] = callback;
    if (squawk_history[message]) {
        callback(squawk_history[message]);
    }
};
Component.prototype.unregister = function () {
    if (!this.__squawk__name) {
        return;
    }
    var subscriber = this.__squawk__name;
    var messages = Object.getOwnPropertyNames(squawk_registry);
    messages.forEach(function (message) { return squawk_registry[message][subscriber] = undefined; });
};
Component.prototype.send = function (message, value) {
    squawk_history[message] = value;
    if (!squawk_registry[message]) {
        return;
    }
    Object.getOwnPropertyNames(squawk_registry[message]).forEach(function (subscriber) {
        var callback = squawk_registry[message][subscriber];
        if (callback)
            callback(value);
    });
};
