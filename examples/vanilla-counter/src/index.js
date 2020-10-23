import {
  wrapWithDevtools,
  initDevtools,
} from "reduce-devtools-extension";

// store

let store = {
  count: 0,
};

const dispatch = (action) =>
  document.dispatchEvent(new CustomEvent("action", { detail: action }));

initDevtools(store, dispatch);

const reducer = wrapWithDevtools((state, action) => {
  switch (action.type) {
    case "INCREMENT":
      return {
        count: state.count + action.step,
      };
    case "DECREMENT":
      return {
        count: state.count - action.step,
      };
    default:
      return state;
  }
});

// actions

document
  .getElementById("increment")
  .addEventListener("click", () => dispatch({ type: "INCREMENT", "step": 2 }));

document
  .getElementById("decrement")
  .addEventListener("click", () => dispatch({ type: "DECREMENT", "step": 4 }));

// subscribe to state changes

const render = () => {
  document.getElementById("value").innerHTML = store.count;
};

document.addEventListener(
  "action",
  (e) => {
    store = reducer(store, e.detail);
    document.dispatchEvent(new CustomEvent("state"));
  },
  false
);

document.addEventListener("state", render);

// render app

render();
