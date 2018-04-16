import * as React from "react";
import { TodoItem } from "../scripts/TodoItem";
import { TodoEvents } from "../scripts/TodoEvents";

interface TodoListAddItemState {
    value: string;
}

export class TodoListAddItem extends React.Component<{}, TodoListAddItemState> {
    constructor(props: {}) {
        super(props);
        this.state = { value: "" };
    }

    private handleChange(ev: React.SyntheticEvent<HTMLInputElement>) {
        const { value } = ev.currentTarget;
        this.setState({ value });
    }

    private handleSubmit() {
        let { value } = this.state;
        this.send(TodoEvents.ADD_ITEM, value);
        value = "";
        this.setState({ value });
    }

    public render() {
        return <div>
            <input onChange={this.handleChange.bind(this)} value={this.state.value} />
            <button onClick={this.handleSubmit.bind(this)} disabled={!this.state.value.trim()}>Add</button>
        </div>
    }
}