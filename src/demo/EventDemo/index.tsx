import React from "react";

const Page = () => {
  return (
    <>
      <h1>测试</h1>
      <div
        onClick={() => {
          console.log("向上冒泡");
        }}
      >
        包裹住
        <button
          onClick={(e) => {
            e.stopPropagation()
            debugger;
          }}
        >
          测试事件
        </button>
      </div>
    </>
  );
};
export default Page;
