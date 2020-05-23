# Tutorial

First, create a new CRA project using the following command

```bash
npx create-react-app squawk-tutorial --template=typescript
```

Then remove all files and references to CSS, tests, and the logo.

(If you're lazy, you can download a starting project [here](./tutorial/squawk-tutorial.zip). Just extract that into an appropriate directory)

`App.tsx` should now look like this:

```tsx
import React from "react";

const App = () => {
  return <div></div>;
};

export default App;
```

Next, let's add `squawk-react` to the project:

```bash
npm i --save squawk-react
```

Let's now add a store. Create `Store.ts` in `src/`, and paste the following in file:

```typescript
import createStore from "squawk-react";

export interface Item {
  id: number;
  text: string;
}

interface AppState {
  items: Item[];
  count: number;
}

export const { action, useSquawk } = createStore<AppState>({
  items: [], // Initialize to empty list
  count: 0 // Initialize to zero
});
```

Notice that we're importing `createStore` from squawk. The interface Item is just a sample interface, but AppState is the type that describes the items in the global state. That is to say, each property of the interface is an individual, subscribable entity. Squawk is clever enough to figure out which components need to be re-rendered when even a _part_ of the state updates.

Next, create `Actions.ts` in `src/`, and paste the following in the file:

```typescript
import { action } from "./Store";

export const increment = action((state) => {
  return { count: state.count + 1 };
});

export const decrement = action((state) => {
  // Prevent value to go below zero
  return { count: Math.max(state.count - 1, 0) };
});

export const reset = action(() => {
  return { count: 0 };
});

export const addItem = action((state, text: string) => {
  // This can be ignored in the context of this tutorial, but
  // it searches the list of items for the highest ID (and defaults to 0)
  // and adds 1 to it for the next ID.
  const id = state.items.reduce((acc, cur) => (cur.id > acc ? cur.id : acc), 0) + 1;
  // Using a spread operator, add the new item to the end of the list
  // Why not use push? Arrays in JavaScript are reference types,
  // and push won't change the reference, which means that JavaScript
  // (and Squawk) won't be able to tell that anything has changed
  return { items: [...state.items, { id, text }] };
});
```

We've now created the 3 rough variants of actions:

- Action that receives the existing state and returns a modified version
- Action that disregards the existing state and simply sets a value
- Action that receives the existing state, and a payload, and uses the payload to modify the state

(You may have noticed that a fourth version exists, where one ignores the state and uses the payload to simply overwrite the existing state).

Note that the only time we specify a type for an action is when we have a payload, and the callback parameters themselves aren't typed. TypeScript is clever enough to figure out the types correctly without explicit typing.

The item an action returns will be used to update the state. Note that despite the state containing both count and items, we only need to return the property we wish to modify. Sometimes, an action might need to modify more than one property, and it is valid to return as few or as many state properties as necessary.

Should one find that there is no need to update the state, it is also valid to simply return `{}`, and no update will be performed at all.

Modify `App.tsx` to look like this:

```tsx
import React from "react";
import Counter from "./Counter";

const App = () => {
  return (
    <div>
      <Counter />
    </div>
  );
};

export default App;
```

**Don't worry about the errors**, and move on to create `Counter.tsx` with the following content:

```tsx
import React from "react";
import { useSquawk } from "./Store";
import { increment, reset, decrement } from "./Actions";

const Counter = () => {
  const { count } = useSquawk("count");

  return (
    <div>
      <h1>{count}</h1>
      <div>
        <button onClick={() => increment()}>+</button>
        <button onClick={() => reset()}>reset</button>
        <button onClick={() => decrement()}>-</button>
      </div>
    </div>
  );
};

export default Counter;
```

Here, we've imported the `useSquawk` hook, and 3 of the actions we defined earlier. The subscription from the component to squawks store is created through the following line in `Counter.tsx`:

```tsx
const { count } = useSquawk("count");
```

With TypeScript, you'll find that the arguments passed to `useSquawk` is limited to the names of the properties defined in the interface `AppState`, and the properties in the derived state match the passed in arguments.

Next, we simply render the value in count, and pass the actions into the event handlers of the buttons. If you run the app in its current state, you should find a nice big zero, and buttons that allow you to increase, decrease, and reset the number. You should also find that you are unable to go below zero.

Before we move on, this might be a good time to experiment a bit. Here are some suggestions:

- Make the increment method increment in larger intervals
- Add an action that sets count to a random value
- Add a max value for count
- Add a button that multiplies the current value

Let's move on, and return to our friend `App.tsx`. Now modify it to look like this:

```tsx
import React from "react";
import Counter from "./Counter";
import AddItem from "./AddItem";
import ItemList from "./ItemList";

const App = () => {
  return (
    <div>
      <Counter />
      <hr />
      <AddItem />
      <ItemList />
    </div>
  );
};

export default App;
```

Again, don't worry about the errors, and move on to create `AddItem.tsx`. It's time to mix local and global state:

```tsx
import React, { useState } from "react";
import { addItem } from "./Actions";

const AddItem = () => {
  const [text, setText] = useState("");
  const add = () => {
    addItem(text).then(() => setText(""));
  };

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.currentTarget.value)} />{" "}
      <button disabled={!text} onClick={add}>
        Add
      </button>
    </div>
  );
};

export default AddItem;
```

While you are typing, the component will, via `useState`, update its local state. Once you click the button, however, it will call the `addItem` action with the current text as payload, then await the action to finish, and finally clear the local state.

This tutorial doesn't use a remote API, so the call to addItem will return immediately. However, in a situation where an action will do one or more API calls, it might be very useful for a component to be able to wait for an action to finish. This allows the component to display a spinner or similar activities.

Next, create `ItemList.tsx`, and paste the following in the file:

```tsx
import React from "react";
import { useSquawk } from "./Store";

const ItemList = () => {
  const { items } = useSquawk("items");
  if (items.length === 0) {
    return <div>Empty list</div>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
};

export default ItemList;
```

Much like `Counter`, it uses `useSquawk` to create a subscription to the items property, and every time the Add button is clicked in `AddItem`, the list will re-render with the new content.

The tutorial is almost over, but before moving on, here are a few more suggestions to try out:

- Create a button that sets count to the length of the list
- Add an action that clears the list
- Refactor list item into a separate component, and make them editable
- Add a delete button
- Add new items to the start of the list
- Instead of finding the highest ID each time an item is added, make ID part of the global state, and increment it each time a new item is added

Finally, let's look at async actions. Squawk is clever enough to detect that an action returned a Promise and will resolve it.

Return to `Actions.ts` and modify it to look like this:

```tsx
import { action } from "./Store";

export const increment = action((state) => {
  return { count: state.count + 1 };
});

export const decrement = action((state) => {
  // Prevent value to go below zero
  return { count: Math.max(state.count - 1, 0) };
});

export const reset = action(() => {
  return { count: 0 };
});

// This action is now marked async
export const addItem = action(async (state, text: string) => {
  // This can be ignored in the context of this tutorial, but
  // it searches the list of items for the highest ID (and defaults to 0)
  // and adds 1 to it for the next ID.
  const id = state.items.reduce((acc, cur) => (cur.id > acc ? cur.id : acc), 0) + 1;

  // Wait 1 second
  await delay(1000);

  // Using a spread operator, add the new item to the end of the list
  // Why not use push? Arrays in JavaScript are reference types,
  // and push won't change the reference, which means that JavaScript
  // (and Squawk) won't be able to tell that anything has changed
  return { items: [...state.items, { id, text }] };
});

// Simple helper method that will resolve itself
// after a specified time in milliseconds, this
// is just used to simulate a delay due to waiting
// for a back end service
const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setInterval(resolve, ms);
  });
```

Note the changes, `action((state, text: string)) =>` is now `action(async (state, text: string)) =>`. Now you may use the `await` keyword within the action. This allows an action to perform asynchronous operations without the caller knowing the difference.

If you enter some text and press "Add" now, you'll find that it takes a second before the new item is added and the input field resets. This works even though the `AddItem` component hasn't been changed at all. As promised, Squawk silently handles the operations for you.

You'll also find that you can increment and decrement the number as you please, while the application remains responsive.

However, we might want to block the input field while the request is pending, so let's do that now. Open `AddItem.tsx` and modify it with the following:

```tsx
import React, { useState } from "react";
import { addItem } from "./Actions";

const AddItem = () => {
  const [text, setText] = useState("");
  // Add a loading indicator
  const [loading, setLoading] = useState(false);
  // Method is now async
  const add = async () => {
    // Enable loading indicator
    setLoading(true);
    // Await action
    await addItem(text);
    // Reset text and loading indicator
    setText("");
    setLoading(false);
  };

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.currentTarget.value)} disabled={loading} />{" "}
      <button disabled={!text || loading} onClick={add}>
        {loading ? "Loading..." : "Add"}
      </button>
    </div>
  );
};

export default AddItem;
```

Now when you click the Add button, both the button and the input field will be disabled, and the button will display "Loading..." rather than "Add".
