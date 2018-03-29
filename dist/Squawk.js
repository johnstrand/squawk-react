import { Component } from "react";
var squawkRegistry = {};
var squawkHistory = {};
Component.prototype.squawk = function (name) {
    this.__squawk__name = name;
};
Component.prototype.register = function (message, callback) {
    if (!squawkRegistry[message]) {
        squawkRegistry[message] = {};
    }
    if (!this.__squawk__name) {
        throw new Error("squawk must be run before a component may register for messages");
    }
    var subscriber = this.__squawk__name;
    squawkRegistry[message][subscriber] = callback;
    if (squawkHistory[message]) {
        callback(squawkHistory[message]);
    }
};
Component.prototype.unregister = function () {
    if (!this.__squawk__name) {
        return;
    }
    var subscriber = this.__squawk__name;
    var messages = Object.getOwnPropertyNames(squawkRegistry);
    messages.forEach(function (message) { return squawkRegistry[message][subscriber] = undefined; });
};
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
