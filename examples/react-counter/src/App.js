import React, { createContext, useContext, useReducer } from "react";
import { wrapWithDevtools, initDevtools } from "reduce-devtools-extension/dist/index.js";

const initialState = {
  count: 0
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return {
        count: state.count + 1,
      };
    case 'DECREMENT':
      return {
        count: state.count - 1,
      };
    default:
      return state;
  }
};

const useValue = () => useReducer(wrapWithDevtools(reducer), initialState);

const Context = createContext(null);

const useGlobalState = () => {
  const value = useContext(Context);
  if (value === null) throw new Error('Please add GlobalStateProvider');
  return value;
};

const GlobalStateProvider = ({ children }) => (
  <Context.Provider value={useValue()}>{children}</Context.Provider>
);

const Counter = () => {
  const [state, dispatch] = useGlobalState();
  initDevtools(initialState, dispatch)
  return (
    <div>
      {state.count}
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+1</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-1</button>
    </div>
  );
};

const App = () => (
  <GlobalStateProvider>
    <Counter />
  </GlobalStateProvider>
);

export default App;
