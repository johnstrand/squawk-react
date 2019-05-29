import React from "react";
import { useSquawk } from "../store/store";
import { TodoListItem } from "./TodoListItem";

export const TodoList = () => {
    const { items } = useSquawk("items");
    return <ul>
        {items.map(item => <TodoListItem key={item.id} item={item} />)}
    </ul>
}