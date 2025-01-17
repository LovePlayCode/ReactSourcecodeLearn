import React, { useEffect, useLayoutEffect, useState } from "react";
const Index = () => {
  const [num, setNum] = useState(0);
  // 副作用队列
  useEffect(() => {}, []);
  // 更新队列
  useLayoutEffect(() => {}, []);
  return (
    <div>
      当前数字：{num}
      <button
        onClick={() => {
          setNum(num + 1);
          setNum(100);
        }}
      >
        num++
      </button>
    </div>
  );
};
export default Index;
