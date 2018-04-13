import * as React from "react";
import { TodoList } from "./TodoList";
import { TodoListAddItem } from "./TodoListAddItem";
import { TodoListFilter } from "./TodoListFilter";

export class TodoApp extends React.Component<{}, {}> {
    public render() {
        return (
            <div>
                <TodoList />
                <TodoListAddItem />
                <TodoListFilter />
            </div>);
    }
}