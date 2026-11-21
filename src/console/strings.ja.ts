import type { en } from './strings.ts';

export const S: typeof en = {
  primary: "メイン",
  outputNumber: (number: number) => "ディスプレイ出力 " + number,
  title: "Delta 観察",
  status: "稼働状況",
  source: "観察する画面",
  refresh: "状態を更新",
  start: "観察を開始",
  pause: "観察を一時停止",
  stop: "観察を停止",
  kind: "テストイベント",
  simulate: "合成テストで起動",
  testHint: "生成画像で起動をテストします。合成テストはゲームイベントを確認しません。",
  latestEvent: "最新のイベント",
  noEvents: "イベントはまだありません。",
  synthetic: "合成テスト",
  previewFull: "全体画像を表示",
  previewCrop: "部分画像を表示",
  fullAlt: "イベントの全体証拠画像",
  cropAlt: "イベントの部分証拠画像",
  loading: "状態を読み込み中…",
  notLoaded: "観察拡張が読み込まれていません。",
  inactive: "観察拡張が有効になっていません。",
  missing: "観察拡張を利用できません。",
  accepted: "合成テストイベントを受け付けました。",
  rejected: "合成テストイベントは受け付けられませんでした。",
  deliveryHint: "Coo がイベントに応じて返答するかを判断します。",
  kinds: {
    "kill": "キル",
    "knockdown": "ダウン",
    "loot": "赤レアアイテム"
  },
  combatKinds: {
    self: { kill: "自分のキル", knockdown: "自分のダウン" },
    teammate: { kill: "味方のキル", knockdown: "味方のダウン" },
    unknown: { kill: "実行者未確認のキル", knockdown: "実行者未確認のダウン" }
  },
  attributionLabels: { assisted: "アシスト通知", spectating: "観戦画面" },
  phases: {
    "unbound": "アプリに未接続",
    "stopped": "停止中",
    "starting": "起動中",
    "running": "観察中",
    "blocked": "観察できません",
    "error": "観察エラー"
  },
  reasons: {
    "unbound": "観察拡張がアプリに接続されていません。",
    "stopped": "観察は停止しています。",
    "paused": "手動で一時停止しました。",
    "view-disabled": "画面の閲覧はオフです。",
    "observation-disabled": "ゲーム観察はオフです。",
    "view-permission": "現在の閲覧権限では継続的に撮影できません。",
    "core-paused": "Core は一時停止しています。",
    "no-output": "デスクトップペットの吹き出しを利用できません。",
    "no-image-model": "現在のモデルは画像を受け付けません。",
    "source-unavailable": "観察する画面を利用できません。",
    "worker-failed": "観察プロセスを実行できません。",
    "heartbeat-timeout": "観察プロセスから時間内に応答がありませんでした。"
  },
  dropReasons: {
    "expired": "イベントの期限が切れました。",
    "duplicate": "重複イベントを無視しました。",
    "overflow": "保留イベントの上限を超えました。",
    "policy-changed": "閲覧設定が変わりました。",
    "worker-failed": "観察プロセスでエラーが発生しました。",
    "source-changed": "観察する画面が変わりました。"
  },
  eventStates: {
    "queued": "配信待ち",
    "delivered": "会話に追加済み",
    "dropped": "未配信"
  },
  stateFailed: (why: string) => "状態を読み込めません：" + why,
  previewFailed: (why: string) => "証拠画像を表示できません：" + why,
  captures: (number: number) => "撮影済み：" + number + " フレーム",
  capturedAt: (time: string) => "撮影日時：" + time,
};
