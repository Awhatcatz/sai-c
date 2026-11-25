// 한국어 표기 한 곳: 2026년 11월 21일 (토), 11월 21일, 3시간 전, 1,000.
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const asDate = (v: string | Date) => (v instanceof Date ? v : /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v));

export const n = (v: number) => Math.round(v).toLocaleString("ko-KR");
export const temp = (v: number) => (Math.round(v * 10) / 10).toLocaleString("ko-KR", { maximumFractionDigits: 1 });

export function dateKo(v: string | Date) {
  const d = asDate(v);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function shortDate(v: string | Date) {
  const d = asDate(v);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function ago(v: string) {
  const diff = (Date.now() - new Date(v).getTime()) / 1000;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 2) return "어제";
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return shortDate(v);
}

/** 오늘부터 그 날짜까지 남은 날(D-day). 지난 날이면 음수. */
export function dday(ymd: string) {
  const end = asDate(ymd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 864e5);
}

export const LEVEL = { elementary: "초등학교", middle: "중학교", high: "고등학교" } as Record<string, string>;
