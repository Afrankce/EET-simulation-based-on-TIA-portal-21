import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const output = [];
const line = (value = "") => output.push(value);
const reg = (index) => `"DB_Modbus采集".寄存器[${index}]`;
const out = (name) => `"OUT"."${name}"`;
const input = (name) => `"IN"."${name}"`;
const group = (name) => `"DB_群控状态".${name}`;
const config = (name) => `"DB_系统配置".${name}`;
const word = (bit) => `WORD#16#${(1 << bit).toString(16).padStart(4, "0").toUpperCase()}`;

function clear(index) {
  line(`${reg(index)} := WORD#16#0000;`);
}

function setBit(index, condition, bit) {
  line(`IF ${condition} THEN ${reg(index)} := ${reg(index)} OR ${word(bit)}; END_IF;`);
}

line("// 地址0为场景编号，本块不覆盖。");
line(`${reg(1)} := INT_TO_WORD(${config("群控调度策略")});`);
for (let car = 1; car <= 3; car += 1) {
  line(`${reg(1 + car)} := INT_TO_WORD(${group(`梯当前楼层[${car}]`)});`);
  line(`${reg(4 + car)} := INT_TO_WORD(${group(`梯运行方向[${car}]`)});`);
  line(`${reg(7 + car)} := ${input(`${car}号梯当前载重量`)};`);
}
line();

// 11..13: service, fault, full, inspection and motion state.
for (let car = 1; car <= 3; car += 1) {
  const index = 10 + car;
  clear(index);
  setBit(index, group(`梯是否服务中[${car}]`), 0);
  setBit(index, group(`梯是否故障[${car}]`), 1);
  setBit(index, group(`梯是否满载[${car}]`), 2);
  setBit(index, group(`梯是否检修[${car}]`), 3);
  setBit(index, out(`${car}号梯电机启动信号`), 4);
  setBit(index, out(`${car}号梯上行接触器`), 5);
  setBit(index, out(`${car}号梯下行接触器`), 6);
  setBit(index, out(`${car}号梯高速接触器`), 7);
  setBit(index, out(`${car}号梯低速接触器`), 8);
  setBit(index, out(`${car}号梯开门继电器`), 9);
  setBit(index, out(`${car}号梯关门继电器`), 10);
  line();
}

// 14..15: registered hall calls.
clear(14);
for (let floor = 1; floor <= 9; floor += 1) {
  setBit(14, group(`外呼上已登记[${floor}]`), floor - 1);
}
clear(15);
for (let floor = 2; floor <= 10; floor += 1) {
  setBit(15, group(`外呼下已登记[${floor}]`), floor - 1);
}
line();

// 16..18: latched car calls represented by button lamps.
for (let car = 1; car <= 3; car += 1) {
  const index = 15 + car;
  clear(index);
  for (let floor = 1; floor <= 10; floor += 1) {
    setBit(index, out(`${car}号梯${floor}层按钮指示灯`), floor - 1);
  }
  line();
}

// 19..24: hall-call assignment bitmaps.
for (let index = 19; index <= 24; index += 1) clear(index);
for (let floor = 1; floor <= 9; floor += 1) {
  for (let car = 1; car <= 3; car += 1) {
    setBit(18 + car, `${group(`外呼上分配给梯号[${floor}]`)} = ${car}`, floor - 1);
  }
}
for (let floor = 2; floor <= 10; floor += 1) {
  for (let car = 1; car <= 3; car += 1) {
    setBit(21 + car, `${group(`外呼下分配给梯号[${floor}]`)} = ${car}`, floor - 1);
  }
}
line();

// 25..27: output action bitmap.
const actions = [
  ["电机启动信号", 0],
  ["上行接触器", 1],
  ["下行接触器", 2],
  ["高速接触器", 3],
  ["低速接触器", 4],
  ["开门继电器", 5],
  ["关门继电器", 6],
  ["1级减速制动", 7],
  ["2级减速制动", 8],
  ["3级减速制动", 9],
  ["照明指示", 10],
  ["风扇指示", 11],
  ["满载指示", 12],
  ["故障指示", 13],
];
for (let car = 1; car <= 3; car += 1) {
  const index = 24 + car;
  clear(index);
  for (const [name, bit] of actions) setBit(index, out(`${car}号梯${name}`), bit);
  line();
}

// 28..30: door and safety input bitmap.
const safety = [
  ["轿内开门按钮", 0],
  ["轿内关门按钮", 1],
  ["光幕信号", 2],
  ["轿厢门锁信号", 3],
  ["开门到位", 4],
  ["关门到位", 5],
  ["上平层信号", 6],
  ["下平层信号", 7],
  ["检修信号", 8],
  ["上端站第1限位", 9],
  ["上端站第2限位", 10],
  ["下端站第1限位", 11],
  ["下端站第2限位", 12],
];
for (let car = 1; car <= 3; car += 1) {
  const index = 27 + car;
  clear(index);
  for (const [name, bit] of safety) setBit(index, input(`${car}号梯${name}`), bit);
  line();
}

line(`${reg(31)} := INT_TO_WORD(${group("群控扫描计数器")});`);
line(`${reg(32)} := INT_TO_WORD(${config("群控外呼超时重分配_s")});`);

// 33..36: aggregate elevator state bitmaps.
for (const [index, name] of [
  [33, "梯是否服务中"],
  [34, "梯是否故障"],
  [35, "梯是否满载"],
  [36, "梯是否检修"],
]) {
  clear(index);
  for (let car = 1; car <= 3; car += 1) setBit(index, group(`${name}[${car}]`), car - 1);
}

clear(37);
setBit(37, config("群控允许节能待机"), 0);
setBit(37, `"IN".自动运行信号`, 1);
setBit(37, `"OUT".准备就绪信号`, 2);
line(`${reg(38)} := INT_TO_WORD(${config("建筑最高楼层")});`);
line(`${reg(39)} := INT_TO_WORD(${config("电梯总数")});`);

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, "modbus_caiji_new_BODY.scl"), `${output.join("\r\n")}\r\n`, "utf8");
