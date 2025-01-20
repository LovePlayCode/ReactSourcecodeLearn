import React, { useEffect, useLayoutEffect } from "react";
function Demo3() {
  return <div>Hello谦男</div>;
}

const Demo2 = () => {
  return (
    <>
      <div>
        Hello_React
        <span>1</span>
        <span>2</span>
        <span>3</span>
      </div>
      <Demo3 />
    </>
  );
};
export default Demo2;
