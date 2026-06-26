// 금액을 천원 단위로 포맷 (84828953 → "84,829")
export function fmtKRW(value: number): string {
  return Math.round(value / 1000).toLocaleString("ko-KR");
}

// 퍼센트 포맷 (17.123 → "17.1%")
export function fmtPct(value: number, digits = 1): string {
  return value.toFixed(digits) + "%";
}

// 변화율 표시용
export function fmtDiff(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return sign + Math.round(value / 1000).toLocaleString("ko-KR");
}
