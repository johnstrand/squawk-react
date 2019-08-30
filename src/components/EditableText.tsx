import React, { useState } from "react";
import { Link } from "./Link";

interface Props {
    text: string;
    update: (newText: string) => any;
}

export const EditableText = (props: Props) => {
    const [text, setText] = useState(props.text);
    const [editing, setEditing] = useState(false);

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if(e.keyCode === 10 || e.keyCode === 13) {
            setEditing(false);
            props.update(text);
        }
    }

    return editing ? <><input value={text} onKeyDown={onKey} onChange={({ currentTarget }) => setText(currentTarget.value)} /></> :
     <>
     <Link onClick={() => setEditing(true)}>{text}</Link>
     </>;
};
