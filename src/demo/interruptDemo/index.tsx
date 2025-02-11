import React from "react";
import Son from "./Son";
import Father from "./Father";

const Page = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Father />
      <Son />
      index 组件，模拟耗时长的任务
    </div>
  );
};
export default Page;
