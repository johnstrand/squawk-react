import React from "react";
import { TodoItem } from "../store/store";
import { EditableText } from "./EditableText";
import { updateTodo, toggleTodo } from "../store/actions";

interface Props {
    item: TodoItem;
}

export const TodoListItem = ({ item }: Props) => {

    return (
        <li>
            <input
                type="checkbox"
                checked={item.done}
                id={`item_${item.id}`}
                onChange={() => toggleTodo(item.id)}
            />
            <EditableText text={item.text} update={text => updateTodo({ ...item, text })} />
        </li>
    );
};
