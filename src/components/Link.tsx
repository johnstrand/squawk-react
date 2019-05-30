import React from "react"

export const Link = (props: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) => {
    let { className, ...rest } = props;

    className += " link-button";

    props = { ...rest, className };

    return <button {...props}>{props.children}</button>
}