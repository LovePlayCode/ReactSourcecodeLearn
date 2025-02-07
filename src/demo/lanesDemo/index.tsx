import { useState } from "react";
import React from "react";

const Page = () => {
  debugger;
  const [state, setState] = useState("lhl");
  return (
    <>
      {state}
      <button
        onClick={() => {
          setState("李浩龙");
        }}
      >
        更换文案
      </button>
    </>
  );
};
export default Page;
