import * as React from "react";

interface ISourceState {
  text: string;
}

export class Source extends React.Component<{}, ISourceState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      text: "",
    };
  }

  public render() {
    return (
      <div>
        <input
          value={this.state.text}
          onChange={(e: React.SyntheticEvent<HTMLInputElement>) =>
            this.setState({ text: e.currentTarget.value })
          }
        />
        <button onClick={this.sendMessage}>Send</button>
      </div>
    );
  }

  private sendMessage = () => {
    this.send("add_message", (messages: string[]) => {
      if (!messages) {
        messages = [];
      }
      messages.push(this.state.text);
      return messages;
    });

    this.setState({ text: "" });
  }
}
