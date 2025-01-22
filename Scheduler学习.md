Scheduler 导出 scheduleCallback 接收优先级和回调 Fn

会生成一个 task 对象，代表一个任务，类似以下数据结构

```js
switch (priorityLevel) {
  case ImmediatePriority:
    timeout = IMMEDIATE_PRIORITY_TIMEOUT;
    break;

  case UserBlockingPriority:
    timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
    break;

  case IdlePriority:
    timeout = IDLE_PRIORITY_TIMEOUT;
    break;

  case LowPriority:
    timeout = LOW_PRIORITY_TIMEOUT;
    break;

  case NormalPriority:
  default:
    timeout = NORMAL_PRIORITY_TIMEOUT;
    break;
}

var expirationTime = startTime + timeout;
var newTask = {
  id: taskIdCounter++,
  callback: callback,
  priorityLevel: priorityLevel,
  startTime: startTime,
  expirationTime: expirationTime,
  sortIndex: -1,
};
```

从上面代码可以看到 expirationTime 是由当前时间和 timeout 构成的。
scheduler 针对 expirationTime 作为"task 之间排序的依据",值越小优先级越高。
高优先级的 task.callback 在新的宏任务优先执行。

通过 expirationTime 跟 currentTime 进行比较，判断任务是插入 timerQueue 还是插入 taskQueue
