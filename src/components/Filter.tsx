import React from "react";
import { useSquawk, Filter as FilterType, update } from "../store/store";

export const Filter = () => {
    const { filter } = useSquawk("filter");

    const setFilter = (f: FilterType) => () => {
        update("filter", f);
    };

    return (
        <div>
            <span>Filter: </span>
            <input
                type="radio"
                id="all"
                name="filter"
                checked={filter === "all"}
                onChange={setFilter("all")}
            />
            <label htmlFor="all">All</label>
            <input
                type="radio"
                id="pending"
                name="filter"
                checked={filter === "pending"}
                onChange={setFilter("pending")}
            />
            <label htmlFor="pending">Pending</label>
            <input
                type="radio"
                id="completed"
                name="filter"
                checked={filter === "completed"}
                onChange={setFilter("completed")}
            />
            <label htmlFor="completed">Completed</label>
        </div>
    );
};
