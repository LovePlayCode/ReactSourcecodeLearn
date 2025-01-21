import React, { FC, memo, useContext } from "react";
import MyContext from "./demo";

const User = () => {
  console.log("user===");
  debugger;
  const { name, age } = useContext(MyContext);
  return (
    <>
      名字: {name}
      年龄: {age}
    </>
  );
};
export default memo(User, () => {
  debugger;
  return true;
});
