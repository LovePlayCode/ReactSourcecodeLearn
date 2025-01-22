# commit 阶段

finishConcurrentRender 函数是入口

调用了 commitBeforeMutationEffects 进入 beforeMutation 阶段。
调用 commitMutationEffects 进入了 mutation 阶段
调用 commitLayoutEffects 进入了 layout 阶段
最后调用了 requestPaint 让浏览器进行渲染
