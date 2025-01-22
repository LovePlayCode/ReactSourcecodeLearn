import { useState } from "react";
import React from "react";

const Page = () => {
  const [state, setState] = useState(0);

  return (
    <>
      <div>1</div>
      <div>2</div>
      <div>3</div>
      <div>4</div>
      {state === 100 && <div>100</div>}
      <button
        onClick={() => {
          setState(100);
        }}
      >
        点击 100
      </button>
    </>
  );
};
export default Page;
