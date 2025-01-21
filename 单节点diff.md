# 单节点 diff

1. 判断当前新节点是否为 object
2. 首先对 key 进行比较，如果 key 相同，用 elementType 进行第二次比较，如果一致，将当前节点的兄弟节点打上删除标记，复用当前节点创建 workProgressFiber
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
