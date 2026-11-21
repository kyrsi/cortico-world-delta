import type { en } from './strings.ts';

export const S: typeof en = {
  primary: "기본 화면",
  outputNumber: (number: number) => "디스플레이 출력 " + number,
  title: "Delta 관찰",
  status: "실행 상태",
  source: "관찰할 화면",
  refresh: "상태 새로 고침",
  start: "관찰 시작",
  pause: "관찰 일시 중지",
  stop: "관찰 중지",
  kind: "테스트 이벤트",
  simulate: "합성 테스트 깨우기",
  testHint: "생성된 이미지로 깨우기를 테스트합니다. 합성 테스트는 게임 이벤트를 확인하지 않습니다.",
  latestEvent: "최근 이벤트",
  noEvents: "아직 이벤트가 없습니다.",
  synthetic: "합성 테스트",
  previewFull: "전체 이미지 보기",
  previewCrop: "부분 이미지 보기",
  fullAlt: "이벤트 전체 증거 이미지",
  cropAlt: "이벤트 부분 증거 이미지",
  loading: "상태를 읽는 중…",
  notLoaded: "관찰 확장이 로드되지 않았습니다.",
  inactive: "관찰 확장이 활성화되지 않았습니다.",
  missing: "관찰 확장을 사용할 수 없습니다.",
  accepted: "합성 테스트 이벤트가 접수되었습니다.",
  rejected: "합성 테스트 이벤트가 접수되지 않았습니다.",
  deliveryHint: "Coo가 이벤트에 응답할지 판단합니다.",
  kinds: {
    "kill": "처치",
    "knockdown": "다운",
    "loot": "붉은 등급 아이템"
  },
  combatKinds: {
    self: { kill: "내 처치", knockdown: "내 다운" },
    teammate: { kill: "팀원의 처치", knockdown: "팀원의 다운" },
    unknown: { kill: "처치 (귀속 미확인)", knockdown: "다운 (귀속 미확인)" }
  },
  attributionLabels: { assisted: "지원 알림", spectating: "관전 화면" },
  phases: {
    "unbound": "앱에 연결되지 않음",
    "stopped": "중지됨",
    "starting": "시작 중",
    "running": "관찰 중",
    "blocked": "관찰 차단됨",
    "error": "관찰 오류"
  },
  reasons: {
    "unbound": "관찰 확장이 앱에 연결되지 않았습니다.",
    "stopped": "관찰이 중지되었습니다.",
    "paused": "수동으로 일시 중지되었습니다.",
    "view-disabled": "화면 보기가 꺼져 있습니다.",
    "observation-disabled": "게임 관찰이 꺼져 있습니다.",
    "view-permission": "현재 보기 권한으로는 계속 캡처할 수 없습니다.",
    "core-paused": "Core가 일시 중지되었습니다.",
    "no-output": "데스크톱 펫의 말풍선을 사용할 수 없습니다.",
    "no-image-model": "현재 모델이 이미지를 지원하지 않습니다.",
    "source-unavailable": "관찰할 화면을 사용할 수 없습니다.",
    "worker-failed": "관찰 프로세스를 실행할 수 없습니다.",
    "heartbeat-timeout": "관찰 프로세스가 제때 응답하지 않았습니다."
  },
  dropReasons: {
    "expired": "이벤트가 만료되었습니다.",
    "duplicate": "중복 이벤트를 무시했습니다.",
    "overflow": "대기 이벤트 한도를 초과했습니다.",
    "policy-changed": "보기 설정이 변경되었습니다.",
    "worker-failed": "관찰 프로세스에 오류가 발생했습니다.",
    "source-changed": "관찰할 화면이 변경되었습니다."
  },
  eventStates: {
    "queued": "전달 대기 중",
    "delivered": "대화에 추가됨",
    "dropped": "전달되지 않음"
  },
  stateFailed: (why: string) => "상태를 읽을 수 없습니다: " + why,
  previewFailed: (why: string) => "증거 이미지 미리 보기 실패: " + why,
  captures: (number: number) => "캡처: " + number + "프레임",
  capturedAt: (time: string) => "캡처 시간: " + time,
};
