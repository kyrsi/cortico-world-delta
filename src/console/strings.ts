import type { Language } from 'cortico/core/language.ts';
import { companionText, type CompanionText } from './strings-companion.ts';
import { S as zhHant } from './strings.zh-Hant.ts';
import { S as ja } from './strings.ja.ts';
import { S as ko } from './strings.ko.ts';
import { S as fr } from './strings.fr.ts';
import { S as de } from './strings.de.ts';
import { S as es419 } from './strings.es-419.ts';
import { S as ptBR } from './strings.pt-BR.ts';
import { S as it } from './strings.it.ts';
import { S as ru } from './strings.ru.ts';

const zh = {
  title: "三角洲观察",
  primary: "主屏",
  outputNumber: (number: number) => "显示输出 " + number,
  status: "运行状态",
  source: "观察屏幕",
  refresh: "刷新状态",
  start: "开始观察",
  pause: "暂停观察",
  stop: "停止观察",
  kind: "测试事件",
  simulate: "合成测试唤醒",
  testHint: "使用合成图测试唤醒；合成测试不确认游戏事件。",
  latestEvent: "最近事件",
  noEvents: "暂无事件。",
  synthetic: "合成测试",
  previewFull: "查看全图",
  previewCrop: "查看局部图",
  fullAlt: "事件全图证据",
  cropAlt: "事件局部证据",
  loading: "正在读取状态…",
  notLoaded: "观察扩展尚未加载。",
  inactive: "观察扩展尚未启用。",
  missing: "观察扩展不可用。",
  accepted: "合成测试事件已接收。",
  rejected: "合成测试事件未接收。",
  deliveryHint: "Coo 根据事件决定是否回应。",
  kinds: {
    "kill": "击杀",
    "knockdown": "击倒",
    "loot": "出红"
  },
  combatKinds: {
    self: { kill: "本人击杀", knockdown: "本人击倒" },
    teammate: { kill: "队友击杀", knockdown: "队友击倒" },
    unknown: { kill: "归属未确认的击杀", knockdown: "归属未确认的击倒" }
  },
  attributionLabels: { assisted: "协助提示", spectating: "观战画面" },
  phases: {
    "unbound": "宿主未接入游戏观察",
    "stopped": "已停止",
    "starting": "正在启动",
    "running": "正在观察",
    "blocked": "观察受阻",
    "error": "观察出错"
  },
  reasons: {
    "unbound": "当前宿主未提供游戏观察接入，无法开始观察或校准。需要适配插件或使用已接入的宿主版本。",
    "stopped": "观察已停止。",
    "paused": "已手动暂停。",
    "view-disabled": "电脑查看已关闭。",
    "observation-disabled": "游戏观察已关闭。",
    "view-permission": "当前查看权限不允许持续采集。",
    "core-paused": "Core 已暂停。",
    "no-output": "桌宠气泡当前不可用。",
    "no-image-model": "当前模型不接收图片。",
    "source-unavailable": "观察屏幕不可用。",
    "worker-failed": "观察进程无法运行。",
    "heartbeat-timeout": "观察进程未按时回应。"
  },
  dropReasons: {
    "expired": "事件已过期。",
    "duplicate": "重复事件已忽略。",
    "overflow": "待处理事件超过上限。",
    "policy-changed": "查看配置已变化。",
    "worker-failed": "观察进程异常。",
    "source-changed": "观察屏幕已变化。"
  },
  eventStates: {
    "queued": "等待投递",
    "delivered": "已进入对话",
    "dropped": "未投递"
  },
  stateFailed: (why: string) => "无法读取状态：" + why,
  previewFailed: (why: string) => "证据图预览失败：" + why,
  captures: (number: number) => "已采集 " + number + " 帧",
  capturedAt: (time: string) => "采集于 " + time,
};

export const en: typeof zh = {
  title: "Delta observation",
  primary: "Primary",
  outputNumber: (number: number) => "Display output " + number,
  status: "Status",
  source: "Observation display",
  refresh: "Refresh status",
  start: "Start observation",
  pause: "Pause observation",
  stop: "Stop observation",
  kind: "Test event",
  simulate: "Synthetic test wakeup",
  testHint: "Uses generated images to test wakeups. Synthetic tests do not confirm game events.",
  latestEvent: "Latest event",
  noEvents: "No events yet.",
  synthetic: "Synthetic test",
  previewFull: "View full image",
  previewCrop: "View crop",
  fullAlt: "Full event evidence",
  cropAlt: "Cropped event evidence",
  loading: "Reading status…",
  notLoaded: "The observation extension is not loaded.",
  inactive: "The observation extension is not enabled.",
  missing: "The observation extension is unavailable.",
  accepted: "The synthetic test event was accepted.",
  rejected: "The synthetic test event was not accepted.",
  deliveryHint: "Coo decides whether to respond to the event.",
  kinds: {
    "kill": "Kill",
    "knockdown": "Knockdown",
    "loot": "Red-tier loot"
  },
  combatKinds: {
    self: { kill: "Your kill", knockdown: "Your knockdown" },
    teammate: { kill: "Teammate kill", knockdown: "Teammate knockdown" },
    unknown: { kill: "Kill (attribution unconfirmed)", knockdown: "Knockdown (attribution unconfirmed)" }
  },
  attributionLabels: { assisted: "Assist notification", spectating: "Spectator view" },
  phases: {
    "unbound": "Game observation integration unavailable",
    "stopped": "Stopped",
    "starting": "Starting",
    "running": "Observing",
    "blocked": "Observation blocked",
    "error": "Observation error"
  },
  reasons: {
    "unbound": "This host has not connected game observation. Observation and calibration are unavailable. Adapt the extension or use a host with this integration.",
    "stopped": "Observation is stopped.",
    "paused": "Observation was paused manually.",
    "view-disabled": "Screen viewing is off.",
    "observation-disabled": "Game observation is off.",
    "view-permission": "The current viewing permission does not allow continuous capture.",
    "core-paused": "Core is paused.",
    "no-output": "Pet speech bubbles are unavailable.",
    "no-image-model": "The current model does not accept images.",
    "source-unavailable": "The observation display is unavailable.",
    "worker-failed": "The observation process cannot run.",
    "heartbeat-timeout": "The observation process did not respond in time."
  },
  dropReasons: {
    "expired": "The event expired.",
    "duplicate": "The duplicate event was ignored.",
    "overflow": "The pending event limit was exceeded.",
    "policy-changed": "Viewing settings changed.",
    "worker-failed": "The observation process failed.",
    "source-changed": "The observation display changed."
  },
  eventStates: {
    "queued": "Waiting for delivery",
    "delivered": "Entered the conversation",
    "dropped": "Not delivered"
  },
  stateFailed: (why: string) => "Could not read status: " + why,
  previewFailed: (why: string) => "Evidence preview failed: " + why,
  captures: (number: number) => "Captured " + number + " frames",
  capturedAt: (time: string) => "Captured at " + time,
};

export type ObserverText = typeof en;
const TEXT: Record<Language, ObserverText> = { zh, en, 'zh-Hant': zhHant, ja, ko, fr, de, 'es-419': es419, 'pt-BR': ptBR, it, ru };
export function observerText(language: Language): ObserverText & { dropReasons: CompanionText['dropReasons'] } {
  return { ...TEXT[language], dropReasons: { ...TEXT[language].dropReasons, ...companionText(language).dropReasons } };
}
