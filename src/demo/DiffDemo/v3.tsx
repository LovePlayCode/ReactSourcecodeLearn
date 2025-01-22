import React, { FC, useEffect, useState } from "react";
import { bindHook, getLibraryMethod, utils } from "log";

const {
  log,
  COLOR: { SCHEDULE_COLOR, RENDER_COLOR, COMMIT_COLOR },
} = utils;

bindHook("placeChild", (type, fiber, lastPlacedIndex) => {
  log(RENDER_COLOR, `${type} lastPlacedIndex: ${lastPlacedIndex}`, fiber);
});
const DemoLi: FC<{ sum: number }> = ({ sum }) => {
  console.log("初始化。。。");
  useEffect(() => {}, []);
  return <li>{sum}</li>;
  // return sum === 100 ? <span>{sum}</span> : <li>{sum}</li>;
};

// 用于调试 Diff算法 的Demo
export default function App() {
  const [num, updateNum] = useState(0);

  if (num === 0) {
    return (
      <ul onClick={() => updateNum(1)}>
        <DemoLi key="a" sum={1} />
        <DemoLi key="b" sum={2} />
      </ul>
    );
  }

  return (
    <ul onClick={() => updateNum(1)}>
      <DemoLi key="a" sum={100} />
      <DemoLi key="b1" sum={2} />
    </ul>
  );
}
