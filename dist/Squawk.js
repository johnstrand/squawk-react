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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import * as React from "react";
var RootTracker = (function () {
    var squawkRegistry = {};
    var squawkState = {};
    return {
        register: function (subscriber, event, callback) {
            if (!squawkRegistry[event]) {
                squawkRegistry[event] = {};
            }
            squawkRegistry[event][subscriber] = callback;
        },
        send: function (event, reducer) {
            var newState = reducer(squawkState[event]);
            squawkState[event] = newState;
            if (!squawkRegistry[event]) {
                return;
            }
            Object.getOwnPropertyNames(squawkRegistry[event]).forEach(function (subscriber) {
                if (!squawkRegistry[event][subscriber]) {
                    return;
                }
                squawkRegistry[event][subscriber](newState);
            });
        },
        unregister: function (subscriber) {
            Object.getOwnPropertyNames(squawkRegistry).forEach(function (event) {
                squawkRegistry[event][subscriber] = undefined;
            });
        },
        get: function (event) {
            return squawkState[event];
        }
    };
})();
function update(event, reducer) {
    RootTracker.send(event, reducer);
}
function squawk(componentTypeConstructor) {
    var generateName = function () {
        return Math.random()
            .toString(36)
            .substring(7);
    };
    var name = generateName();
    var trackerWrapper = {
        register: function (event, callback) {
            RootTracker.register(name, event, callback);
        },
        send: function (event, reducer) {
            RootTracker.send(event, reducer);
        },
        get: function (event) {
            return RootTracker.get(event);
        }
    };
    var ConstructedType = componentTypeConstructor(trackerWrapper);
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.render = function () {
            return React.createElement(ConstructedType, __assign({}, this.props));
        };
        class_1.prototype.componentWillUnmount = function () {
            RootTracker.unregister(name);
        };
        return class_1;
    }(React.Component));
}
export { squawk, update };
