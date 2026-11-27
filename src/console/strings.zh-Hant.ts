import type { en } from './strings.ts';

export const S: typeof en = {
  primary: "主螢幕",
  outputNumber: (number: number) => "顯示輸出 " + number,
  title: "三角洲觀察",
  status: "執行狀態",
  source: "觀察螢幕",
  refresh: "重新整理狀態",
  start: "開始觀察",
  pause: "暫停觀察",
  stop: "停止觀察",
  kind: "測試事件",
  simulate: "合成測試喚醒",
  testHint: "使用合成圖測試喚醒；合成測試不確認遊戲事件。",
  latestEvent: "最近事件",
  noEvents: "暫無事件。",
  synthetic: "合成測試",
  previewFull: "查看全圖",
  previewCrop: "查看局部圖",
  fullAlt: "事件全圖證據",
  cropAlt: "事件局部證據",
  loading: "正在讀取狀態…",
  notLoaded: "觀察擴充功能尚未載入。",
  inactive: "觀察擴充功能尚未啟用。",
  missing: "觀察擴充功能無法使用。",
  accepted: "合成測試事件已接收。",
  rejected: "合成測試事件未接收。",
  deliveryHint: "Coo 根據事件決定是否回應。",
  kinds: {
    "kill": "擊殺",
    "knockdown": "擊倒",
    "loot": "出紅"
  },
  combatKinds: {
    self: { kill: "本人擊殺", knockdown: "本人擊倒" },
    teammate: { kill: "隊友擊殺", knockdown: "隊友擊倒" },
    unknown: { kill: "歸屬未確認的擊殺", knockdown: "歸屬未確認的擊倒" }
  },
  attributionLabels: { assisted: "協助提示", spectating: "觀戰畫面" },
  phases: {
    "unbound": "宿主未接入遊戲觀察",
    "stopped": "已停止",
    "starting": "正在啟動",
    "running": "正在觀察",
    "blocked": "觀察受阻",
    "error": "觀察出錯"
  },
  reasons: {
    "unbound": "目前宿主未提供遊戲觀察接入，無法開始觀察或校準。需要適配擴充功能或使用已接入的宿主版本。",
    "stopped": "觀察已停止。",
    "paused": "已手動暫停。",
    "view-disabled": "電腦查看已關閉。",
    "observation-disabled": "遊戲觀察已關閉。",
    "view-permission": "目前查看權限不允許持續擷取。",
    "core-paused": "Core 已暫停。",
    "no-output": "桌寵氣泡目前無法使用。",
    "no-image-model": "目前模型不接收圖片。",
    "source-unavailable": "觀察螢幕無法使用。",
    "worker-failed": "觀察處理程序無法執行。",
    "heartbeat-timeout": "觀察處理程序未及時回應。"
  },
  dropReasons: {
    "expired": "事件已過期。",
    "duplicate": "重複事件已忽略。",
    "overflow": "待處理事件超過上限。",
    "policy-changed": "查看設定已變更。",
    "worker-failed": "觀察處理程序異常。",
    "source-changed": "觀察螢幕已變更。"
  },
  eventStates: {
    "queued": "等待投遞",
    "delivered": "已進入對話",
    "dropped": "未投遞"
  },
  stateFailed: (why: string) => "無法讀取狀態：" + why,
  previewFailed: (why: string) => "證據圖預覽失敗：" + why,
  captures: (number: number) => "已擷取 " + number + " 幀",
  capturedAt: (time: string) => "擷取於 " + time,
};
