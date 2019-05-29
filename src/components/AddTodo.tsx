import React, { useState } from "react";
import { update } from "../store/store";

export const AddTodo = () => {
    const [text, setText] = useState("");
    const keydown = (key: number) => {
        if(key !== 13) {
            return;
        }

        add();
    }

    const add = () => {
        if(!text) {
            return;
        }

        update("add", { done: false, id: 0, text });
        setText("");
    }

    return <input 
        value={text}
        onKeyDown={({ keyCode }) => keydown(keyCode)}
        onChange={({ currentTarget }) => setText(currentTarget.value)} />;
}