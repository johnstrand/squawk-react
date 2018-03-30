# squawk-react
A simple support library to insert message passing capabilities into React components.

Use it as such:
```typescript
import 'squawk-react';

...

public componentDidMount() {
    this.squawk('my_component_name'); // This helps Squawk track the subscriber
    this.register<number>('a_message_type', (num) => {
      this.setState({ myNumber: num });
    });
}

public componentWillUnmount() {
    this.unregister(); // Unregister all of the component's subscriptions
}
```

There is also a send method:
```typescript
this.send('another_message_type', 'hello world!');
```

If a message has already been sent for a certain type, any later subscribers will receive a copy of the last message sent, immediately
on a call to register()
