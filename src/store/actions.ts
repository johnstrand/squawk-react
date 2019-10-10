import { action, TodoItem, Filter, pending } from "./store";

const delay = () => {
    return new Promise(resolve => {
        window.setTimeout(resolve, 1000);
    });
};

export const toggleTodo = action<number>(async (store, id) => {
    pending("items", true);
    await delay();
    pending("items", false);
    return {
        items: store.items.map(item =>
            item.id === id ? { ...item, done: !item.done } : item
        )
    };
});

export const addTodo = action<TodoItem>(async (store, item) => {
    pending("items", true);
    await delay();
    item.id = store.id + 1;
    pending("items", false);
    return { items: [...store.items, item], id: item.id };
});

export const updateTodo = action<TodoItem>((store, item) => {
    return { items: store.items.map(i => (i.id === item.id ? item : i)) };
});

export const setFilter = action<Filter>((_, filter) => {
    return { filter };
});

export const clearAll = action(_ => {
    if (!window.confirm("Are you sure?")) {
        return {};
    }
    return { items: [], id: 1 };
});

export const clearCompleted = action(state => {
    if (!window.confirm("Are you sure?")) {
        return {};
    }
    return { items: state.items.filter(item => !item.done) };
});

export const completeAll = action(state => {
    if (!window.confirm("Are you sure?")) {
        return {};
    }
    return { items: state.items.map(item => ({ ...item, done: true })) };
});
