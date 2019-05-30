import React from "react";
import { event } from "../store/store";
import { Link } from "./Link";

export const CommandBar = () => {
    const clearAll = () => () => {
        if (window.confirm("Are you sure that you want to remove all items?")) {
            event("clear-all");
        }
    };

    const clearCompleted = () => () => {
        if (
            window.confirm(
                "Are you sure that you want to remove all completed items?"
            )
        ) {
            event("clear-completed");
        }
    };

    const completeAll = () => () => {
        if (
            window.confirm(
                "Are you sure that you wish to mark all items as completed?"
            )
        ) {
            event("complete-all");
        }
    };

    return (
        <div>
            <Link onClick={clearAll()}>Remove all</Link>
            <Link onClick={clearCompleted()}>Remove all completed</Link>
            <Link onClick={completeAll()}>Mark all as complete</Link>
        </div>
    );
};
