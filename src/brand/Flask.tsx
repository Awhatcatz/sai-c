// 사이°C 핵심 심볼: C 글자 자체가 유리 플라스크이고, 안의 붉은 액체 높이가 온도(0~100)를 따른다.
// 앱 아이콘·파비콘·로딩 화면·개인 온도·학급 온도가 모두 이 컴포넌트(또는 같은 도형의 정적 SVG)를 쓴다.
// 액체 높이는 transform 전환으로 부드럽게 오르고, 표면은 두 겹의 물결이 서로 다른 속도로 흐른다.
import { useEffect, useId, useState } from "react";

// 도형(viewBox 단위). C 중심선 반지름 R, 관 굵기 W, 오른쪽이 ±OPEN 도만큼 열린 C.
const CX = 64, CY = 62, R = 40, W = 22, OPEN = 48;
const rad = (d: number) => (d * Math.PI) / 180;
const TOP = { x: CX + R * Math.cos(rad(OPEN)), y: CY - R * Math.sin(rad(OPEN)) };
const BOT = { x: TOP.x, y: CY + R * Math.sin(rad(OPEN)) };
export const C_PATH = `M ${TOP.x.toFixed(2)} ${TOP.y.toFixed(2)} A ${R} ${R} 0 1 0 ${BOT.x.toFixed(2)} ${BOT.y.toFixed(2)}`;
const FULL_Y = CY - R - W / 2;   // 가장 높은 수위(100°C)
const EMPTY_Y = CY + R + W / 2;  // 가장 낮은 수위(0°C)
// 위쪽 끝은 플라스크 입구: 관을 가로지르는 짧은 테두리
const radial = { x: Math.cos(rad(OPEN)), y: -Math.sin(rad(OPEN)) };
const LIP = W / 2 + 3.5;
const LIP_PATH = `M ${(TOP.x - radial.x * LIP).toFixed(2)} ${(TOP.y - radial.y * LIP).toFixed(2)} L ${(TOP.x + radial.x * LIP).toFixed(2)} ${(TOP.y + radial.y * LIP).toFixed(2)}`;
// 유리 반사: 바깥 벽 가까이의 짧은 호
const arcPoint = (r: number, deg: number) => `${(CX + r * Math.cos(rad(deg))).toFixed(2)} ${(CY - r * Math.sin(rad(deg))).toFixed(2)}`;
const SHINE = `M ${arcPoint(R + 6, 152)} A ${R + 6} ${R + 6} 0 0 1 ${arcPoint(R + 6, 112)}`;
const SHINE_2 = `M ${arcPoint(R + 6, 196)} A ${R + 6} ${R + 6} 0 0 0 ${arcPoint(R + 6, 168)}`;
const WAVE = (amp: number) => {
  let d = `M -40 0`;
  for (let x = -40; x < 200; x += 40) d += ` q 10 ${-amp} 20 0 t 20 0`;
  return `${d} V 140 H -40 Z`;
};

/** 관 모양 한 겹: 열린 위쪽 끝은 자르고, 막힌 아래쪽 끝은 둥글게. */
function Tube({ width, color }: { width: number; color: string }) {
  return (
    <>
      <path d={C_PATH} fill="none" stroke={color} strokeWidth={width} strokeLinecap="butt" />
      <circle cx={BOT.x} cy={BOT.y} r={width / 2} fill={color} />
    </>
  );
}

export type FlaskProps = {
  /** 0~100(°C) */
  value: number;
  /** 너비(px). 높이는 비율대로 */
  size?: number;
  /** 왼쪽 위의 ° 기호를 함께 그린다(로고·아이콘) */
  degree?: boolean;
  /** 처음 나타날 때 바닥에서부터 차오르게 */
  riseOnMount?: boolean;
  /** 화면 낭독기용 이름. 없으면 장식으로 숨긴다 */
  label?: string;
  className?: string;
};

export function Flask({ value, size = 120, degree = false, riseOnMount = true, label, className }: FlaskProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const target = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const [shown, setShown] = useState(riseOnMount ? 0 : target);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(raf);
  }, [target]);
  const level = EMPTY_Y - (shown / 100) * (EMPTY_Y - FULL_Y);
  const vb = degree ? "4 4 102 112" : "10 8 96 108";
  const [, , w, h] = vb.split(" ").map(Number);
  const amp = shown <= 0 || shown >= 100 ? 0.6 : 2.6;

  return (
    <svg
      viewBox={vb}
      width={size}
      height={(size * h) / w}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label ? `${label} ${Math.round(target)}°C` : undefined}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse">
          <Tube width={W - 4.5} color="#fff" />
        </mask>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f3ece4" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* 유리 테두리와 유리 속 */}
      <g opacity="0.2"><Tube width={W + 3} color="#302D2C" /></g>
      <Tube width={W} color={`url(#g${id})`} />

      {/* 액체 */}
      <g mask={`url(#m${id})`}>
        <g className="sai-level" style={{ transform: `translateY(${level}px)` }}>
          <g transform="translate(0 -1.6)"><path className="sai-wave-back" d={WAVE(amp * 0.8)} fill="#EF8C80" /></g>
          <path className="sai-wave" d={WAVE(amp)} fill="#E46557" />
        </g>
      </g>

      {/* 빛 반사 */}
      <path d={SHINE} fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" opacity="0.9" />
      <path d={SHINE_2} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      {/* 입구 테두리 */}
      <path d={LIP_PATH} stroke="#302D2C" strokeOpacity="0.32" strokeWidth="3" strokeLinecap="round" />

      {degree && <circle cx="15" cy="15" r="6.2" fill="none" stroke="#302D2C" strokeWidth="3.4" />}
    </svg>
  );
}
