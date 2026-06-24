# TIA Portal V21 创建步骤

## 1. 创建采集 DB

1. 在“外部源”中添加 `DB_Modbus采集.db`。
2. 右键该源，选择“从源生成块”。
3. 检查 `DB_Modbus采集` 的“优化的块访问”必须关闭。
4. 如果 CPU 的 PROFINET 接口硬件标识不是 `16#40`，把 `连接参数.InterfaceId` 改成实际硬件标识。

`连接参数.RemoteAddress` 已设置为采集电脑 `192.168.0.10`，本地端口为 `502`。

## 2. 创建采集块

1. 新建 FB，名称为 `modbus_caiji_new`，语言选择 SCL。
2. 不要把 `FUNCTION_BLOCK`、`BEGIN` 等完整源代码粘进程序体。
3. 只复制 `modbus_caiji_new_BODY.scl` 的内容到程序体。
4. 编译该 FB。

## 3. 创建 Modbus TCP 块

1. 新建 FB，名称为 `modbus_tcp_new`，语言选择 SCL。
2. 在 FB 的 `Static` 区增加变量 `ModbusServer`，数据类型为 `MB_SERVER`。
3. 只复制 `modbus_tcp_new_BODY.scl` 的调用代码到程序体。
4. 如果不能直接输入 `MB_SERVER` 数据类型，把通信指令中的 `MB_SERVER` 拖入程序体，实例选择“多重实例”，实例名填 `ModbusServer`。
5. 编译该 FB。

如果符号形式的 ANY 指针不被当前 CPU 接受，先查看 `DB_Modbus采集` 的实际 DB 编号。例如它是 DB200，就把：

```scl
P#DB_Modbus采集.DBX0.0 BYTE 80
```

改成：

```scl
P#DB200.DBX0.0 WORD 40
```

## 4. 在 OB1 中调用

分别调用：

- `modbus_caiji_new`
- `modbus_tcp_new`

每个 FB 使用自己独立的实例 DB。不要把一个 FB 的实例 DB 名放到另一个 FB 上。建议两个调用分别放在两个网络中。

## 5. 下载与测试

1. 完整编译软件。
2. 下载 PLC。
3. 打开监控表，确认 `DB_Modbus采集.寄存器[2..4]` 会随楼层变化。
4. 在电脑上运行原采集程序的 `read_once.py 0 40`。
5. 单次读取成功后，再运行 `main.py` 进行 5 分钟采集。

Python 字段映射见 `config_new_project.py`。使用新工程采集时，将它的配置内容用于采集程序；不要覆盖旧工程配置，除非已经备份。
