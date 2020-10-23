import React from "react";
import { Provider, useState, useDispatch } from "./store";
import "./App.css";

const Counter = () => {
  const state = useState();
  const dispatch = useDispatch();
  return (
    <>
      <span>{state.count}</span>
      <button onClick={() => dispatch({ type: "INCREMENT" })}>+1</button>
      <button onClick={() => dispatch({ type: "DECREMENT" })}>-1</button>
    </>
  );
};

const App = () => (
  <Provider>
    <Counter />
  </Provider>
);

export default App;
