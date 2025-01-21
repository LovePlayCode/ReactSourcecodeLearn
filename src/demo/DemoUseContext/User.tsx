import React, { FC, useContext } from "react";
import MyContext from "./demo";

const User = () => {
  debugger;
  const { name, age } = useContext(MyContext);
  return (
    <>
      名字: {name}
      年龄: {age}
    </>
  );
};
export default User;
