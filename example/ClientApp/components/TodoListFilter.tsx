import * as React from "react";
import "squawk-react";
import { TodoItem } from "../scripts/TodoItem";
import { TodoEvents, TodoFilter } from "../scripts/TodoEvents";

interface TodoListFilterState {
    filter: TodoFilter
}

export class TodoListFilter extends React.Component<{}, TodoListFilterState> {
    constructor(props: {}) {
        super(props);
        this.state = { filter: TodoFilter.ALL_ITEMS }
    }

    private handleSelectFilter(filter: TodoFilter) {
        this.send(TodoEvents.SET_FILTER, filter);
        this.setState({ filter });
    }

    public render() {
        return (
            <div>
                <label>
                    All items
                    <input
                        type="radio"
                        checked={this.state.filter == TodoFilter.ALL_ITEMS}
                        onChange={this.handleSelectFilter.bind(this, TodoFilter.ALL_ITEMS)}
                        name="filter_select" />
                </label>
                <label>
                    Completed items
                    <input
                        type="radio"
                        checked={this.state.filter == TodoFilter.COMPLETE}
                        onChange={this.handleSelectFilter.bind(this, TodoFilter.COMPLETE)}
                        name="filter_select" />
                </label>
                <label>
                    Incomplete items
                    <input
                        type="radio"
                        checked={this.state.filter == TodoFilter.INCOMPLETE}
                        onChange={this.handleSelectFilter.bind(this, TodoFilter.INCOMPLETE)}
                        name="filter_select" />
                </label>
            </div>);
    }
}