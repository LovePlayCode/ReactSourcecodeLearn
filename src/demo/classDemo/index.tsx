import { Component } from "react";
import React from "react";
class ErrorBoundary extends Component {
  state = {
    hasError: false,
  };
  // static getDerivedStateFromError() {
  //   console.log('in');
  //   return {
  //     hasError: true
  //   };
  // }
  // 试试注释componentDidCatch，观察错误冒泡到Root处理的情况
  render() {
    if (this.state.hasError) {
      return <div>Error !</div>;
    }

    return <div>123</div>;
  }
}
export default ErrorBoundary;
