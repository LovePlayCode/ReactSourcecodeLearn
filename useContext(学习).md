# 创建阶段

1. 首先会调用 createContext 创建一个 Context

```js
function createContext(defaultValue) {
  debugger;
  // TODO: Second argument used to be an optional `calculateChangedBits`
  // function. Warn to reserve for future use?
  var context = {
    $$typeof: REACT_CONTEXT_TYPE,
    // As a workaround to support multiple concurrent renderers, we categorize
    // some renderers as primary and others as secondary. We only expect
    // there to be two concurrent renderers at most: React Native (primary) and
    // Fabric (secondary); React DOM (primary) and React ART (secondary).
    // Secondary renderers store their context values on separate fields.
    _currentValue: defaultValue,
    _currentValue2: defaultValue,
    // Used to track how many concurrent renderers this context currently
    // supports within in a single renderer. Such as parallel server rendering.
    _threadCount: 0,
    // These are circular
    Provider: null,
    Consumer: null,
  };
  context.Provider = {
    $$typeof: REACT_PROVIDER_TYPE,
    _context: context,
  };
  var hasWarnedAboutUsingNestedContextConsumers = false;
  var hasWarnedAboutUsingConsumerProvider = false;
  var hasWarnedAboutDisplayNameOnConsumer = false;

  {
    // A separate object, but proxies back to the original context object for
    // backwards compatibility. It has a different $$typeof, so we can properly
    // warn for the incorrect usage of Context as a Consumer.
    var Consumer = {
      $$typeof: REACT_CONTEXT_TYPE,
      _context: context,
    }; // $FlowFixMe: Flow complains about not setting a value, which is intentional here

    Object.defineProperties(Consumer, {
      Provider: {
        get: function () {
          if (!hasWarnedAboutUsingConsumerProvider) {
            hasWarnedAboutUsingConsumerProvider = true;

            error(
              "Rendering <Context.Consumer.Provider> is not supported and will be removed in " +
                "a future major release. Did you mean to render <Context.Provider> instead?"
            );
          }

          return context.Provider;
        },
        set: function (_Provider) {
          context.Provider = _Provider;
        },
      },
      _currentValue: {
        get: function () {
          return context._currentValue;
        },
        set: function (_currentValue) {
          context._currentValue = _currentValue;
        },
      },
      _currentValue2: {
        get: function () {
          return context._currentValue2;
        },
        set: function (_currentValue2) {
          context._currentValue2 = _currentValue2;
        },
      },
      _threadCount: {
        get: function () {
          return context._threadCount;
        },
        set: function (_threadCount) {
          context._threadCount = _threadCount;
        },
      },
      Consumer: {
        get: function () {
          if (!hasWarnedAboutUsingNestedContextConsumers) {
            hasWarnedAboutUsingNestedContextConsumers = true;

            error(
              "Rendering <Context.Consumer.Consumer> is not supported and will be removed in " +
                "a future major release. Did you mean to render <Context.Consumer> instead?"
            );
          }

          return context.Consumer;
        },
      },
      displayName: {
        get: function () {
          return context.displayName;
        },
        set: function (displayName) {
          if (!hasWarnedAboutDisplayNameOnConsumer) {
            warn(
              "Setting `displayName` on Context.Consumer has no effect. " +
                "You should set it directly on the context with Context.displayName = '%s'.",
              displayName
            );

            hasWarnedAboutDisplayNameOnConsumer = true;
          }
        },
      },
    }); // $FlowFixMe: Flow complains about missing properties because it doesn't understand defineProperty

    context.Consumer = Consumer;
  }

  {
    context._currentRenderer = null;
    context._currentRenderer2 = null;
  }

  return context;
}
```

主要是创建了一个 context 的数据结构，用来保存数据,看下面这个数据结构

```js
var context = {
  $$typeof: REACT_CONTEXT_TYPE,
  // As a workaround to support multiple concurrent renderers, we categorize
  // some renderers as primary and others as secondary. We only expect
  // there to be two concurrent renderers at most: React Native (primary) and
  // Fabric (secondary); React DOM (primary) and React ART (secondary).
  // Secondary renderers store their context values on separate fields.
  // 保存创建的值(看他注释有主渲染器和辅助渲染器的概念，没搞懂)
  _currentValue: defaultValue,
  _currentValue2: defaultValue,
  // Used to track how many concurrent renderers this context currently
  // supports within in a single renderer. Such as parallel server rendering.
  _threadCount: 0,
  // These are circular
  // 生产者
  Provider: null,
  // 消费者
  Consumer: null,
};
```

2. 调用 useContext 读取值，其内部调用了 readContext，下面分析一下这个函数的作用
   a. 拿到 context 对象的 \_currentValue,返回
   b. 生成 contextItem。挂载到当前 Fiber 到 dependencies currentlyRenderingFiber.dependencies

```js
function readContext(context) {
  {
    // This warning would fire if you read context inside a Hook like useMemo.
    // Unlike the class check below, it's not enforced in production for perf.
    if (isDisallowedContextReadInDEV) {
      error(
        "Context can only be read while React is rendering. " +
          "In classes, you can read it in the render method or getDerivedStateFromProps. " +
          "In function components, you can read it directly in the function body, but not " +
          "inside Hooks like useReducer() or useMemo()."
      );
    }
  }

  var value = context._currentValue;

  if (lastFullyObservedContext === context);
  else {
    var contextItem = {
      context: context,
      memoizedValue: value,
      next: null,
    };

    if (lastContextDependency === null) {
      if (currentlyRenderingFiber === null) {
        throw new Error(
          "Context can only be read while React is rendering. " +
            "In classes, you can read it in the render method or getDerivedStateFromProps. " +
            "In function components, you can read it directly in the function body, but not " +
            "inside Hooks like useReducer() or useMemo()."
        );
      } // This is the first dependency for this component. Create a new list.

      lastContextDependency = contextItem;
      currentlyRenderingFiber.dependencies = {
        lanes: NoLanes,
        firstContext: contextItem,
      };
    } else {
      // Append a new context item.
      lastContextDependency = lastContextDependency.next = contextItem;
    }
  }

  return value;
}
```

3. 当 Context 触发更新的时候，会重新执行 beginWork，然后进入生产者专门的方法:updateContextProvider，这个方法有两个作用: 1. 对新的值进行赋值 2. 判断新旧值是否相同，如果相同，命中；bailout 策略，跳过更新，如果不同，先深度遍历将所有用到的子组件的 lanes 标记为 renderLanes，然后向上遍历，将 childlanes 变为 renderLanes。 这样子组件也会更新了，即使写了 React.memo 也没用

```js
function updateContextProvider() {
  // ...

  pushProvider(workInProgress, context, newValue);

  {
    if (oldProps !== null) {
      var oldValue = oldProps.value;

      if (objectIs(oldValue, newValue)) {
        // No change. Bailout early if children are the same.
        if (oldProps.children === newProps.children && !hasContextChanged()) {
          return bailoutOnAlreadyFinishedWork(
            current,
            workInProgress,
            renderLanes
          );
        }
      } else {
        // The context value changed. Search for matching consumers and schedule
        // them to update.
        // 生产者生产出新的数据，通知消费者进行更新，会将子树的 lanes 设置为 renderlanes
        propagateContextChange(workInProgress, context, renderLanes);
      }
    }
  }
  // ...
}
```
