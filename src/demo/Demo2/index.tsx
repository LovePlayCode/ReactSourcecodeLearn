import React, { useEffect, useLayoutEffect, useState } from "react";
function Demo3() {
  return <div>Hello谦男</div>;
}

const Demo2 = () => {
  debugger;
  const [state, setState] = useState([
    { label: "1", id: 1 },
    { label: "2", id: 2 },
  ]);

  useEffect(() => {
    debugger;
    console.log("打印");
  }, [state]);

  useLayoutEffect(() => {
    console.log("打印useLayoutEffect");
  }, []);

  return (
    <>
      <div>
        Hello_React
        {state.map((item) => (
          <span key={item.id}>{item.label}</span>
        ))}
        <button
          onClick={() => {
            debugger;
            setState([
              { label: "1", id: 100 },
              { label: "22", id: 200 },
            ]);
          }}
        >
          删除元素
        </button>
      </div>
      <Demo3 />
    </>
  );
};
export default Demo2;
