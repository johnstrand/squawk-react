# squawk-react
A simple support library to insert message passing capabilities into React components.

The example folder contains a simple todo-app, demonstrating the capabilities of the component.

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

There is also a send method, with two overloads:

The first one will simply send a message
```typescript
this.send('another_message_type', 'hello world!');
```

The second one works as a reducer, the callback receive the current (latest) value of the specified message, and is expected to return a new value
```typescript
this.send('another_message_type', messages => [...messages, 'hello world']);
```

If a message has already been sent for a certain type, any later subscribers will receive a copy of the last message sent, immediately
on a call to register()
