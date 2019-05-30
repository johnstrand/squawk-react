import createStore from "squawk-react";

export interface TodoItem {
    id: number;
    text: string;
    done: boolean;
}

export type Filter = "all" | "pending" | "completed";

type Events = "clear-all" | "clear-completed" | "complete-all";

interface AppState {
    add: TodoItem | null;
    id: number;
    items: TodoItem[];
    filter: Filter;
    toggle: number | null;
}

// Set up initial value of store
export const { event, get, onEvent, subscribe, update, useSquawk } = createStore<AppState, Events>({
    add: null,
    id: 1,
    items: [],
    filter: "all",
    toggle: null
});