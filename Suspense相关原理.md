# Suspense 相关原理
1. React流程中beginWork走到Suspense时，会进入Suspense相关方法。
2. Suspense组件会先进行一轮判断 
	a.  判断是否需要显示回退内容(当 Promise 为待定状态时)
    b.  预期长时间加载的 CPU密集型任务。
    c.  正常情况。
```js

        if (showFallback) {
          var fallbackFragment = mountSuspenseFallbackChildren(
            workInProgress,
            nextPrimaryChildren,
            nextFallbackChildren,
            renderLanes
          );
          var primaryChildFragment = workInProgress.child;
          primaryChildFragment.memoizedState =
            mountSuspenseOffscreenState(renderLanes);
          workInProgress.memoizedState = SUSPENDED_MARKER;
          return fallbackFragment;
        } else if (typeof nextProps.unstable_expectedLoadTime === "number") {
          // This is a CPU-bound tree. Skip this tree and show a placeholder to
          // unblock the surrounding content. Then immediately retry after the
          // initial commit.
          var _fallbackFragment = mountSuspenseFallbackChildren(
            workInProgress,
            nextPrimaryChildren,
            nextFallbackChildren,
            renderLanes
          );

          var _primaryChildFragment = workInProgress.child;
          _primaryChildFragment.memoizedState =
            mountSuspenseOffscreenState(renderLanes);
          workInProgress.memoizedState = SUSPENDED_MARKER; // Since nothing actually suspended, there will nothing to ping this to
          // get it started back up to attempt the next item. While in terms of
          // priority this work has the same priority as this current render, it's
          // not part of the same transition once the transition has committed. If
          // it's sync, we still want to yield so that it can be painted.
          // Conceptually, this is really the same as pinging. We can use any
          // RetryLane even if it's the one currently rendering since we're leaving
          // it behind on this node.

          workInProgress.lanes = SomeRetryLane;
          return _fallbackFragment;
        } else {
          return mountSuspensePrimaryChildren(
            workInProgress,
            nextPrimaryChildren
          );
        }
```
3. 刚开始的时候会进入正常情况进行渲染，对应的函数为: mountSuspensePrimaryChildren
```js
    function mountSuspensePrimaryChildren(
      workInProgress,
      primaryChildren,
      renderLanes
    ) {
      var mode = workInProgress.mode;
      var primaryChildProps = {
        mode: "visible",
        children: primaryChildren,
      };
      var primaryChildFragment = mountWorkInProgressOffscreenFiber(
        primaryChildProps,
        mode
      );
      primaryChildFragment.return = workInProgress;
      workInProgress.child = primaryChildFragment;
      return primaryChildFragment;
    }

```
4. 最后会生成一个OffscreenComponent的组件类型，在下一层的 beginwork 中进入处理这个组件的方法
```js

function updateOffscreenComponent(current, workInProgress, renderLanes) {
      var nextProps = workInProgress.pendingProps;
      var nextChildren = nextProps.children;
      var prevState = current !== null ? current.memoizedState : null; // If this is not null, this is a cache pool that was carried over from the
      // previous render. We will push this to the cache pool context so that we can
      // resume in-flight requests.

      var spawnedCachePool = null;

      if (
        nextProps.mode === "hidden" ||
        nextProps.mode === "unstable-defer-without-hiding"
      ) {
        // Rendering a hidden tree.
        if ((workInProgress.mode & ConcurrentMode) === NoMode) {
          // In legacy sync mode, don't defer the subtree. Render it now.
          var nextState = {
            baseLanes: NoLanes,
            cachePool: null,
          };
          workInProgress.memoizedState = nextState;
          pushRenderLanes(workInProgress, renderLanes);
        } else if (!includesSomeLane(renderLanes, OffscreenLane)) {
          // We're hidden, and we're not rendering at Offscreen. We will bail out
          // and resume this tree later.
          var nextBaseLanes;

          if (prevState !== null) {
            var prevBaseLanes = prevState.baseLanes;
            nextBaseLanes = mergeLanes(prevBaseLanes, renderLanes);
          } else {
            nextBaseLanes = renderLanes;
          } // Schedule this fiber to re-render at offscreen priority. Then bailout.

          workInProgress.lanes = workInProgress.childLanes =
            laneToLanes(OffscreenLane);
          var _nextState = {
            baseLanes: nextBaseLanes,
            cachePool: spawnedCachePool,
          };
          workInProgress.memoizedState = _nextState;
          workInProgress.updateQueue = null; // We're about to bail out, but we need to push this to the stack anyway
          // to avoid a push/pop misalignment.

          pushRenderLanes(workInProgress, nextBaseLanes);

          return null;
        } else {
          var _nextState2 = {
            baseLanes: NoLanes,
            cachePool: null,
          };
          workInProgress.memoizedState = _nextState2; // Push the lanes that were skipped when we bailed out.

          var subtreeRenderLanes =
            prevState !== null ? prevState.baseLanes : renderLanes;
          pushRenderLanes(workInProgress, subtreeRenderLanes);
        }
      } else {
        // Rendering a visible tree.
        var _subtreeRenderLanes;

        if (prevState !== null) {
          // We're going from hidden -> visible.
          _subtreeRenderLanes = mergeLanes(prevState.baseLanes, renderLanes);

          workInProgress.memoizedState = null;
        } else {
          // We weren't previously hidden, and we still aren't, so there's nothing
          // special to do. Need to push to the stack regardless, though, to avoid
          // a push/pop misalignment.
          _subtreeRenderLanes = renderLanes;
        }

        pushRenderLanes(workInProgress, _subtreeRenderLanes);
      }

      {
        reconcileChildren(current, workInProgress, nextChildren, renderLanes);
        return workInProgress.child;
      }
    }
```
5. 这个时候会生成对应真实的组件。随后会通过renderWithHooks执行组件的 render 函数。
6. 组件的 render 函数会抛出一个 Promise 的异常，被异常处理函数捕获。
```js
do {
        try {
          workLoopSync();
          break;
        } catch (thrownValue) {
          // 错误捕获，可以交给错误边界进行处理
          handleError(root, thrownValue);
        }
      } while (true);
```
7. 异常处理程序会判断属于Promise还是错误异常，如果是 Promise，会找到最近的Suspense，打上 flag 的标记。
8. 同时还会在Promise 从待定状态变更为其他状态时添加事件处理回调。方便状态变更时继续调度。
9. 进入unwind(这个流程在completeUnitOfWork中)流程，找到符合条件的Suspense。
```js
if ((completedWork.flags & Incomplete) === NoFlags) {
          setCurrentFiber(completedWork);
          var next = void 0;

          if ((completedWork.mode & ProfileMode) === NoMode) {
            next = completeWork(current, completedWork, subtreeRenderLanes);
          } else {
            startProfilerTimer(completedWork);
            next = completeWork(current, completedWork, subtreeRenderLanes); // Update render duration assuming we didn't error.

            stopProfilerTimerIfRunningAndRecordDelta(completedWork, false);
          }

          resetCurrentFiber();

          if (next !== null) {
            // Completing this fiber spawned new work. Work on that next.
            workInProgress = next;
            return;
          }
        } else {
          // This fiber did not complete because something threw. Pop values off
          // the stack without entering the complete phase. If this is a boundary,
          // capture values if possible.
          var _next = unwindWork(completedWork); // Because this fiber did not complete, don't reset its lanes.

          if (_next !== null) {
            // If completing this work spawned new work, do that next. We'll come
            // back here again.
            // Since we're restarting, remove anything that is not a host effect
            // from the effect tag.
            _next.flags &= HostEffectMask;
            workInProgress = _next;
            return;
          }

          if ((completedWork.mode & ProfileMode) !== NoMode) {
            // Record the render duration for the fiber that errored.
            stopProfilerTimerIfRunningAndRecordDelta(completedWork, false); // Include the time spent working on failed children before continuing.

            var actualDuration = completedWork.actualDuration;
            var child = completedWork.child;

            while (child !== null) {
              actualDuration += child.actualDuration;
              child = child.sibling;
            }

            completedWork.actualDuration = actualDuration;
          }

          if (returnFiber !== null) {
            // Mark the parent fiber as incomplete and clear its subtree flags.
            returnFiber.flags |= Incomplete;
            returnFiber.subtreeFlags = NoFlags;
            returnFiber.deletions = null;
          }
        }
```
10. 具体逻辑就在completeUnitWork中判断当前是正常结束的还是其他情况。 Suspense 属于其他情况。
11. 找到符合条件的Suspense节点，直接 return。
13. 此时 Suspense 会再走一遍 beginWork，然后根据上面的三个 if，会走到第一个，展示 fallback UI 状态。
14. 当 Promise 状态变化后，会启动调度展示正确的 UI。

# QA
1. 如果使用Suspense会走几次beginWork。
答： 
1. mount时的beginWork，返回"Offscreen"对应的"fiberNode"。
2. 由于unwind流程，第二次进入mount时的beginWork，返回"fallback Fragment"对应fiberNode
3. Promise从待定状态变为其他状态会触发调度更新，从而进入update的 beginwork。