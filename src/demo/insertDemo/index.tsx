import { useState } from "react";
import React from "react";

const Page = () => {
  const [state, setState] = useState(0);

  if (state === 100) {
    return (
      <>
        <div key={2}>2</div>
        <div key={1}>1</div>
        <div key={4}>4</div>
        <div key={3}>3</div>
      </>
    );
  }
  return (
    <>
      <div
        onClick={() => {
          setState(100);
        }}
        key={1}
      >
        1
      </div>
      <div key={2}>2</div>
      <div key={3}>3</div>
      <div key={4}>4</div>
    </>
  );
};
export default Page;
