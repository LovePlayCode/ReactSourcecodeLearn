import { useRef, useState } from "react";
import React from "react";

const Page = () => {
  debugger;
  let c = {
    a: 2,
  };
  const [state, setState] = useState("lhl");
  const ref = useRef(123);
  ref.current = state;
  return (
    <>
      {state}
      <button
        onClick={() => {
          setState("李浩龙");
          queueMicrotask(() => {
            debugger;
            console.log(ref);
          });
        }}
      >
        更换文案
      </button>
      <div
        onClick={() => {
          ref.current = 1234;
          c.a = "ljl";
        }}
      >
        1234
      </div>
      <button
        onClick={() => {
          debugger;
          console.log(ref, c);
        }}
      >
        检测值
      </button>
    </>
  );
};
export default Page;
