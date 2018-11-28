import * as React from "react";

interface ISinkState {
  text: string[];
}

export class Sink extends React.Component<{}, ISinkState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      text: []
    };
  }
  public render() {
    const { text } = this.state;
    return text.map((v, i) => <p key={i}>{v}</p>);
  }
  public componentWillMount() {
    this.squawk("sink");
    this.register<string[]>("add_message", (messages) => {
      this.setState({ text: messages });
    });
  }
  public componentWillUnmount() {
    this.unregister();
  }
}
