import { subscribe, get, update } from "./store";

subscribe("addOrUpdate", todo => {
    if(!todo) {
        return;
    }

    if(todo.id) {
        update("items", items => items.map(item => item.id === todo.id ? todo : item));
        return;
    }

    todo.id = get("id");

    update(({ items }) => ({
        id: todo.id + 1,
        items: [...items, todo],
    }));
});

subscribe("toggle", id => {
    if(!id) {
        return;
    }

    update("items", items =>
        items.map(item =>
            ({ ...item, done: item.id === id ? !item.done : item.done })));
});