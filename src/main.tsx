import React from "react";
import ReactDOM1 from "react-dom";
import "./globalLog";
// import App from './demo/SuspenseDemo/demo2'
// import './demo/SchedulerDemo';
// import App from './demo/BaseScheduleDemo';
// import App from './demo/LongTaskDemo';
// import App from './demo/BaseScheduleDemo';
// import App from './demo/testDemo';
// import App from './demo/bailoutDemo';
// import App from './demo/ContextDemo';
import App from "./demo/BailoutDemo/step1";
// import App from "./demo/DiffDemo/v3";
// import App from "./demo/Performance/demo2";
// import App from "./demo/ErrorCatchDemo";
// import App from "./demo/insertDemo/index";
// import App from "./demo/classDemo/index";
// import App from "./demo/Demo2";
// import App from "./demo/DemoUseContext/index";
// import App from './demo/TransitionDemo/demo3';
// import App from './demo/EventDemo/index'
// import App from "./demo/lanesDemo/index";

// import App from "./demo/interruptDemo/index";
const rootEle = document.getElementById("root");

// import './demo/MiniUpdate2State';
// import './demo/MiniDiff';
// import './demo/MiniUseState';
// import './demo/MiniSchedulePhase';

rootEle && ReactDOM1.createRoot(rootEle).render(<App />);
// ReactDOM.render(<App/> , rootEle)
