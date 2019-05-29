import React from "react";
import { TodoItem, update } from "../store/store";

interface Props {
    item: TodoItem;
}

export const TodoListItem = ({ item }: Props) => {
    const toggle = () => {
        update("toggle", item.id);
    }

    return <li>
        <input type="checkbox" checked={item.done} id={`item_${item.id}`} onChange={() => toggle()} />
        <label htmlFor={`item_${item.id}`}>{item.text}</label>
    </li>
}