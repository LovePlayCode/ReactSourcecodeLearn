import React from "react";

const Page = () => {
  const startTime = Date.now();

  // 模拟一个会占用较长时间的操作
  while (Date.now() - startTime < 60) {
    // 模拟执行耗时操作，保持主线程占用一定时间
    console.log("12");
  }
  return <div>Father---</div>;
};
export default Page;
