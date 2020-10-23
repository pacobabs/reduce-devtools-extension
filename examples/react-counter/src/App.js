import React, { createContext, useContext, useReducer } from 'react';
import './App.css';
import {wrapWithDevtools, connectDevtools} from 'reduce-devtools-extension'

const initialState = {
  count1: 0,
  count2: 0,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return {
        ...state,
        [action.name]: state[action.name] + 1,
      };
    case 'DECREMENT':
      return {
        ...state,
        [action.name]: state[action.name] - 1,
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

const Counter = ({ name, dispatch }) => {
  
  return (
    <div>
      {name}
      <button onClick={() => dispatch({ type: 'INCREMENT', name })}>+1</button>
      <button onClick={() => dispatch({ type: 'DECREMENT', name })}>-1</button>
    </div>
  );
};

const Container = () => {
    const [state, dispatch] = useGlobalState();
  connectDevtools(dispatch, {})
    return (
        <>
    <h1>Count1</h1>
    <Counter name={state.count1} dispatch={dispatch}/>
    <h1>Count2</h1>
    <Counter name={state.count1} dispatch={dispatch} />
  </>
)};

const App = () => {
    
    return (
  <GlobalStateProvider>
    <Container/>
  </GlobalStateProvider>
)};

export default App;
