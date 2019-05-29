import React from 'react';
import { AddTodo } from './components/AddTodo';
import { TodoList } from './components/TodoList';
import { CommandBar } from './components/CommandBar';

const App: React.FC = () => {
  return (
    <div>
      <AddTodo />
      <CommandBar />
      <TodoList />
    </div>
  );
}

export default App;
