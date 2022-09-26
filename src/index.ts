import { parse } from 'jsan'
import { evalMethod } from 'remotedev-utils'

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__: {
      connect: (options: any) => void
    }
  }
}

let devtools: any
let devtoolState: any
let internalStore: any

export const wrapWithDevtools = (reducer: (store: any, action: any) => any): ((store: any, action: any) => any) => (
  prevStore,
  action
) => {
  if(typeof window === `undefined`) return
  if (!window.__REDUX_DEVTOOLS_EXTENSION__) return reducer(prevStore, action)
  if (!devtools) throw new Error('You must init devtools before')
  if (action.internal) {
    // internal monitor reducer
    switch (action.type) {
      case '__REDUX_DEVTOOLS_EXTENSION_SET_STATE__': {
        const newStore = action.payload
        setInternalStore(newStore)
        return devtoolState.isLocked ? prevStore : newStore
      }
      default: {
        const newStore = reducer(internalStore, action)
        setInternalStore(newStore)
        return devtoolState.isLocked ? prevStore : newStore
      }
    }
  } else {
    // App actions
    if (devtoolState.isLocked) {
      return prevStore
    }
    const newStore = reducer(prevStore, action)
    if (!devtoolState.isPaused) {
      devtools.send(action, newStore)
      logAction(action, newStore)
    }
    setInternalStore(newStore)
    return newStore
  }
}

export const initDevtools = (
  initialStore: any,
  dispatch: ({ type, payload, internal }: {type: string, payload: any, internal: boolean}) => void,
  options?: any
) => {
  if (typeof window === `undefined` || devtools || !window.__REDUX_DEVTOOLS_EXTENSION__) return
  if (!dispatch) throw new Error('You must provide a dispatch function')
  const { autoPause = false, shouldStartLocked = false } = options || {}
  devtools = window.__REDUX_DEVTOOLS_EXTENSION__.connect(options)
  devtools.init(initialStore)
  setTimeout(() => {
    devtools.send(null, initDevtoolState(initialStore, { autoPause, shouldStartLocked }))
  }, 100)
  setInternalStore(initialStore)
  devtools.subscribe((message: any) => {
    if (message.type === 'ACTION') {
      try {
        const { payload } = message
        const action =
          typeof payload === 'string'
            ? evalMethod(message.payload, internalStore) // store becomes this. for eval
            : evalMethod(message.payload, options.actionCreators) // eval on actions
        action.type
          ? dispatch(action) // Action from action creator
          : dispatch({
              // state update from this.
              type: '__REDUX_DEVTOOLS_EXTENSION_SET_STATE__',
              payload: internalStore,
              internal: true
            })
      } catch (e) {
        devtools.error(e)
      }
    } else if (message.type === 'DISPATCH') {
      const payload = extractState(message)
      switch (message.payload.type) {
        case 'PAUSE_RECORDING': {
          devtoolState.isPaused = message.payload.status
          return true
        }
        case 'LOCK_CHANGES': {
          const isLocked = message.payload.status
          devtoolState.isLocked = isLocked
          devtools.send(null, devtoolState)
          // Commit after unlock
          !isLocked &&
            dispatch({
              type: '__REDUX_DEVTOOLS_EXTENSION_SET_STATE__',
              payload: internalStore,
              internal: true
            })
          return true
        }
        case 'RESET': {
          dispatch({
            type: '__REDUX_DEVTOOLS_EXTENSION_SET_STATE__',
            payload: initialStore,
            internal: true
          })
          devtools.send(null, initDevtoolState(initialStore))
          return true
        }
        case 'COMMIT': {
          devtools.send(null, initDevtoolState(internalStore))
          return true
        }
        case 'ROLLBACK': {
          const rollbackStore = payload
          dispatch({
            type: '__REDUX_DEVTOOLS_EXTENSION_SET_STATE__',
            payload: rollbackStore,
            internal: true
          })
          devtools.send(null, initDevtoolState(rollbackStore))
          return true
        }
        case 'SWEEP': {
          devtoolState.currentStateIndex =
            devtoolState.currentStateIndex -
            devtoolState.skippedActionIds.filter(
              // actions before are skipped so index must be substracted by their number
              (id: number) => devtoolState.stagedActionIds.indexOf(id) < devtoolState.currentStateIndex
            ).length
          // omit skipped actions computedStates
          devtoolState.computedStates = devtoolState.computedStates.filter((_: any, index: number) => {
            const actionId = devtoolState.stagedActionIds[index]
            return !devtoolState.skippedActionIds.includes(actionId)
          })
          // omit skipped actions actionsById
          devtoolState.skippedActionIds.map((actionId: number) => delete devtoolState.actionsById[actionId])
          // omit skipped actions stagedActionIds
          devtoolState.stagedActionIds = devtoolState.stagedActionIds.filter(
            (actionId: number) => !devtoolState.skippedActionIds.includes(actionId)
          )
          // ok no more skipped to treat
          devtoolState.skippedActionIds = []
          devtools.send(null, devtoolState)
          return true
        }
        case 'IMPORT_STATE': {
          const { nextLiftedState } = message.payload
          const { computedStates } = nextLiftedState
          dispatch({
            type: '__REDUX_DEVTOOLS_EXTENSION_SET_STATE__',
            payload: computedStates[computedStates.length - 1].state,
            internal: true
          })
          devtoolState = nextLiftedState
          devtools.send(null, devtoolState)
          return true
        }
        case 'JUMP_TO_STATE':
        case 'JUMP_TO_ACTION': {
          dispatch({
            type: '__REDUX_DEVTOOLS_EXTENSION_SET_STATE__',
            payload,
            internal: true
          })
          return
        }
        case 'TOGGLE_ACTION': {
          devtoolState = toggleAction(message, dispatch)
          devtools.send(null, devtoolState)
          return true
        }
      }
    }
  })
}

const toggleAction = (message: any, dispatch: any) => {
  const { id } = message.payload
  const liftedState = extractState(message)
  const { actionsById, skippedActionIds, stagedActionIds, computedStates } = liftedState
  const skipped = skippedActionIds.includes(id)
  const currentStateIndex = stagedActionIds.indexOf(id)
  if (currentStateIndex === -1) return liftedState
  for (let i = currentStateIndex - 1; i >= 0; i--) {
    const currentActionId = stagedActionIds[i]
    if (skippedActionIds.includes(currentActionId)) continue // it's already skipped
    const start = computedStates[i].state
    liftedState.currentStateIndex = i
    dispatch({
      type: '__REDUX_DEVTOOLS_EXTENSION_SET_STATE__',
      payload: start,
      internal: true
    })
    liftedState.computedStates[currentStateIndex].state = start
    break //previous state found
  }
  for (let i = skipped ? currentStateIndex : currentStateIndex + 1; i < stagedActionIds.length; i++) {
    const currentActionId = stagedActionIds[i]
    if (i !== currentStateIndex && skippedActionIds.includes(currentActionId)) continue // it's already skipped
    const { action } = actionsById[currentActionId]
    dispatch({ ...action, internal: true })
    liftedState.currentStateIndex = i
    liftedState.computedStates[i].state = internalStore
  }
  // toggling actions in devtools
  liftedState.skippedActionIds = skipped
    ? skippedActionIds.filter((idToFilter: number) => idToFilter !== id) // remove id from skipped array
    : [...skippedActionIds, id] // add id to skipped array

  return liftedState
}

const setInternalStore = (newStore: any) => {
  internalStore = { ...newStore }
}

const initDevtoolState = (
  initialStore: any,
  { autoPause = devtoolState.isPaused, shouldStartLocked = devtoolState.isLocked }: any = {}
) => {
  devtoolState = {
    actionsById: {
      0: {
        action: { type: '@@INIT' },
        timestamp: Date.now(),
        type: 'PERFORM_ACTION'
      }
    },
    computedStates: [
      {
        state: initialStore
      }
    ],
    currentStateIndex: 0,
    nextActionId: 1,
    skippedActionIds: [],
    stagedActionIds: [0],
    isPaused: autoPause,
    isLocked: shouldStartLocked
  }
  return devtoolState
}

const logAction = (action: any, newStore: any) => {
  const currentActionId = devtoolState.nextActionId
  devtoolState.actionsById[currentActionId] = {
    action,
    timestamp: Date.now(),
    type: 'PERFORM_ACTION'
  }
  devtoolState.currentStateIndex = devtoolState.computedStates.length
  devtoolState.computedStates.push({ state: newStore })
  devtoolState.stagedActionIds.push(currentActionId)
  devtoolState.nextActionId++
  devtools.send(null, devtoolState)
}

const extractState = (message: any) => {
  if (!message || !message.state) return undefined
  if (typeof message.state === 'string') return parse(message.state)
  return message.state
}
