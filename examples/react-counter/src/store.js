import React, { createContext, useContext, useReducer } from "react";
import { wrapWithDevtools, initDevtools } from "reduce-devtools-extension";

const initialState = {
    count: 0,
  };
  

const reducer = wrapWithDevtools((state, action) => {
  switch (action.type) {
    case "INCREMENT":
      return {
        count: state.count + 1,
      };
    case "DECREMENT":
      return {
        count: state.count - 1,
      };
    default:
      return state;
  }
});

const StateContext = createContext(undefined);

const DispatchContext = createContext(undefined);

const Provider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  initDevtools(initialState, dispatch);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
};

const useState = () => {
  return useContext(StateContext);
};

const useDispatch = () => {
  return useContext(DispatchContext);
};

export { Provider, useState, useDispatch };
