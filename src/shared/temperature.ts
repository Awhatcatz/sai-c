// 온도 계산식. 서버(worker)와 화면이 같은 함수를 쓴다. 크레딧 원본은 credit_transactions.

/** 개인 온도 = 개인 시즌 획득 크레딧 / 개인 목표 크레딧 × 100, 0~100°C. */
export function personalTemperature(seasonCredits: number, personalTarget: number) {
  if (!personalTarget || personalTarget <= 0) return 0;
  return clampTemp((seasonCredits / personalTarget) * 100);
}

/** 학급 목표 크레딧 = 시즌 참여 학생 수 × 개인 목표 크레딧 (시즌 시작 때 확정). */
export function classTargetCredits(participants: number, personalTarget: number) {
  return Math.max(0, Math.floor(participants)) * Math.max(0, Math.floor(personalTarget));
}

/** 학급 온도 = 학급 전체 시즌 획득 크레딧 / 학급 목표 크레딧 × 100, 최대 100°C. */
export function classTemperature(totalCredits: number, classTarget: number) {
  if (!classTarget || classTarget <= 0) return 0;
  return clampTemp((totalCredits / classTarget) * 100);
}

export const clampTemp = (t: number) => Math.round(Math.min(100, Math.max(0, t)) * 10) / 10;

/** 학급 온도 단계: 이 온도에 닿으면 공동 목표 효과가 열린다. */
export const CLASS_MILESTONES = [
  { at: 25, label: "첫 학급 성장 배지" },
  { at: 50, label: "특별 공동 미션 해금" },
  { at: 75, label: "학급 활동 보상 투표" },
  { at: 100, label: "공동 목표 달성" },
] as const;

/** 미션 기본 보상(크레딧). 담임 지정 보상은 시즌 설정값을 따른다. */
export const REWARD = { basic: 10, special: 20 } as const;
