import React from 'react';
import { AddTodo } from './components/AddTodo';
import { TodoList } from './components/TodoList';
import { CommandBar } from './components/CommandBar';
import { Filter } from './components/Filter';

const App: React.FC = () => {
  return (
    <div>
      <AddTodo />
      <CommandBar />
      <Filter />
      <TodoList />
    </div>
  );
}

export default App;
