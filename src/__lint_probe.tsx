/**
 * Lint probe — ไฟล์ตัวอย่างที่ตั้งใจ lint error
 *
 * ใช้พิสูจน์ว่า `npm run lint` ตรวจจับ error จริงได้:
 * - react/no-direct-mutation-state: mutation ตรง ๆ ใน state object
 *
 * ถ้า lint ไม่ error ในไฟล์นี้ = config ไม่ทำงาน → ต้องแก้
 */

import { Component } from "react";

export class Probe extends Component<{ count: number }> {
  state = { count: 0 };

  handleClick() {
    this.state.count++;
  }

  render() {
    return <div onClick={() => this.handleClick()}>click</div>;
  }
}
