import * as React from "react";
import * as ReactDOM from "react-dom";
import "squawk-react";
import { Sink } from "./components/Sink";
import { Source } from "./components/Source";

const Root = () =>
    <div>
        <Source />
        <Sink />
        </div>;

ReactDOM.render(<Root />, document.getElementById("index"));
