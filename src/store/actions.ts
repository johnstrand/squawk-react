import { action, TodoItem } from "./store";

export const toggleTodo = action<number>((store, id) => {
    return {
        items: store.items.map(item =>
            item.id === id ? { ...item, done: !item.done } : item
        )
    };
});

export const addTodo = action<TodoItem>((store, item) => {
    item.id = store.id + 1;
    return { items: [...store.items, item], id: item.id };
});

export const updateTodo = action<TodoItem>((store, item) => {
    return { items: store.items.map(i => (i.id === item.id ? item : i)) };
});
