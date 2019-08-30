import createStore from "squawk-react";

export interface TodoItem {
    id: number;
    text: string;
    done: boolean;
}

export type Filter = "all" | "pending" | "completed";

type Events = "clear-all" | "clear-completed" | "complete-all";

interface AppState {
    id: number;
    items: TodoItem[];
    filter: Filter;
}

// Set up initial value of store
export const { action, event, get, onEvent, subscribe, update, useSquawk } = createStore<AppState, Events>({
    id: 1,
    items: [],
    filter: "all"
});