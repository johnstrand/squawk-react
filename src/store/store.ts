import createStore from "squawk-react";

export interface TodoItem {
    id: number;
    text: string;
    done: boolean;
}

export type Filter = "all" | "pending" | "completed";

interface AppState {
    id: number;
    items: TodoItem[];
    filter: Filter;
}

// Set up initial value of store
export const {
    action,
    get,
    pending,
    subscribe,
    update,
    usePending,
    useSquawk
} = createStore<AppState>({
    id: 1,
    items: [],
    filter: "all"
});
