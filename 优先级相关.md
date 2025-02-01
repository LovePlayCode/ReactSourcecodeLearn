# 优先级分类

## lane 优先级，一共有 31 种优先级

```js
export const TotalLanes = 31;

export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
export const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000010000;

const TransitionHydrationLane: Lane = /*                */ 0b0000000000000000000000000100000;
const TransitionLanes: Lanes = /*                       */ 0b0000000001111111111111111000000;
const TransitionLane1: Lane = /*                        */ 0b0000000000000000000000001000000;
const TransitionLane2: Lane = /*                        */ 0b0000000000000000000000010000000;
const TransitionLane3: Lane = /*                        */ 0b0000000000000000000000100000000;
const TransitionLane4: Lane = /*                        */ 0b0000000000000000000001000000000;
const TransitionLane5: Lane = /*                        */ 0b0000000000000000000010000000000;
const TransitionLane6: Lane = /*                        */ 0b0000000000000000000100000000000;
const TransitionLane7: Lane = /*                        */ 0b0000000000000000001000000000000;
const TransitionLane8: Lane = /*                        */ 0b0000000000000000010000000000000;
const TransitionLane9: Lane = /*                        */ 0b0000000000000000100000000000000;
const TransitionLane10: Lane = /*                       */ 0b0000000000000001000000000000000;
const TransitionLane11: Lane = /*                       */ 0b0000000000000010000000000000000;
const TransitionLane12: Lane = /*                       */ 0b0000000000000100000000000000000;
const TransitionLane13: Lane = /*                       */ 0b0000000000001000000000000000000;
const TransitionLane14: Lane = /*                       */ 0b0000000000010000000000000000000;
const TransitionLane15: Lane = /*                       */ 0b0000000000100000000000000000000;
const TransitionLane16: Lane = /*                       */ 0b0000000001000000000000000000000;

const RetryLanes: Lanes = /*                            */ 0b0000111110000000000000000000000;
const RetryLane1: Lane = /*                             */ 0b0000000010000000000000000000000;
const RetryLane2: Lane = /*                             */ 0b0000000100000000000000000000000;
const RetryLane3: Lane = /*                             */ 0b0000001000000000000000000000000;
const RetryLane4: Lane = /*                             */ 0b0000010000000000000000000000000;
const RetryLane5: Lane = /*                             */ 0b0000100000000000000000000000000;
```

## event 优先级，分为四种 分别指向不同的优先级

```js
// 离散事件优先级， 为同步优先级0b0000000000000000000000000000001
// 比如click，input， change, blur, focus等
export const DiscreteEventPriority: EventPriority = SyncLane;
// 连续事件优先级， 为输入持续优先级0b0000000000000000000000000000100
// 比如touchmove， scroll，dragenter等
export const ContinuousEventPriority: EventPriority = InputContinuousLane;
// 默认事件优先级， 为0b0000000000000000000000000010000
export const DefaultEventPriority: EventPriority = DefaultLane;
// 空闲事件优先级， 为0b0100000000000000000000000000000
export const IdleEventPriority: EventPriority = IdleLane;
```

## Schedule 优先级

```js
let ReactPriorityLevels: ReactPriorityLevelsType = {
  ImmediatePriority: 99,
  UserBlockingPriority: 98,
  NormalPriority: 97,
  LowPriority: 96,
  IdlePriority: 95,
  NoPriority: 90,
};
```

## 优先级转换

lane 优先级转换为 event 优先级，通过 lanesToEventPriority 函数进行转换
event 优先级转换为 scheduler 优先级，通过 ensureRootIsScheduled 进行转换。

## 优先级操作

### 合并

遇到多个优先级时，需要合并到 lanes 进行处理
合并优先级的方案采用位或运算
01000 | 00100 = 01100

### 释放

lanes &= ~lane;

### 拿到最高优先级(进行取反操作)

```js
export function getHighestPriorityLane(lanes: Lanes): Lane {
  return lanes & -lanes;
}
```

高优先级触发取消相关
原因：有更高优先级的事件插入
逻辑：将 task 的 callback 置为空
如何实现：在 workLoop 将 taskQueue 中 task 拿出来处理时，如果 task 的 callback 为空，直接移出，不处理。

打断相关
原因: 释放线程给浏览器
打断逻辑: currentTask.expirationTime > currentTime 判断任务是否过期 hasTimeRemaining 判断电脑是否有剩余时间
shouldYieldToHost: 判断是否还有时间片，因为任务没执行完，会通过 schedulePerformWorkUntilDeadline 创建一个新的宏任务去处理任务。 做到了打断而又重启

饥饿相关
因为存在可以打断低优先级然后执行高优先级任务的逻辑。可能会引发一种情况：一直有高优先级的任务存在导致低优先级的任务迟迟无法被执行。

第二是在 performConcurrentWorkOnRoot 通过 expiredLanes 作为条件之一进行了判断，若存在 expiredLanes 则调用 renderRootSync, 否则调用 renderRootConcurrent. 其中的差异我们下一章会涉及
