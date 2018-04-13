import * as React from "react";
import "squawk-react";
import { TodoListItem } from "./TodoListItem";
import { TodoItem } from "../scripts/TodoItem";
import { TodoEvents, TodoFilter } from "../scripts/TodoEvents";

interface TodoListState {
    items: TodoItem[];
    filter: TodoFilter;
}

export class TodoList extends React.Component<{}, TodoListState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            items: [],
            filter: TodoFilter.ALL_ITEMS
        };
    }

    private applyFilter(item: TodoItem) {
        const { filter } = this.state;

        return (
            filter == TodoFilter.ALL_ITEMS ||
            (filter == TodoFilter.COMPLETE && item.complete) ||
            (filter == TodoFilter.INCOMPLETE && !item.complete)
        );

    }

    public render() {
        const { items } = this.state;
        return (
            <div>
                {items.filter(this.applyFilter.bind(this)).map(item => <TodoListItem key={item.id} item={item} />)}
            </div>);
    }

    public componentDidMount() {
        this.squawk("todo_list");

        this.register<string>(TodoEvents.ADD_ITEM, text => {
            if (text == null)
                return;
            const { items } = this.state;
            items.push({ id: items.length + 1, complete: false, text });
            this.setState({ items });
            this.send(TodoEvents.ADD_ITEM, null); // Clear history
        });

        this.register<number>(TodoEvents.TOGGLE_ITEM, id => {
            this.setState({
                items: this.state.items.map(item => {
                    if (id == item.id) {
                        item.complete = !item.complete
                    }
                    return item;
                })
            });
        });

        this.register<TodoFilter>(TodoEvents.SET_FILTER, filter => this.setState({ filter }));
    }

    public componentWillUnmount() {
        this.unregister();
    }
}