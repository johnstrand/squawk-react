import React from "react";
import { event } from "../store/store";

export const CommandBar = () => {
    const clearAll = () => {
        if(window.confirm("Are you sure that you want to remove all items?")) {
            event("clear-all");
        }
    }

    const clearCompleted = () => {
        if(window.confirm("Are you sure that you want to remove all completed items?")) {
            event("clear-completed");
        }
    }

    return <div>
        <button onClick={() => clearAll()}>Remove all</button>
        <button onClick={() => clearCompleted()}>Remove all completed</button>
    </div>
}