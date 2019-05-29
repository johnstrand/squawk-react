import { onEvent, update } from "./store";

onEvent("clear-all", () => update({ items: [], id: 1 }));

onEvent("clear-completed", () => update("items", items => items.filter(item => !item.done)));