import React, { useMemo } from "react";
import { useSquawk, TodoItem, usePending, Filter } from "../store/store";
import { TodoListItem } from "./TodoListItem";
import { Link } from "./Link";
import { setFilter } from "../store/actions";

const applyFilter = (item: TodoItem, filter: Filter) => {
    return (
        filter === "all" ||
        (filter === "completed" && item.done) ||
        (filter === "pending" && !item.done)
    );
};

export const TodoList = () => {
    const { items, filter } = useSquawk("items", "filter");
    const loading = usePending("items");

    const list = useMemo(
        () => items.filter(item => applyFilter(item, filter)),
        [items, filter]
    );

    if (!list.length) {
        return !items.length || filter === "all" ? (
            <div>There are no items to display</div>
        ) : (
            <div>
                There are no items to display, you can try setting the filter to
                <Link onClick={() => setFilter("all")}>All</Link>
            </div>
        );
    }

    return (
        <ul>
            {list.map(item => (
                <TodoListItem loading={loading} key={item.id} item={item} />
            ))}
        </ul>
    );
};
