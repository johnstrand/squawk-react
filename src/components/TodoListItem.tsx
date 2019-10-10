import React from "react";
import { TodoItem } from "../store/store";
import { EditableText } from "./EditableText";
import { updateTodo, toggleTodo } from "../store/actions";

interface Props {
    item: TodoItem;
    loading: boolean;
}

export const TodoListItem = ({ item, loading }: Props) => {
    if (loading) {
        return <li>Loading...</li>;
    }
    return (
        <li>
            <input
                type="checkbox"
                disabled={loading}
                checked={item.done}
                id={`item_${item.id}`}
                onChange={() => toggleTodo(item.id)}
            />
            <EditableText
                text={item.text}
                update={text => updateTodo({ ...item, text })}
            />
        </li>
    );
};
