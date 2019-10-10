import React from "react";
import { Link } from "./Link";
import { clearAll, clearCompleted, completeAll } from "../store/actions";

export const CommandBar = () => {
    return (
        <div>
            <Link onClick={clearAll}>Remove all</Link>
            <Link onClick={clearCompleted}>Remove all completed</Link>
            <Link onClick={completeAll}>Mark all as complete</Link>
        </div>
    );
};
