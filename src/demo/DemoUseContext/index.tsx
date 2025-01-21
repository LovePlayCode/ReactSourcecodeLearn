import React, { useState } from "react";
import MyContext from "./demo";
import User from "./User";

const DemoUseContext = () => {
  const [name, setName] = useState("谦男");
  const [age, setAge] = useState(20);
  const [_, setCount] = useState(1);
  return (
    <>
      <MyContext.Provider value={{ name: name, age: age }}>
        <User />
      </MyContext.Provider>
      <button
        onClick={() => {
          setName("谦男真帅");
        }}
      >
        更换名字
      </button>
      <button
        onClick={() => {
          setCount((cout) => cout + 1);
        }}
      >
        更新
      </button>
    </>
  );
};
export default DemoUseContext;
