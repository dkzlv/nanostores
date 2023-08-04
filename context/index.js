let contexts = []

// private object retains its id throught the lifetime
let ctxTrait = {}

export function isContext(ctx) {
  return ctx?._ === ctxTrait
}

function buildContext(storeStates = {}) {
  let context = {
    _: ctxTrait,
    // store copies
    copies: new Map(),
    // listener [q]ueue
    q: [],
    // store states
    states: storeStates
  }
  contexts.push(context)
  return context
}

let globalContextPolluted = false
export const globalContext = buildContext()

export function createContext(storeStates) {
  globalContextPolluted = true
  return buildContext(storeStates)
}
export function resetContext(context) {
  if (context) {
    contexts = contexts.filter(c => context !== c)
  } else {
    contexts = []
    globalContextPolluted = false
    delete globalContext.tasks
  }
}
export function serializeContext(context) {
  return JSON.stringify(context.states)
}

// lazily initialize store state in context
export function getStoreState(thisStore, originalStore) {
  if (globalContextPolluted && thisStore.ctx === globalContext) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        `You can't mix global context and custom contexts, that is probably an error. ` +
          'Please, pass the correct context into `withContext`.'
      )
    }
    throw new Error('no global ctx')
  }

  let state = thisStore.ctx.states[originalStore.id]
  if (!state) {
    state = {
      // [l]isteners [c]ount
      lc: 0,
      // [l]isteners
      ls: [],
      // [v]alue
      v: thisStore.iv
    }
    thisStore.ctx.states[originalStore.id] = state
  }
  return state
}

function shallowClone(obj) {
  return Object.create(
    Object.getPrototypeOf(obj),
    Object.getOwnPropertyDescriptors(obj)
  )
}

export function withContext(store, ctx) {
  if (store.ctx === ctx) return store

  let cloned = ctx.copies.get(store)
  if (!cloned) {
    cloned = shallowClone(store)
    cloned.ctx = ctx
    ctx.copies.set(store, cloned)
  }

  return cloned
}

export function ensureTaskContext(ctx) {
  if (!ctx.tasks) {
    ctx.tasks = { endListen: {}, errListen: {}, id: 0, resolves: [], tasks: 0 }
  }
  return ctx.tasks
}

export function makeCtx(obj) {
  return { ctx: s => withContext(s, obj.ctx) }
}
