# 引入 Hook 的动机

在组件之间复用状态逻辑很难，复杂组件变得难以理解。比如难以理解的 class。为了解决这些实际开发痛点，引入了 Hook。

Hook 分为状态 Hook(useState,useReducer) 和副作用 Hook(useEffect)

1. 状态 Hook: 实现了状态持久化
2. 副作用 Hook: 维护 fiber.flags,并提供副作用回调。

Hook 对象

```js
var newHook = {
  memoizedState: currentHook.memoizedState,
  baseState: currentHook.baseState,
  baseQueue: currentHook.baseQueue,
  queue: currentHook.queue,
  next: null,
};
```

Queue 对象

```js
var queue = {
  pending: null,
  interleaved: null,
  lanes: NoLanes,
  dispatch: null,
  // lastRendered调用的是reducer相关方法，是用户传入的方法。
  lastRenderedReducer: reducer,
  lastRenderedState: initialState,
};
```

Update 对象

```js
var update = {
  lane: lane,
  action: action,
  hasEagerState: false,
  eagerState: null,
  next: null,
};
```

副作用相关对象

```js
var effect = {
  tag: tag,
  create: create,
  destroy: destroy,
  deps: deps,
  // Circular
  next: null,
};
```
