// 학생 홈: 우리 반 온도 · 내 온도 · 오늘의 미션 · 알림. 승인 전이면 기다림 화면.
import { Bell, Clock } from "lucide-react";
import { Flask } from "../../brand/Flask";
import { Splash } from "../../brand/Logo";
import { ClassTempCard, type Milestone } from "../../components/temp";
import { ButtonLink, Notice, Planned, SectionTitle } from "../../components/ui";
import { ago, dday, n, temp } from "../../lib/format";
import { useLoad } from "../../lib/useLoad";

type Mission = { id: number; title: string; description: string; kind: "basic" | "special"; reward_credits: number; est_minutes: number; status: "active" | "submitted" | "revise" };
type Note = { id: number; kind: string; title: string; body: string; created_at: string; read_at: string | null };
type Home =
  | { state: "waiting"; memberships: { status: string; schoolName: string; label: string; requestedAt: string }[] }
  | {
      state: "ready";
      class: { id: number; schoolName: string; label: string; schoolYear: number; demo: boolean };
      season: { title: string; startsOn: string; endsOn: string; personalTarget: number } | null;
      classTemp: number; classCredits: number; classTarget: number; participants: number; milestones: Milestone[];
      myTemp: number; seasonCredits: number; totalCredits: number;
      mission: Mission | null; notifications: Note[];
    };

const MISSION_STATUS = {
  active: { label: "진행 중", cls: "bg-coral-soft text-coral-ink" },
  submitted: { label: "선생님 확인 중", cls: "bg-gold-soft text-gold-ink" },
  revise: { label: "다시 써 주세요", cls: "bg-danger-soft text-danger" },
} as const;

export default function StudentHome() {
  const { data, error, reload } = useLoad<Home>("/api/student/home");
  if (error) return <Notice tone="danger">{error} <button className="ml-1 font-semibold underline" onClick={() => void reload()}>다시 시도</button></Notice>;
  if (!data) return <Splash />;
  if (data.state === "waiting") return <Waiting memberships={data.memberships} />;

  const d = data;
  const left = d.season ? dday(d.season.endsOn) : null;

  return (
    <div className="sai-in grid gap-6 md:grid-cols-[1.25fr_1fr] md:items-start md:gap-8">
      <div className="grid gap-5">
        <div>
          <p className="text-[13px] text-ink-3">{d.class.schoolName}</p>
          <h1 className="text-[22px] font-bold">{d.class.label}</h1>
          {d.season ? (
            <p className="mt-0.5 text-[14px] text-ink-2">{d.season.title}{left !== null && left >= 0 && <span className="text-ink-3"> · {left === 0 ? "오늘 마감" : `${left}일 남음`}</span>}</p>
          ) : (
            <p className="mt-0.5 text-[14px] text-ink-3">아직 마니또 시즌이 시작되지 않았어요</p>
          )}
        </div>

        <ClassTempCard title="우리 반 온도" value={d.classTemp} credits={d.classCredits} target={d.classTarget} participants={d.participants} milestones={d.milestones} />

        <section className="flex items-center gap-4 rounded-3xl border border-line bg-paper p-5">
          <Flask value={d.myTemp} size={64} label="내 온도" className="h-auto w-14 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-semibold text-ink-2">내 온도</h2>
            <p className="text-[28px] font-bold leading-tight text-coral-ink num">{temp(d.myTemp)}°C</p>
          </div>
          <dl className="grid shrink-0 gap-1 text-right text-[13px]">
            <div><dt className="inline text-ink-3">이번 시즌 </dt><dd className="inline font-semibold num">{n(d.seasonCredits)}{d.season ? ` / ${n(d.season.personalTarget)}` : ""}</dd></div>
            <div><dt className="inline text-ink-3">누적 </dt><dd className="inline font-semibold num">{n(d.totalCredits)} 크레딧</dd></div>
          </dl>
        </section>
        <p className="-mt-2 px-1 text-[12px] leading-5 text-ink-3">크레딧은 친절을 기록하는 숫자예요. 돈이나 물건으로 바꿀 수 없어요.</p>
      </div>

      <div className="grid gap-6">
        <section>
          <SectionTitle aside={<ButtonLink to="/s/missions" variant="quiet" size="sm">전체 보기</ButtonLink>}>오늘의 마니또 미션</SectionTitle>
          {d.mission ? (
            <article className="rounded-3xl bg-paper p-5 shadow-[var(--shadow-float)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${MISSION_STATUS[d.mission.status].cls}`}>{MISSION_STATUS[d.mission.status].label}</span>
                {d.mission.kind === "special" && <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[12px] font-semibold text-gold-ink">특별 미션</span>}
              </div>
              <h3 className="mt-3 text-[19px] font-bold leading-snug">{d.mission.title}</h3>
              <p className="mt-1.5 text-[15px] leading-[1.7] text-ink-2">{d.mission.description}</p>
              <div className="mt-4 flex items-center gap-4 text-[13px] text-ink-3">
                <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden /> 약 {d.mission.est_minutes}분</span>
                <span className="font-semibold text-coral-ink num">+{d.mission.reward_credits} 크레딧</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-beige px-4 py-3">
                <span className="text-[14px] text-ink-2">{d.mission.status === "submitted" ? "선생님이 확인하면 크레딧이 들어와요" : "실천 기록 남기기"}</span>
                <Planned />
              </div>
            </article>
          ) : (
            <p className="rounded-3xl border border-dashed border-line-strong px-5 py-8 text-center text-[14px] text-ink-3">
              {d.season ? "새 미션을 준비하고 있어요" : "시즌이 시작되면 미션이 도착해요"}
            </p>
          )}
        </section>

        <section>
          <SectionTitle>알림</SectionTitle>
          {d.notifications.length ? (
            <ul className="divide-y divide-line rounded-3xl border border-line bg-paper">
              {d.notifications.map(x => (
                <li key={x.id} className="flex gap-3 px-4 py-3.5">
                  <Bell size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{x.title}</p>
                    <p className="text-[14px] text-ink-2">{x.body}</p>
                  </div>
                  <time className="shrink-0 text-[12px] text-ink-3" dateTime={x.created_at}>{ago(x.created_at)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-3">새 알림이 없어요</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Waiting({ memberships }: { memberships: { status: string; schoolName: string; label: string; requestedAt: string }[] }) {
  const pending = memberships.filter(m => m.status === "pending");
  return (
    <div className="sai-in mx-auto flex max-w-md flex-col items-center pt-6 text-center">
      <div className="sai-breathe"><Flask value={8} size={96} /></div>
      <h1 className="mt-5 text-[22px] font-bold">{pending.length ? "선생님 승인을 기다리고 있어요" : "아직 들어간 학급이 없어요"}</h1>
      <p className="mt-2 text-[15px] text-ink-2">{pending.length ? "선생님이 확인하면 알림과 함께 우리 반 화면이 열려요." : "담임 선생님께 학급 코드를 받아 가입 신청해 주세요."}</p>
      {memberships.length > 0 && (
        <ul className="mt-6 w-full divide-y divide-line rounded-3xl border border-line bg-paper text-left">
          {memberships.map(m => (
            <li key={m.label + m.requestedAt} className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-semibold">{m.schoolName}</p>
                <p className="text-[14px] text-ink-2">{m.label}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${m.status === "pending" ? "bg-gold-soft text-gold-ink" : "bg-beige text-ink-3"}`}>
                {m.status === "pending" ? `${ago(m.requestedAt)} 신청` : m.status === "rejected" ? "다시 확인 필요" : "나간 학급"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ButtonLink to="/s/me" variant="secondary" className="mt-6">다른 학급 코드 넣기</ButtonLink>
    </div>
  );
}
