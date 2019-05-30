import React, { useState } from "react";
import { Link } from "./Link";

interface Props {
    text: string;
}

export const EditableText = (props: Props) => {
    const [text, setText] = useState(props.text);
    const [editing, setEditing] = useState(false);

    return editing ? <><input value={text} /></> :
     <>
     <Link onClick={() => setEditing(true)}>{text}</Link>
     </>;
};
