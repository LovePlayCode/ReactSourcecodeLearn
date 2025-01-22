参考文章: [text](https://blog.csdn.net/weixin_42554191/article/details/144013324)

# 单节点 diff

1. 判断新节点是否为 单节点(类型为 object | number | string)
2. 进行旧的树的遍历，找到和当前节点 key 一样的节点，如果 key 相同，用 elementType 进行第二次比较，如果一致，将当前节点的兄弟节点打上删除标记(因为是单节点)，复用当前节点创建 workProgressFiber
3. 如果 key 不同，则仅标记当前 fiber 为删除状态，继续进行遍历，因为可能构建好的 fiber 树有兄弟节点，不保证后续可以找到复用的节点，所以将当前节点标记删除即可。

```js
function reconcileSingleElement(
  returnFiber,
  currentFirstChild,
  element,
  lanes
) {
  var key = element.key;
  var child = currentFirstChild;

  while (child !== null) {
    // TODO: If key === null and child.key === null, then this only applies to
    // the first item in the list.
    if (child.key === key) {
      var elementType = element.type;

      if (elementType === REACT_FRAGMENT_TYPE) {
        if (child.tag === Fragment) {
          deleteRemainingChildren(returnFiber, child.sibling);
          var existing = useFiber(child, element.props.children);
          existing.return = returnFiber;

          {
            existing._debugSource = element._source;
            existing._debugOwner = element._owner;
          }

          return existing;
        }
      } else {
        if (
          child.elementType === elementType || // Keep this check inline so it only runs on the false path:
          isCompatibleFamilyForHotReloading(child, element) || // Lazy types should reconcile their resolved type.
          // We need to do this after the Hot Reloading check above,
          // because hot reloading has different semantics than prod because
          // it doesn't resuspend. So we can't let the call below suspend.
          (typeof elementType === "object" &&
            elementType !== null &&
            elementType.$$typeof === REACT_LAZY_TYPE &&
            resolveLazy(elementType) === child.type)
        ) {
          deleteRemainingChildren(returnFiber, child.sibling);

          var _existing = useFiber(child, element.props);

          _existing.ref = coerceRef(returnFiber, child, element);
          _existing.return = returnFiber;

          {
            _existing._debugSource = element._source;
            _existing._debugOwner = element._owner;
          }

          return _existing;
        }
      } // Didn't match.

      deleteRemainingChildren(returnFiber, child);
      break;
    } else {
      deleteChild(returnFiber, child);
    }

    child = child.sibling;
  }

  if (element.type === REACT_FRAGMENT_TYPE) {
    var created = createFiberFromFragment(
      element.props.children,
      returnFiber.mode,
      lanes,
      element.key
    );
    created.return = returnFiber;
    return created;
  } else {
    var _created4 = createFiberFromElement(element, returnFiber.mode, lanes);

    _created4.ref = coerceRef(returnFiber, currentFirstChild, element);
    _created4.return = returnFiber;
    return _created4;
  }
}
```

# 多节点 diff

1. 如果当前 newChild 类型为 Array、iterator，代表更新后同级有多个元素，进入多节点 diff 过程。
2. 总共分为两次遍历；
3. 第一次遍历，将 newChild 中每个元素和 oldFiber 比较，判断是否可以复用。 如果不可复用，分为两种情况
   a. key 不同导致不可复用，立即跳出循环，第一轮遍历结束
   b. key 相同 type 不同导致不可复用，将 oldFiber 标记为 DELETION，继续遍历
4. 如果 newChildren 便利完(newIdx === newChildren.length) 或 oldFiber 遍历完(oldFiber === null) 跳出遍历，第一轮结束
5. 如果当前 newChildrenArr 遍历完，oldFiber 没遍历完，需要将 oldFiber 树剩余元素全部打上删除标记。
6. 如果当前 oldFiber 遍历完，newChildrenArr 没遍历完，遍历剩余的 newChildren，创建新 Fiber 节点。
7. 如果上面两项都不满足，先将当前老的 Fiber 节点创建成 map，map 的 key 是元素的 key，map 的值是 fiber 节点
8. 开启遍历，如果在 map 中找到了相同 key 的节点，判断 可以复用后，还会去判断老的 Fiber 上的 index 和 lastPlacedIndex 的对应关系，如果小于 lastPlacedIndex, 说明需要打移动的标志，在 flags 打上移动标志。 如果大于等于 lastPlacedIndex，不需要移动，直接返回 oldIndex 即可。

```js
for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
  if (oldFiber.index > newIdx) {
    nextOldFiber = oldFiber;
    oldFiber = null;
  } else {
    nextOldFiber = oldFiber.sibling;
  }

  var newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);

  if (newFiber === null) {
    // TODO: This breaks on empty slots like null children. That's
    // unfortunate because it triggers the slow path all the time. We need
    // a better way to communicate whether this was a miss or null,
    // boolean, undefined, etc.
    if (oldFiber === null) {
      oldFiber = nextOldFiber;
    }

    break;
  }

  if (shouldTrackSideEffects) {
    if (oldFiber && newFiber.alternate === null) {
      // We matched the slot, but we didn't reuse the existing fiber, so we
      // need to delete the existing child.
      deleteChild(returnFiber, oldFiber);
    }
  }

  lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

  if (previousNewFiber === null) {
    // TODO: Move out of the loop. This only happens for the first run.
    resultingFirstChild = newFiber;
  } else {
    // TODO: Defer siblings if we're not at the right index for this slot.
    // I.e. if we had null values before, then we want to defer this
    // for each null value. However, we also don't want to call updateSlot
    // with the previous one.
    previousNewFiber.sibling = newFiber;
  }

  previousNewFiber = newFiber;
  oldFiber = nextOldFiber;
}

// 当newChildren遍历完，oldFiber未遍历完，需要遍历其余oldFiber，依次打上Deletion
if (newIdx === newChildren.length) {
  // We've reached the end of the new children. We can delete the rest.
  deleteRemainingChildren(returnFiber, oldFiber);

  if (getIsHydrating()) {
    var numberOfForks = newIdx;
    pushTreeFork(returnFiber, numberOfForks);
  }

  return resultingFirstChild;
}

// oldFiber遍历完，newChildren未遍历完，需要遍历剩下newChildren依次生成fiberNode
if (oldFiber === null) {
  // If we don't have any more existing children we can choose a fast path
  // since the rest will all be insertions.
  for (; newIdx < newChildren.length; newIdx++) {
    var _newFiber = createChild(returnFiber, newChildren[newIdx], lanes);

    if (_newFiber === null) {
      continue;
    }

    lastPlacedIndex = placeChild(_newFiber, lastPlacedIndex, newIdx);

    if (previousNewFiber === null) {
      // TODO: Move out of the loop. This only happens for the first run.
      resultingFirstChild = _newFiber;
    } else {
      previousNewFiber.sibling = _newFiber;
    }

    previousNewFiber = _newFiber;
  }

  if (getIsHydrating()) {
    var _numberOfForks = newIdx;
    pushTreeFork(returnFiber, _numberOfForks);
  }

  return resultingFirstChild;
} // Add all children to a key map for quick lookups.

// 这里的阶段是进入了第二次遍历到情况，先把老的 Fiber 树全部变成一个 map 结构，方便以O(1)的时间复杂度取值
// 这里的逻辑有一个点：如果有 key， 那么 map 的结构是 key: fiber 如果没 key，map 的结构是 index : fiber
var existingChildren = mapRemainingChildren(returnFiber, oldFiber); // Keep scanning and use the map to restore deleted items as moves.

for (; newIdx < newChildren.length; newIdx++) {
  var _newFiber2 = updateFromMap(
    existingChildren,
    returnFiber,
    newIdx,
    newChildren[newIdx],
    lanes
  );

  if (_newFiber2 !== null) {
    if (shouldTrackSideEffects) {
      if (_newFiber2.alternate !== null) {
        // The new fiber is a work in progress, but if there exists a
        // current, that means that we reused the fiber. We need to delete
        // it from the child list so that we don't add it to the deletion
        // list.
        existingChildren.delete(
          _newFiber2.key === null ? newIdx : _newFiber2.key
        );
      }
    }

    lastPlacedIndex = placeChild(_newFiber2, lastPlacedIndex, newIdx);

    if (previousNewFiber === null) {
      resultingFirstChild = _newFiber2;
    } else {
      previousNewFiber.sibling = _newFiber2;
    }

    previousNewFiber = _newFiber2;
  }
}
```

# 优化阶段

当 diff 比较完之后，进入优化阶段。目前看下来主要有两个地方会对这个进行优化

1. completeWork 阶段， 这个阶段根据是否有 current 进行判断，如果 current !== null 且 stateNode !== null。 completeWork 不会创建新的节点，只会创建一个 updatePayload, 然后绑定到当前 Fiber 的 updateQueue 上。

```js

        case HostComponent: {
          popHostContext(workInProgress);
          var rootContainerInstance = getRootHostContainer();
          var type = workInProgress.type;

          // 如果是复用的节点，那么会走到这里，在 这里创建一个更新队列，进行数据的更新。 然后将副作用冒泡之后，直接 return
          // 如果 current= null 说明是新创建的节点，走创建流程即可。
          if (current !== null && workInProgress.stateNode != null) {
            updateHostComponent(
              current,
              workInProgress,
              type,
              newProps,
              rootContainerInstance
            );

            if (current.ref !== workInProgress.ref) {
              markRef(workInProgress);
            }
          } else {
            if (!newProps) {
              if (workInProgress.stateNode === null) {
                throw new Error(
                  "We must have new props for new mounts. This error is likely " +
                    "caused by a bug in React. Please file an issue."
                );
              } // This can happen when we abort work.

              bubbleProperties(workInProgress);
              return null;
            }

            var currentHostContext = getHostContext(); // TODO: Move createInstance to beginWork and keep it on a context
            // "stack" as the parent. Then append children as we go in beginWork
            // or completeWork depending on whether we want to add them top->down or
            // bottom->up. Top->down is faster in IE11.

            var _wasHydrated = popHydrationState(workInProgress);

            if (_wasHydrated) {
              // TODO: Move this and createInstance step into the beginPhase
              // to consolidate.
              if (
                prepareToHydrateHostInstance(
                  workInProgress,
                  rootContainerInstance,
                  currentHostContext
                )
              ) {
                // If changes to the hydrated node need to be applied at the
                // commit-phase we mark this as such.
                markUpdate(workInProgress);
              }
            } else {
              var instance = createInstance(
                type,
                newProps,
                rootContainerInstance,
                currentHostContext,
                workInProgress
              );
              appendAllChildren(instance, workInProgress, false, false);
              workInProgress.stateNode = instance; // Certain renderers require commit-time effects for initial mount.
              // (eg DOM renderer supports auto-focus for certain elements).
              // Make sure such renderers get scheduled for later work.

              if (
                finalizeInitialChildren(
                  instance,
                  type,
                  newProps,
                  rootContainerInstance
                )
              ) {
                markUpdate(workInProgress);
              }
            }

            if (workInProgress.ref !== null) {
              // If there is a ref on a host node we need to schedule a callback
              markRef(workInProgress);
            }
          }

          bubbleProperties(workInProgress);
          return null;
        }



         // 将updateHostComponent绑定一个函数，这个函数在completeWork更新的时候会执行
      updateHostComponent = function (
        current,
        workInProgress,
        type,
        newProps,
        rootContainerInstance
      ) {
        // If we have an alternate, that means this is an update and we need to
        // schedule a side-effect to do the updates.
        var oldProps = current.memoizedProps;

        if (oldProps === newProps) {
          // In mutation mode, this is sufficient for a bailout because
          // we won't touch this node even if children changed.
          return;
        } // If we get updated because one of our children updated, we don't
        // have newProps so we'll have to reuse them.
        // TODO: Split the update API as separate for the props vs. children.
        // Even better would be if children weren't special cased at all tho.

        var instance = workInProgress.stateNode;
        var currentHostContext = getHostContext(); // TODO: Experiencing an error where oldProps is null. Suggests a host
        // component is hitting the resume path. Figure out why. Possibly
        // related to `hidden`.

        var updatePayload = prepareUpdate(
          instance,
          type,
          oldProps,
          newProps,
          rootContainerInstance,
          currentHostContext
        ); // TODO: Type this specific to this type of component.

        workInProgress.updateQueue = updatePayload; // If the update payload indicates that there is a change or if there
        // is a new ref we mark this as an update. All the work is done in commitWork.

        if (updatePayload) {
          markUpdate(workInProgress);
        }
      };
```

2. 在 commit 阶段，会根据 flgas 判断当前更新属于 update 还是其他，如果是 update，会复用节点，具体就是会遍历 updatQueue，然后只会更新 dom 里面的值，就避免了创建新 dom 而带来的性能损耗。

```js
    function commitMutationEffectsOnFiber(finishedWork, root) {
      // TODO: The factoring of this phase could probably be improved. Consider
      // switching on the type of work before checking the flags. That's what
      // we do in all the other phases. I think this one is only different
      // because of the shared reconciliation logic below.
      var flags = finishedWork.flags;

      if (flags & ContentReset) {
        commitResetTextContent(finishedWork);
      }

      if (flags & Ref) {
        var current = finishedWork.alternate;

        if (current !== null) {
          commitDetachRef(current);
        }
      }

      if (flags & Visibility) {
        switch (finishedWork.tag) {
          case SuspenseComponent: {
            var newState = finishedWork.memoizedState;
            var isHidden = newState !== null;

            if (isHidden) {
              var _current = finishedWork.alternate;
              var wasHidden =
                _current !== null && _current.memoizedState !== null;

              if (!wasHidden) {
                // TODO: Move to passive phase
                markCommitTimeOfFallback();
              }
            }

            break;
          }

          case OffscreenComponent: {
            var _newState = finishedWork.memoizedState;

            var _isHidden = _newState !== null;

            var _current2 = finishedWork.alternate;

            var _wasHidden =
              _current2 !== null && _current2.memoizedState !== null;

            var offscreenBoundary = finishedWork;

            {
              // TODO: This needs to run whenever there's an insertion or update
              // inside a hidden Offscreen tree.
              hideOrUnhideAllChildren(offscreenBoundary, _isHidden);
            }

            {
              if (_isHidden) {
                if (!_wasHidden) {
                  if ((offscreenBoundary.mode & ConcurrentMode) !== NoMode) {
                    nextEffect = offscreenBoundary;
                    var offscreenChild = offscreenBoundary.child;

                    while (offscreenChild !== null) {
                      nextEffect = offscreenChild;
                      disappearLayoutEffects_begin(offscreenChild);
                      offscreenChild = offscreenChild.sibling;
                    }
                  }
                }
              }

              break;
            }
          }
        }
      } // The following switch statement is only concerned about placement,
      // updates, and deletions. To avoid needing to add a case for every possible
      // bitmap value, we remove the secondary effects from the effect tag and
      // switch on that value.

      var primaryFlags = flags & (Placement | Update | Hydrating);

      // 通过副作用判断当前是插入还是更新，每个副作用有不同的分支
      switch (primaryFlags) {
        case Placement: {
          /*KaSong*/ logHook("updateDOM", finishedWork, "commitPlacement");
          commitPlacement(finishedWork); // Clear the "placement" from effect tag so that we know that this is
          // inserted, before any life-cycles like componentDidMount gets called.
          // TODO: findDOMNode doesn't rely on this any more but isMounted does
          // and isMounted is deprecated anyway so we should be able to kill this.

          finishedWork.flags &= ~Placement;
          break;
        }

        case PlacementAndUpdate: {
          // Placement
          /*KaSong*/ logHook("updateDOM", finishedWork, "commitPlacement");
          commitPlacement(finishedWork); // Clear the "placement" from effect tag so that we know that this is
          // inserted, before any life-cycles like componentDidMount gets called.

          finishedWork.flags &= ~Placement; // Update

          var _current3 = finishedWork.alternate;
          /*KaSong*/ logHook("updateDOM", finishedWork, "commitWork");
          commitWork(_current3, finishedWork);
          break;
        }

        case Hydrating: {
          finishedWork.flags &= ~Hydrating;
          break;
        }

        case HydratingAndUpdate: {
          finishedWork.flags &= ~Hydrating; // Update

          var _current4 = finishedWork.alternate;
          commitWork(_current4, finishedWork);
          break;
        }

        // 更新阶段，React 对这部分做了优化
        case Update: {
          var _current5 = finishedWork.alternate;
          /*KaSong*/ logHook("updateDOM", finishedWork, "commitWork");
          commitWork(_current5, finishedWork);
          break;
        }
      }
    }

    // 这段代码是实际优化的地方
            case HostComponent: {
          var instance = finishedWork.stateNode;

          // 如果是可复用的节点，会按照 updateQueue 进行节点的更新，避免重新创建 dom 元素
          if (instance != null) {
            // Commit the work prepared earlier.
            var newProps = finishedWork.memoizedProps; // For hydration we reuse the update path but we treat the oldProps
            // as the newProps. The updatePayload will contain the real change in
            // this case.

            var oldProps = current !== null ? current.memoizedProps : newProps;
            var type = finishedWork.type; // TODO: Type the updateQueue to be specific to host components.

            var updatePayload = finishedWork.updateQueue;
            finishedWork.updateQueue = null;

            if (updatePayload !== null) {
              commitUpdate(instance, updatePayload, type, oldProps, newProps);
            }
          }

          return;
        }


        function commitUpdate(
      domElement,
      updatePayload,
      type,
      oldProps,
      newProps,
      internalInstanceHandle
    ) {
      // Update the props handle so that we know which props are the ones with
      // with current event handlers.
      updateFiberProps(domElement, newProps); // Apply the diff to the DOM node.

      updateProperties(domElement, updatePayload, type, oldProps, newProps);
    }

        function updateFiberProps(node, props) {
      node[internalPropsKey] = props;
    }


        function updateProperties(
      domElement,
      updatePayload,
      tag,
      lastRawProps,
      nextRawProps
    ) {
      // Update checked *before* name.
      // In the middle of an update, it is possible to have multiple checked.
      // When a checked radio tries to change name, browser makes another radio's checked false.
      if (
        tag === "input" &&
        nextRawProps.type === "radio" &&
        nextRawProps.name != null
      ) {
        updateChecked(domElement, nextRawProps);
      }

      var wasCustomComponentTag = isCustomComponent(tag, lastRawProps);
      var isCustomComponentTag = isCustomComponent(tag, nextRawProps); // Apply the diff.

      updateDOMProperties(
        domElement,
        updatePayload,
        wasCustomComponentTag,
        isCustomComponentTag
      ); // TODO: Ensure that an update gets scheduled if any of the special props
      // changed.

      switch (tag) {
        case "input":
          // Update the wrapper around inputs *after* updating props. This has to
          // happen after `updateDOMProperties`. Otherwise HTML5 input validations
          // raise warnings and prevent the new value from being assigned.
          updateWrapper(domElement, nextRawProps);
          break;

        case "textarea":
          updateWrapper$1(domElement, nextRawProps);
          break;

        case "select":
          // <select> value update needs to occur after <option> children
          // reconciliation
          postUpdateWrapper(domElement, nextRawProps);
          break;
      }
    }



        // 在 commit 阶段，如果遇到可以复用的节点，会走复用逻辑
    function updateDOMProperties(
      domElement,
      updatePayload,
      wasCustomComponentTag,
      isCustomComponentTag
    ) {
      // TODO: Handle wasCustomComponentTag
      for (var i = 0; i < updatePayload.length; i += 2) {
        var propKey = updatePayload[i];
        var propValue = updatePayload[i + 1];

        if (propKey === STYLE) {
          setValueForStyles(domElement, propValue);
          /*KaSong*/ logHook(
            "updateDOMProperties",
            domElement,
            "setValueForStyles"
          );
        } else if (propKey === DANGEROUSLY_SET_INNER_HTML) {
          setInnerHTML(domElement, propValue);
          /*KaSong*/ logHook("updateDOMProperties", domElement, "setInnerHTML");
        } else if (propKey === CHILDREN) {
          setTextContent(domElement, propValue);
          /*KaSong*/ logHook(
            "updateDOMProperties",
            domElement,
            "setTextContent"
          );
        } else {
          setValueForProperty(
            domElement,
            propKey,
            propValue,
            isCustomComponentTag
          );
          /*KaSong*/ logHook(
            "updateDOMProperties",
            domElement,
            "setValueForProperty"
          );
        }
      }
    }
```
