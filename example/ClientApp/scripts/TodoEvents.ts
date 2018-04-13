export enum TodoEvents {
    ADD_ITEM = "ADD_ITEM",
    UPDATE_ITEM = "UPDATE_ITEM",
    TOGGLE_ITEM = "TOGGLE_ITEM",
    SET_FILTER = "SET_FILTER"
}

export enum TodoFilter {
    ALL_ITEMS,
    INCOMPLETE,
    COMPLETE
}