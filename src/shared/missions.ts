// 사전에 검토한 기본 마니또 미션. AI 생성이 실패하거나 꺼져 있을 때 이 목록에서 고른다.
// 금지: 돈 쓰기, 선물 강요, 신체 접촉, 몰래 사진, 사생활 캐기, 위험한 행동.
export type PresetMission = { title: string; description: string; kind: "basic" | "special"; minutes: number };

export const PRESET_MISSIONS: PresetMission[] = [
  { title: "마니또 친구에게 먼저 인사하기", description: "아침에 눈이 마주치면 먼저 반갑게 인사해 보세요.", kind: "basic", minutes: 1 },
  { title: "친구의 장점을 하나 발견해 칭찬하기", description: "오늘 친구가 잘한 일이나 좋은 점을 찾아 짧게 말해 주세요.", kind: "basic", minutes: 3 },
  { title: "수업 준비를 자연스럽게 도와주기", description: "교과서나 준비물을 찾을 때 옆에서 함께 챙겨 주세요.", kind: "basic", minutes: 5 },
  { title: "모둠 활동에서 친구 의견 먼저 들어주기", description: "모둠 시간에 친구가 말할 차례를 챙기고 끝까지 들어 주세요.", kind: "basic", minutes: 10 },
  { title: "응원의 말 한마디 건네기", description: "발표나 시험 전에 「잘할 거야」 같은 말을 건네 보세요.", kind: "basic", minutes: 1 },
  { title: "친구 이야기를 집중해서 들어주기", description: "쉬는 시간에 친구 이야기를 휴대폰 없이 끝까지 들어 주세요.", kind: "basic", minutes: 5 },
  { title: "교실 정리정돈 함께하기", description: "청소 시간에 친구 자리 주변 정리를 같이 해 주세요.", kind: "basic", minutes: 10 },
  { title: "친구가 잘하는 것을 배워 보기", description: "친구가 잘하는 과목이나 놀이를 하나 알려 달라고 부탁해 보세요.", kind: "special", minutes: 15 },
];
