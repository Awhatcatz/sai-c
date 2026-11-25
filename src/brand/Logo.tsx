// 워드마크: 차콜 「사이」 + ° + C자 플라스크. value 를 주면 로고 속 액체도 그 온도만큼 찬다.
import { Link } from "react-router";
import { Flask } from "./Flask";

const SIZES = { sm: { text: "text-[20px]", flask: 21 }, md: { text: "text-[26px]", flask: 27 }, lg: { text: "text-[44px]", flask: 46 } } as const;

export function Logo({ size = "md", value = 62, to }: { size?: keyof typeof SIZES; value?: number; to?: string }) {
  const s = SIZES[size];
  const mark = (
    <span className={`inline-flex items-end gap-[0.04em] font-bold leading-none tracking-[-0.04em] text-ink ${s.text}`}>
      <span>사이</span>
      <Flask value={value} size={s.flask} degree riseOnMount={false} className="mb-[-0.06em]" />
      <span className="sr-only">°C</span>
    </span>
  );
  return to ? (
    <Link to={to} aria-label="사이°C 처음 화면" className="inline-flex rounded-lg">
      {mark}
    </Link>
  ) : (
    mark
  );
}

/** 로딩 화면: 플라스크가 천천히 찼다가 비기를 반복한다. */
export function Splash({ message = "불러오는 중이에요" }: { message?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="sai-breathe">
          <Flask value={55} size={64} degree />
        </div>
        <p className="text-sm text-ink-3">{message}</p>
      </div>
    </div>
  );
}
