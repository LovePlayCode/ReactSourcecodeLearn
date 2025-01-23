# 数据结构
update结构用于触发React刷新，在React总共有两种update的数据结构：classComponent 和 HostRoot使用的数据结构
```js
 function createUpdate(eventTime, lane) {
      var update = {
        eventTime: eventTime,
        lane: lane,
        // 区分触发的场景
        // UpdateState 通过 this.setState触发
        // ReplaceState 在 class 组件中的生命周期中触发更新
        // CaptureUpdate 发生错误的情况下触发更新 
        // Forceupdate： 通过this.forceUpdate 触发更新
        // 
        tag: UpdateState,
        payload: null,
        // UI 渲染后触发的回调
        callback: null,
        next: null,
      };
      return update;
    }
```


FC 相关的 update 数据结构

```js
const update = {
    lane,
    action,
    hasEagerstate: false,
    eagerState: null,
    next: null
}
```

在update 中，承载的内容由payload字段 或 action 字段表示
update 的紧急程度由 lane 表示

# updateQueue
## 作用
保存 "参与state计算的相关数据"

```js
const updateQueue = {
    baseState: null,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: {
        pending: null
    }
}
```