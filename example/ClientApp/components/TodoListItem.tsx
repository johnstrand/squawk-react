import * as React from "react";
import { TodoItem } from "../scripts/TodoItem";
import { TodoEvents } from "../scripts/TodoEvents";

interface TodoListItemProps {
    item: TodoItem;
}

interface TodoState {
    item: TodoItem;
    editing: boolean;
}

export class TodoListItem extends React.Component<TodoListItemProps, TodoState> {
    constructor(props: TodoListItemProps) {
        super(props);
        this.state = {
            item: props.item,
            editing: false
        };
    }

    private handleToggle() {
        this.send(TodoEvents.TOGGLE_ITEM, this.state.item.id);
    }

    public render() {
        const { text, complete } = this.state.item;
        return (
            <div>
                <input type="checkbox" checked={complete} onChange={this.handleToggle.bind(this)} />
                {text}
            </div>);
    }
}