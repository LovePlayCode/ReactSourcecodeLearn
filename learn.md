# 渲染流程

render

updateContainer(children, root, null, null);
children 是被 JSX 调用 React.createElement 之后的产物。
![alt text](image.png)
root 是之前创建的根 root

FiberRootNode 根的 FiberNode
FiberNode 通过 current 指向的 FiberNode

```js
var eventTime = requestEventTime();
var lane = requestUpdateLane(current$1);
```

获取赛道优先级和 eventTime

createUpdate 用于创建一个更新，可以看一下下面的源码

```js
function createUpdate(eventTime, lane) {
  var update = {
    eventTime: eventTime,
    lane: lane,
    tag: UpdateState,
    payload: null,
    callback: null,
    next: null,
  };
  return update;
}
```

创建出来了一个 update 对象，
下一步将 update.payload = {
element: element // 这个 element 是通过 JSX 解析后的虚拟 dom 对象

}

将此次更新入队

```js
function enqueueUpdate(fiber, update, lane) {
  var updateQueue = fiber.updateQueue;

  if (updateQueue === null) {
    // Only occurs if the fiber has been unmounted.
    return;
  }

  var sharedQueue = updateQueue.shared;

  if (isInterleavedUpdate(fiber)) {
    var interleaved = sharedQueue.interleaved;

    if (interleaved === null) {
      // This is the first update. Create a circular list.
      update.next = update; // At the end of the current render, this queue's interleaved updates will
      // be transferred to the pending queue.

      pushInterleavedQueue(sharedQueue);
    } else {
      update.next = interleaved.next;
      interleaved.next = update;
    }

    sharedQueue.interleaved = update;
  } else {
    var pending = sharedQueue.pending;

    if (pending === null) {
      // This is the first update. Create a circular list.
      update.next = update;
    } else {
      update.next = pending.next;
      pending.next = update;
    }

    sharedQueue.pending = update;
  }

  {
    if (
      currentlyProcessingQueue === sharedQueue &&
      !didWarnUpdateInsideUpdate
    ) {
      error(
        "An update (setState, replaceState, or forceUpdate) was scheduled " +
          "from inside an update function. Update functions should be pure, " +
          "with zero side-effects. Consider using componentDidUpdate or a " +
          "callback."
      );

      didWarnUpdateInsideUpdate = true;
    }
  }
}
```

对 update 赋值，然后用 scheduleUpdateOnFiber 开始调度。

```js
function checkForNestedUpdates() {
  if (nestedUpdateCount > NESTED_UPDATE_LIMIT) {
    nestedUpdateCount = 0;
    rootWithNestedUpdates = null;
    throw new Error(
      "Maximum update depth exceeded. This can happen when a component " +
        "repeatedly calls setState inside componentWillUpdate or " +
        "componentDidUpdate. React limits the number of nested updates to " +
        "prevent infinite loops."
    );
  }

  {
    if (nestedPassiveUpdateCount > NESTED_PASSIVE_UPDATE_LIMIT) {
      nestedPassiveUpdateCount = 0;

      error(
        "Maximum update depth exceeded. This can happen when a component " +
          "calls setState inside useEffect, but useEffect either doesn't " +
          "have a dependency array, or one of the dependencies changes on " +
          "every render."
      );
    }
  }
}
```

这个方法用于检查 React 更新次数是否超过 50 次(我们经常看到的错误提示。)

```js
function scheduleUpdateOnFiber() {
  /// ...
  ensureRootIsScheduled(root, eventTime);
  if (
    lane === SyncLane &&
    executionContext === NoContext &&
    (fiber.mode & ConcurrentMode) === NoMode && // Treat `act` as if it's inside `batchedUpdates`, even in legacy mode.
    !ReactCurrentActQueue$1.isBatchingLegacy
  ) {
    // Flush the synchronous work now, unless we're already working or inside
    // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
    // scheduleCallbackForFiber to preserve the ability to schedule a callback
    // without immediately flushing it. We only do this for user-initiated
    // updates, to preserve historical behavior of legacy mode.
    resetRenderTimer();
    flushSyncCallbacksOnlyInLegacyMode();
  }
  /// ...
}
```

主要的核心就是调用了 ensureRootIsScheduled，可以看看他的逻辑

```js
newCallbackNode = scheduleCallback$1(
  schedulerPriorityLevel,
  performConcurrentWorkOnRoot.bind(null, root)
);
function performConcurrentWorkOnRoot(root, didTimeout) {
  {
    resetNestedUpdateFlag();
  } // Since we know we're in a React event, we can clear the current
  // event time. The next update will compute a new event time.

  currentEventTime = NoTimestamp;
  currentEventTransitionLane = NoLanes;

  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    throw new Error("Should not already be working.");
  } // Flush any pending passive effects before deciding which lanes to work on,
  // in case they schedule additional work.

  var originalCallbackNode = root.callbackNode;
  var didFlushPassiveEffects = flushPassiveEffects();

  if (didFlushPassiveEffects) {
    // Something in the passive effect phase may have canceled the current task.
    // Check if the task node for this root was changed.
    if (root.callbackNode !== originalCallbackNode) {
      // The current task was canceled. Exit. We don't need to call
      // `ensureRootIsScheduled` because the check above implies either that
      // there's a new task, or that there's no remaining work on this root.
      return null;
    }
  } // Determine the next lanes to work on, using the fields stored
  // on the root.

  var lanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes
  );

  /*KaSong*/ logHook("performe work, next lanes", lanes);

  if (lanes === NoLanes) {
    // Defensive coding. This is never expected to happen.
    return null;
  } // We disable time-slicing in some cases: if the work has been CPU-bound
  // for too long ("expired" work, to prevent starvation), or we're in
  // sync-updates-by-default mode.
  // TODO: We only check `didTimeout` defensively, to account for a Scheduler
  // bug we're still investigating. Once the bug in Scheduler is fixed,
  // we can remove this, since we track expiration ourselves.

  var shouldTimeSlice =
    !includesBlockingLane(root, lanes) &&
    !includesExpiredLane(root, lanes) &&
    !didTimeout;
  // var shouldTimeSlice = true;

  /*KaSong*/ logHook("shouldTimeSlice", shouldTimeSlice);

  var exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);

  /*KaSong*/ logHook("performConcurrentWorkOnRoot-exitStatus", exitStatus);

  if (exitStatus !== RootIncomplete) {
    if (exitStatus === RootErrored) {
      // If something threw an error, try rendering one more time. We'll
      // render synchronously to block concurrent data mutations, and we'll
      // includes all pending updates are included. If it still fails after
      // the second attempt, we'll give up and commit the resulting tree.
      var errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);

      if (errorRetryLanes !== NoLanes) {
        lanes = errorRetryLanes;
        exitStatus = recoverFromConcurrentError(root, errorRetryLanes);
      }
    }

    if (exitStatus === RootFatalErrored) {
      var fatalError = workInProgressRootFatalError;
      prepareFreshStack(root, NoLanes);
      markRootSuspended$1(root, lanes);
      ensureRootIsScheduled(root, now());
      throw fatalError;
    } // Check if this render may have yielded to a concurrent event, and if so,
    // confirm that any newly rendered stores are consistent.
    // TODO: It's possible that even a concurrent render may never have yielded
    // to the main thread, if it was fast enough, or if it expired. We could
    // skip the consistency check in that case, too.

    var renderWasConcurrent = !includesBlockingLane(root, lanes);
    var finishedWork = root.current.alternate;

    if (
      renderWasConcurrent &&
      !isRenderConsistentWithExternalStores(finishedWork)
    ) {
      // A store was mutated in an interleaved event. Render again,
      // synchronously, to block further mutations.
      exitStatus = renderRootSync(root, lanes); // We need to check again if something threw

      /*KaSong*/ logHook("performSyncWorkOnRoot-exitStatus", exitStatus);

      if (exitStatus === RootErrored) {
        var _errorRetryLanes = getLanesToRetrySynchronouslyOnError(root);

        if (_errorRetryLanes !== NoLanes) {
          lanes = _errorRetryLanes;
          exitStatus = recoverFromConcurrentError(root, _errorRetryLanes); // We assume the tree is now consistent because we didn't yield to any
          // concurrent events.
        }
      }

      if (exitStatus === RootFatalErrored) {
        var _fatalError = workInProgressRootFatalError;
        prepareFreshStack(root, NoLanes);
        markRootSuspended$1(root, lanes);
        ensureRootIsScheduled(root, now());
        throw _fatalError;
      }
    } // We now have a consistent tree. The next step is either to commit it,
    // or, if something suspended, wait to commit it after a timeout.

    root.finishedWork = finishedWork;
    root.finishedLanes = lanes;
    finishConcurrentRender(root, exitStatus, lanes);
  }

  ensureRootIsScheduled(root, now());

  if (root.callbackNode === originalCallbackNode) {
    // The task node scheduled for this root is the same one that's
    // currently executed. Need to return a continuation.
    /*KaSong*/ logHook("continuationCallback", root);
    return performConcurrentWorkOnRoot.bind(null, root);
  }

  return null;
}
```

这个会启动一个调度任务，走到了 unstable_scheduleCallback

```js
function unstable_scheduleCallback(priorityLevel, callback, options) {
  var currentTime = exports.unstable_now();
  var startTime;

  if (typeof options === "object" && options !== null) {
    var delay = options.delay;

    if (typeof delay === "number" && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  var timeout;

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

  if (startTime > currentTime) {
    // This is a delayed task.
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);

    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // All tasks are delayed, and this is the task with the earliest delay.
      if (isHostTimeoutScheduled) {
        // Cancel an existing timeout.
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      } // Schedule a timeout.

      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    // wait until the next time we yield.

    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}
```

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

可以看到这里总共有五种任务优先级，而第一次渲染的时候是 NorMalPriority 优先级

然后会计算一个变量用来表示一个任务的过期时间: var expirationTime = startTime + timeout;
计算逻辑是任务的开始时间 + 优先级的延迟时间

然后会创建一个新任务

```js
var newTask = {
  id: taskIdCounter++,
  callback: callback,
  priorityLevel: priorityLevel,
  startTime: startTime,
  expirationTime: expirationTime,
  sortIndex: -1,
};
```

这里会进入一个 requestHostCallback 以及会通过 schedulePerformWorkUntilDeadline() 创建一个宏任务去调度
等下一轮事件循环后，会调用 performWorkUntilDeadline 来进行任务的执行

```js
var performWorkUntilDeadline = function () {
  if (scheduledHostCallback !== null) {
    var hasMoreWork = true;

    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        // If there's more work, schedule the next message event at the end
        // of the preceding one.
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  } // Yielding to the browser will give it a chance to paint, so we can
};
```

核心就一个，启动了一个 scheduledHostCallback(这个函数其实就是 flushWork，直接看 flushWork 即可)以及如果 hasMoreWork 继续有值，继续进行调度
schedulePerformWorkUntilDeadline

flushWork

```js
function flushWork() {
  try {
    if (enableProfiling) {
      try {
        return workLoop(hasTimeRemaining, initialTime);
      } catch (error) {
        if (currentTask !== null) {
          var currentTime = exports.unstable_now();
          markTaskErrored(currentTask, currentTime);
          currentTask.isQueued = false;
        }

        throw error;
      }
    } else {
      // No catch in prod code path.
      return workLoop(hasTimeRemaining, initialTime);
    }
  } finally {
    currentTask = null;
    currentPriorityLevel = previousPriorityLevel;
    isPerformingWork = false;
  }
}
```

开启一个 workLoop，看下 workLoop 里的代码

```js
function workLoop(hasTimeRemaining, initialTime) {
  var currentTime = initialTime;
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);

  while (currentTask !== null && !enableSchedulerDebugging) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // This currentTask hasn't expired, and we've reached the deadline.
      break;
    }

    var callback = currentTask.callback;

    if (typeof callback === "function") {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      var didUserCallbackTimeout = currentTask.expirationTime <= currentTime;

      var continuationCallback = callback(didUserCallbackTimeout);
      currentTime = exports.unstable_now();

      if (typeof continuationCallback === "function") {
        currentTask.callback = continuationCallback;
      } else {
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }

      advanceTimers(currentTime);
    } else {
      pop(taskQueue);
    }

    currentTask = peek(taskQueue);
  } // Return whether there's additional work

  if (currentTask !== null) {
    return true;
  } else {
    var firstTimer = peek(timerQueue);

    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }

    return false;
  }
}
```

然后会去触发 performConcurrentWorkOnRoot
这里会有一个判断是否执行并发更新还是异步更新

```js
var exitStatus = shouldTimeSlice
  ? renderRootConcurrent(root, lanes)
  : renderRootSync(root, lanes);
```

第一次进入的时候走的是异步更新

```js
function renderRootSync() {
  do {
    try {
      workLoopSync();
      break;
    } catch (thrownValue) {
      handleError(root, thrownValue);
    }
  } while (true);
  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  return workInProgressRootExitStatus;
}
```

核心方法也比较少，先有一个 do while ，然后报错之后就结束循环，最后返回 workInProgressRootExitStatus
然后 workLoopSync

```js
function workLoopSync() {
  // Already timed out, so perform work without checking if we need to yield.
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```

reconcileChildren

```js
function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
  if (current === null) {
    // If this is a fresh new component that hasn't been rendered yet, we
    // won't update its child set by applying minimal side-effects. Instead,
    // we will add them all to the child before it gets rendered. That means
    // we can optimize this reconciliation pass by not tracking side-effects.
    workInProgress.child = mountChildFibers(
      workInProgress,
      null,
      nextChildren,
      renderLanes
    );
  } else {
    // If the current child is the same as the work in progress, it means that
    // we haven't yet started any work on these children. Therefore, we use
    // the clone algorithm to create a copy of all the current children.
    // If we had any progressed work already, that is invalid at this point so
    // let's throw it out.
    workInProgress.child = reconcileChildFibers(
      workInProgress,
      current.child,
      nextChildren,
      renderLanes
    );
  }
}

function reconcileChildFibers(returnFiber, currentFirstChild, newChild, lanes) {
  // This function is not recursive.
  // If the top level item is an array, we treat it as a set of children,
  // not as a fragment. Nested arrays on the other hand will be treated as
  // fragment nodes. Recursion happens at the normal flow.
  // Handle top level unkeyed fragments as if they were arrays.
  // This leads to an ambiguity between <>{[...]}</> and <>...</>.
  // We treat the ambiguous cases above the same.
  var isUnkeyedTopLevelFragment =
    typeof newChild === "object" &&
    newChild !== null &&
    newChild.type === REACT_FRAGMENT_TYPE &&
    newChild.key === null;

  if (isUnkeyedTopLevelFragment) {
    newChild = newChild.props.children;
  } // Handle object types

  if (typeof newChild === "object" && newChild !== null) {
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE:
        return placeSingleChild(
          reconcileSingleElement(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes
          )
        );

      case REACT_PORTAL_TYPE:
        return placeSingleChild(
          reconcileSinglePortal(returnFiber, currentFirstChild, newChild, lanes)
        );

      case REACT_LAZY_TYPE: {
        var payload = newChild._payload;
        var init = newChild._init; // TODO: This function is supposed to be non-recursive.

        return reconcileChildFibers(
          returnFiber,
          currentFirstChild,
          init(payload),
          lanes
        );
      }
    }

    if (isArray(newChild)) {
      return reconcileChildrenArray(
        returnFiber,
        currentFirstChild,
        newChild,
        lanes
      );
    }

    if (getIteratorFn(newChild)) {
      return reconcileChildrenIterator(
        returnFiber,
        currentFirstChild,
        newChild,
        lanes
      );
    }

    throwOnInvalidObjectType(returnFiber, newChild);
  }

  if (typeof newChild === "string" || typeof newChild === "number") {
    return placeSingleChild(
      reconcileSingleTextNode(
        returnFiber,
        currentFirstChild,
        "" + newChild,
        lanes
      )
    );
  }

  {
    if (typeof newChild === "function") {
      warnOnFunctionType(returnFiber);
    }
  } // Remaining cases are all treated as empty.

  return deleteRemainingChildren(returnFiber, currentFirstChild);
}
```

当遍历到叶子节点时，会进入 completeUnitOfWork
