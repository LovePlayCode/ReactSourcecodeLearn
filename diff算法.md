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
