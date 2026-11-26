# ID 校准调试指南

> 归档：本文用于分析旧版 ID 自动校准。当前面板已移除该入口，昵称为可选手填；已有日志仍可查看。

适用于 Windows 上的三角洲观察 1.0.4 起。每次点击「ID 校准」，倒计时结束后，World 为这次尝试分配一个编号。采集到有效画面后，它会把送入识别的同一帧以原尺寸 PNG 保存在本机。同一次尝试的原图读取和局部放大共用这张截图。

## 复现一次

1. 打开「三角洲观察 → 运行状态」，确认观察屏幕与游戏所在屏幕一致，并允许读取。打开自己的「个人信息」页，让右下角昵称名片可见。
2. 在「玩家识别」点击「ID 校准」。如果设置窗口遮挡游戏，在 3 秒倒计时结束前切回游戏。Ctrl+Shift+F8 用于战斗和物品区域校准。
3. 若识别失败，记下提示末尾的日志编号。点击「查看调试日志」，资源管理器会选中 `attempts.jsonl`。在同一目录找到 `frame-<完整编号>.png`，先核对这张图实际显示的画面。

官方便携版的默认位置为 `data/home/companion/data/worlds/delta/identity-debug/`，相对于便携版根目录。其他部署在 World 数据目录的 `worlds/delta/identity-debug/` 下。按钮呈灰色时，先确认倒计时已经结束、World 正在运行，且当前部署数据目录可写。

## 读取一次尝试

日志每行是一个 JSON 对象。`timestamp` 使用 UTC（末尾为 Z），`attemptId` 的前八位对应面板编号。在日志目录打开 PowerShell，将下面的编号替换为面板所示值。

```powershell
$ref = '1234abcd'
Get-Content -LiteralPath '.\attempts.jsonl' -Encoding utf8 |
    ForEach-Object { $_ | ConvertFrom-Json } |
    Where-Object { $_.attemptId -like "$ref*" } |
    Select-Object timestamp, stage, field, scale, reason, localOcrStarted, screenshot
```

- **没有截图。** 从 `start` 查看显示器和配置比例，再读最后一行 `finish.reason`。`permission-denied` 表示缺少读取授权，`busy` 表示已有校准进行中，`source-changed` 表示采集源发生变化。`frame-write-failed` 在 `frame` 行，表示已拿到画面、写入 PNG 失败。
- **有图但没有开始局部识别。** 查看 `recognition-finish.localOcrStarted` 和 `reason`。`no-selected-tab` 表示各候选画面区都没有检测到选中页签的绿色底线。如果截图是桌面，先核对显示器和前台窗口。如果截图确实是游戏，核对 `viewport.box` 和 `selectedGreenLine`。`title-unconfirmed` 表示页签标题证据不足。
- **读到了个人页但没有昵称。** `name-region-missing` 表示未定位到昵称行，可用 `name-icons` 检查名片图标。`nickname-unreadable` 可对照 `name-region.box`、`name-reading` 和 `scale`，区分原尺寸与两倍读取，以及字符缺失或读数冲突。`account-mismatch` 表示画面的账号标记不一致。
- **OCR 或进程异常。** `ocr-language-unavailable` 表示所需的 Windows OCR 语言不可用。`ocr-skip.reason=deadline` 表示本轮时间用尽。若缺少 `recognition-finish`，查找 `error` 的操作名和最终 `finish`，区分采集、OCR、超时或取消。

## 保留与清理

目录最多保留最近 3 张 `frame-*.png`，写入新帧后按修改时间删除更早的文件。识别失败、再次校准、关闭面板或重启后，可以复查仍留在目录中的截图。核对候选或手工输入昵称，点击「保存 ID」并成功写入后，插件清理剩余的 ID 截图；有待清理截图时也可以保存原昵称。保存失败可重试。`attempts.jsonl` 超过 1 MiB 时会改名为 `attempts.1.jsonl`（替换已有的上一份）并开始新文件，「查看调试日志」打开当前这份。

跨电脑排查时，先提供扩展版本、面板编号和该编号对应的日志行。日志记录区域、行数和退出原因，省略昵称、账号值和 OCR 原文。若需要图像佐证，请在保存 ID 前另存一份并遮挡无关窗口和账号信息。调试截图可能包含所选屏幕上其他应用的内容。
