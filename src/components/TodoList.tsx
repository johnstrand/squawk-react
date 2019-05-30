import React from "react";
import { useSquawk, TodoItem, update } from "../store/store";
import { TodoListItem } from "./TodoListItem";
import { Link } from "./Link";

export const TodoList = () => {
    const { items, filter } = useSquawk("items", "filter");

    const applyFilter = (item: TodoItem) => {
        return (
            filter === "all" ||
            (filter === "completed" && item.done) ||
            (filter === "pending" && !item.done)
        );
    };

    const list = items.filter(applyFilter);

    if (!list.length) {
        return !items.length || filter === "all" ? (
            <div>There are no items to display</div>
        ) : (
            <div>
                There are no items to display, you can try setting the filter to
                <Link onClick={() => update("filter", "all")}>All</Link>
            </div>
        );
    }

    return (
        <ul>
            {list.map(item => (
                <TodoListItem key={item.id} item={item} />
            ))}
        </ul>
    );
};
