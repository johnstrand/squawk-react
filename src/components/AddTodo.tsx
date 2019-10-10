import React, { useState } from "react";
import { Link } from "./Link";
import { addTodo } from "../store/actions";
import { usePending } from "../store/store";

export const AddTodo = () => {
    const loading = usePending("items");
    const [text, setText] = useState("");
    const keydown = (key: number) => {
        if (key !== 13) {
            return;
        }

        add();
    };

    const add = () => {
        if (!text.trim()) {
            return;
        }

        addTodo({ done: false, id: 0, text: text.trim() });
        setText("");
    };

    return (
        <div>
            <input
                disabled={loading}
                value={text}
                onKeyDown={({ keyCode }) => keydown(keyCode)}
                onChange={({ currentTarget }) => setText(currentTarget.value)}
            />
            <Link disabled={!text.trim()} onClick={() => add()}>
                Add
            </Link>
        </div>
    );
};
