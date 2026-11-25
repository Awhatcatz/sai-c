// 온도 표시 부품: 학급 온도 카드, 목표 단계 막대, 7일 변화 그래프. 코랄은 온도에만 쓴다.
import { Flask } from "../brand/Flask";
import { n, shortDate, temp } from "../lib/format";

export type Milestone = { at: number; label: string; reached: boolean };

export function MilestoneBar({ value, milestones }: { value: number; milestones: Milestone[] }) {
  const next = milestones.find(m => !m.reached);
  return (
    <div>
      <div className="relative h-2.5 rounded-full bg-beige-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label="학급 공동 목표 진행">
        <div className="sai-level h-full rounded-full bg-coral" style={{ width: `${Math.min(100, value)}%` }} />
        {milestones.slice(0, -1).map(m => (
          <span key={m.at} aria-hidden className={`absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full ${m.reached ? "bg-paper" : "bg-line-strong"}`} style={{ left: `${m.at}%` }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-ink-3 num" aria-hidden>
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100°C</span>
      </div>
      <p className="mt-2 text-[14px] text-ink-2">
        {next ? <>다음 목표 <b className="font-semibold text-ink">{next.at}°C</b> · {next.label}</> : <>공동 목표를 달성했어요</>}
      </p>
    </div>
  );
}

export function ClassTempCard({ title, value, credits, target, participants, milestones, size = 150 }: {
  title: string; value: number; credits: number; target: number; participants: number; milestones: Milestone[]; size?: number;
}) {
  return (
    <section className="rounded-[28px] bg-paper p-5 shadow-[var(--shadow-float)] sm:p-7">
      <div className="flex items-center gap-4 sm:gap-7">
        <Flask value={value} size={size} label={title} className="h-auto w-[112px] shrink-0 sm:w-[150px]" />
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink-2">{title}</h2>
          <p className="text-[46px] font-bold leading-[1.1] text-coral-ink num sm:text-[56px]">{temp(value)}<span className="text-[0.55em]">°C</span></p>
          <p className="mt-1 text-[13px] text-ink-3 num">{target ? `${n(credits)} / ${n(target)} 크레딧 · ${participants}명 참여` : "시즌이 시작되면 온도가 올라가요"}</p>
        </div>
      </div>
      <div className="mt-5">
        <MilestoneBar value={value} milestones={milestones} />
      </div>
    </section>
  );
}

/** 지난 며칠의 학급 온도. 막대 + 마지막 값. 데이터가 하루뿐이면 막대 하나. */
export function TempHistory({ rows }: { rows: { day: string; temperature: number }[] }) {
  if (!rows.length) return <p className="py-6 text-center text-[14px] text-ink-3">아직 기록이 없어요. 하루가 지나면 변화가 보여요.</p>;
  const max = Math.max(25, ...rows.map(r => r.temperature));
  return (
    <figure>
      <div className="flex h-36 items-end gap-2" aria-hidden>
        {rows.map((r, i) => (
          <div key={r.day} className="flex h-full flex-1 flex-col justify-end">
            <span className="mb-1 text-center text-[11px] text-ink-3 num">{temp(r.temperature)}</span>
            <div className={`rounded-t-lg ${i === rows.length - 1 ? "bg-coral" : "bg-coral-light/45"}`} style={{ height: `${Math.max(3, (r.temperature / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2" aria-hidden>
        {rows.map(r => <span key={r.day} className="flex-1 text-center text-[11px] text-ink-3">{shortDate(r.day).replace("월 ", "/").replace("일", "")}</span>)}
      </div>
      <figcaption className="sr-only">
        {rows.map(r => `${shortDate(r.day)} ${temp(r.temperature)}도`).join(", ")}
      </figcaption>
    </figure>
  );
}
