import React from "react";
import { Provider, useState, useDispatch } from "./store";
import "./App.css";

const Counter = () => {
  const state = useState();
  const dispatch = useDispatch();
  return (
    <p>
      Clicked: <span>{state.count}</span> times
      <button onClick={() => dispatch({ type: "INCREMENT" })}>+</button>
      <button onClick={() => dispatch({ type: "DECREMENT" })}>-</button>
    </p>
  );
};

const App = () => (
  <Provider>
    <Counter />
  </Provider>
);

export default App;
