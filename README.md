# squawk-react
A simple support library to insert message passing capabilities into React components.

Note: The architecture is rewritten with squawk-react 2.0

The tracker sent into the squawk method exposes three methods:
* send - Which specifies the name of the event to send, and a reducer which receives the current value of the event and is expected to return the new value
* register - Which specifies the name of the event to listen for, and the callback to invoke when the event is raised
* get - Which specifies which event to get the last known value for

Use it as such:
```typescript
// Producer
import * as React from "react";
import { squawk } from "squawk-react";

interface IAddItemState {
    text: string;
}

export const AddItem = squawk(
    tracker =>
        class extends React.Component<{}, IAddItemState> {
            constructor(props: {}) {
                super(props);
                this.state = {
                    text: ""
                };
            }
            itemTextChange = (ev: React.SyntheticEvent<HTMLInputElement>) => {
                this.setState({ text: ev.currentTarget.value });
            };
            addItem = () => {
                tracker.send<string[]>("ITEM_LIST", list => [...(list || []), this.state.text]);
                this.setState({ text: "" });
            };
            render() {
                return (
                    <div>
                        <input
                            type="text"
                            value={this.state.text}
                            onChange={this.itemTextChange}
                        />
                        <button
                            disabled={!this.state.text}
                            onClick={this.addItem}
                        >
                            Add
                        </button>
                    </div>
                );
            }
        }
);

// Consumer
import * as React from "react";
import { squawk } from "squawk-react";

interface IItemListState {
    items: string[];
}

export const ItemList = squawk(
    tracker =>
        class extends React.Component<{}, IItemListState> {
            constructor(props: {}) {
                super(props);
                this.state = {
                    items: tracker.get<string[]>("ITEM_LIST") || []
                };

                tracker.register<string[]>("ITEM_LIST", items =>
                    this.setState({ items })
                );
            }
            render() {
                return (
                    <div>
                        {this.state.items.map((item, index) => (
                            <p key={index}>{item}</p>
                        ))}
                    </div>
                );
            }
        }
);
```
