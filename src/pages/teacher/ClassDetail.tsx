// 학급 화면(담임): 학급 온도 대시보드 · 가입 코드 · 가입 승인 · 학생 명단.
import { ArrowLeft, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Splash } from "../../brand/Logo";
import { ClassTempCard, TempHistory, type Milestone } from "../../components/temp";
import { Button, Notice, Planned, SectionTitle } from "../../components/ui";
import { post } from "../../lib/api";
import { ago, dateKo, dday, shortDate } from "../../lib/format";
import { useLoad } from "../../lib/useLoad";

type Member = { id: number; student_no: number; status: "pending" | "approved"; requested_at: string; name: string; login_id: string | null };
type Detail = { class: { id: number; label: string; school_name: string; school_year: number }; invite: { code: string; created_at: string; expires_at: string } | null; members: Member[] };
type Dash = {
  counts: { students: number; pending_members: number; missions_done: number; pending_submissions: number };
  season: { id: number; title: string; startsOn: string; endsOn: string; personalTarget: number } | null;
  temperature: number; credits: number; target: number; participants: number; milestones: Milestone[];
  history: { day: string; temperature: number; credits: number }[];
};

export default function ClassDetail() {
  const id = Number(useParams().id);
  const detail = useLoad<Detail>(`/api/teacher/classes/${id}`);
  const dash = useLoad<Dash>(`/api/teacher/classes/${id}/dashboard`);
  const reloadAll = async () => { await Promise.all([detail.reload(), dash.reload()]); };

  if (detail.error) return <Notice tone="danger">{detail.error} <Link to="/t" className="ml-1 font-semibold underline">내 학급으로</Link></Notice>;
  if (!detail.data || !dash.data) return <Splash />;
  const { class: cls, invite, members } = detail.data;
  const d = dash.data;
  const pending = members.filter(m => m.status === "pending");
  const approved = members.filter(m => m.status === "approved");

  return (
    <div className="sai-in grid gap-8">
      <div>
        <Link to="/t" className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 text-[14px] text-ink-3 hover:text-ink"><ArrowLeft size={16} aria-hidden /> 내 학급</Link>
        <p className="mt-2 text-[13px] text-ink-3">{cls.school_name}</p>
        <h1 className="text-[24px] font-bold">{cls.school_year}학년도 {cls.label}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="grid gap-6">
          <ClassTempCard title="우리 반 온도" value={d.temperature} credits={d.credits} target={d.target} participants={d.participants} milestones={d.milestones} />
          <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-line bg-paper sm:grid-cols-4 [&>div]:border-line [&>div]:p-4 [&>div:nth-child(odd)]:border-r sm:[&>div]:border-r sm:[&>div:last-child]:border-r-0 [&>div:nth-child(-n+2)]:border-b sm:[&>div:nth-child(-n+2)]:border-b-0">
            <Count label="참여 학생" value={d.counts.students} unit="명" />
            <Count label="가입 대기" value={d.counts.pending_members} unit="명" warn={d.counts.pending_members > 0} />
            <Count label="승인한 미션" value={d.counts.missions_done} unit="개" />
            <Count label="확인 대기 미션" value={d.counts.pending_submissions} unit="개" warn={d.counts.pending_submissions > 0} />
          </dl>
          <section className="rounded-3xl border border-line bg-paper p-5">
            <SectionTitle aside={<span className="text-[13px] text-ink-3">하루 한 번 기록</span>}>최근 학급 온도</SectionTitle>
            <TempHistory rows={d.history} />
          </section>
        </div>

        <div className="grid gap-6">
          <Season season={d.season} pendingSubmissions={d.counts.pending_submissions} />
          <InviteCard classId={cls.id} invite={invite} onChange={reloadAll} />
        </div>
      </div>

      <Members classId={cls.id} pending={pending} approved={approved} onChange={reloadAll} />
    </div>
  );
}

function Count({ label, value, unit, warn }: { label: string; value: number; unit: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className={`mt-1 text-[24px] font-bold leading-none num ${warn ? "text-gold-ink" : ""}`}>{value}<span className="ml-0.5 text-[14px] font-semibold text-ink-2">{unit}</span></dd>
    </div>
  );
}

function Season({ season, pendingSubmissions }: { season: Dash["season"]; pendingSubmissions: number }) {
  return (
    <section className="rounded-3xl border border-line bg-paper p-5">
      <SectionTitle aside={<Planned />}>마니또 시즌</SectionTitle>
      {season ? (
        <>
          <p className="text-[17px] font-bold">{season.title}</p>
          <p className="text-[14px] text-ink-2">{shortDate(season.startsOn)} ~ {shortDate(season.endsOn)} · {dday(season.endsOn) >= 0 ? `${dday(season.endsOn)}일 남음` : "끝남"} · 1인 목표 {season.personalTarget}크레딧</p>
        </>
      ) : (
        <p className="text-[14px] text-ink-2">아직 시즌이 없어요.</p>
      )}
      <ul className="mt-4 grid gap-2 text-[14px] text-ink-2">
        <li className="flex justify-between gap-3"><span>시즌 열기 · 마니또 짝 배정</span><span className="text-ink-3">다음 단계</span></li>
        <li className="flex justify-between gap-3"><span>미션 확인·승인{pendingSubmissions > 0 && ` (${pendingSubmissions}개 대기)`}</span><span className="text-ink-3">다음 단계</span></li>
      </ul>
    </section>
  );
}

function InviteCard({ classId, invite, onChange }: { classId: number; invite: Detail["invite"]; onChange: () => Promise<void> }) {
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const run = async (kind: string, path: string, data: unknown = {}) => {
    setBusy(kind);
    setError("");
    try { await post(path, data); await onChange(); } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  };
  const copy = async (what: "code" | "link") => {
    if (!invite) return;
    const text = what === "code" ? invite.code : `${location.origin}/join?code=${invite.code}`;
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1600); } catch { setError("복사하지 못했어요. 코드를 직접 알려 주세요"); }
  };

  return (
    <section className="rounded-3xl bg-ink p-5 text-white">
      <h2 className="text-[17px] font-bold">학급 가입 코드</h2>
      {invite ? (
        <>
          <p className="mt-3 text-center text-[40px] font-bold tracking-[0.25em] num" aria-label={`가입 코드 ${invite.code.split("").join(" ")}`}>{invite.code}</p>
          <p className="text-center text-[13px] text-white/70">{dateKo(invite.expires_at)}까지</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void copy("code")} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/12 text-[14px] font-semibold hover:bg-white/20">
              {copied === "code" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied === "code" ? "복사했어요" : "코드 복사"}
            </button>
            <button type="button" onClick={() => void copy("link")} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-white/12 text-[14px] font-semibold hover:bg-white/20">
              {copied === "link" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{copied === "link" ? "복사했어요" : "가입 링크 복사"}
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[14px] text-white/75">지금은 쓸 수 있는 코드가 없어요. 새로 발급하면 학생이 가입 신청을 할 수 있어요.</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-4">
        <label className="flex items-center gap-2 text-[13px] text-white/80">
          기간
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="h-9 rounded-xl bg-white/12 px-2 text-[14px] text-white [&>option]:text-ink">
            <option value={1}>1일</option><option value={7}>7일</option><option value={14}>14일</option><option value={30}>30일</option>
          </select>
        </label>
        <button type="button" disabled={!!busy} onClick={() => void run("re", `/api/teacher/classes/${classId}/invite`, { days })} className="h-9 rounded-xl bg-white px-3 text-[14px] font-semibold text-ink hover:bg-beige disabled:opacity-60">
          {busy === "re" ? "발급 중…" : invite ? "새 코드 발급" : "코드 발급"}
        </button>
        {invite && (
          <button type="button" disabled={!!busy} onClick={() => void run("ex", `/api/teacher/classes/${classId}/invite/expire`)} className="ml-auto h-9 rounded-xl px-3 text-[13px] font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60">
            지금 막기
          </button>
        )}
      </div>
      <p className="mt-2 text-[12px] text-white/60">새 코드를 받으면 이전 코드는 바로 막혀요.</p>
      {error && <p role="alert" className="mt-2 text-[13px] text-coral-light">{error}</p>}
    </section>
  );
}

function Members({ classId, pending, approved, onChange }: { classId: number; pending: Member[]; approved: Member[]; onChange: () => Promise<void> }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);
  const [error, setError] = useState("");
  const decide = async (action: "approve" | "reject" | "remove", ids: number[]) => {
    setBusy(action + ids.join());
    setError("");
    try {
      await post(`/api/teacher/classes/${classId}/members/decide`, { action, ids });
      setPicked(new Set());
      setConfirmRemove(null);
      await onChange();
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  };
  const toggle = (id: number) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = pending.length > 0 && pending.every(m => picked.has(m.id));

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      <section>
        <SectionTitle aside={pending.length > 1 && (
          <label className="flex items-center gap-2 text-[14px] text-ink-2">
            <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(pending.map(m => m.id)))} className="h-4 w-4 accent-ink" />
            모두 선택
          </label>
        )}>가입 신청 {pending.length > 0 && <span className="text-gold-ink num">{pending.length}</span>}</SectionTitle>
        {pending.length ? (
          <>
            <ul className="divide-y divide-line rounded-3xl border border-line bg-paper">
              {pending.map(m => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} aria-label={`${m.name} 선택`} className="h-5 w-5 shrink-0 accent-ink" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold"><span className="mr-1.5 text-ink-3 num">{m.student_no}번</span>{m.name}</p>
                    <p className="text-[13px] text-ink-3">{m.login_id ?? "체험 학생"} · {ago(m.requested_at)} 신청</p>
                  </div>
                  <Button size="sm" variant="quiet" disabled={!!busy} onClick={() => void decide("reject", [m.id])}>거절</Button>
                  <Button size="sm" disabled={!!busy} onClick={() => void decide("approve", [m.id])}>승인</Button>
                </li>
              ))}
            </ul>
            {picked.size > 0 && (
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" disabled={!!busy} onClick={() => void decide("reject", [...picked])} className="flex-1">선택 {picked.size}명 거절</Button>
                <Button disabled={!!busy} onClick={() => void decide("approve", [...picked])} className="flex-1">선택 {picked.size}명 승인</Button>
              </div>
            )}
            <p className="mt-2 px-1 text-[13px] text-ink-3">이름과 출석번호가 명부와 같은지 확인한 뒤 승인해 주세요.</p>
          </>
        ) : (
          <p className="text-[14px] text-ink-3">새 가입 신청이 없어요</p>
        )}
      </section>

      <section>
        <SectionTitle aside={<span className="text-[14px] text-ink-3 num">{approved.length}명</span>}>우리 반 학생</SectionTitle>
        {approved.length ? (
          <ul className="divide-y divide-line rounded-3xl border border-line bg-paper">
            {approved.map(m => (
              <li key={m.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                <span className="w-9 shrink-0 text-ink-3 num">{m.student_no}번</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{m.name}</span>
                {confirmRemove === m.id ? (
                  <>
                    <Button size="sm" variant="quiet" onClick={() => setConfirmRemove(null)}>취소</Button>
                    <Button size="sm" variant="danger" disabled={!!busy} onClick={() => void decide("remove", [m.id])}>내보내기</Button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmRemove(m.id)} className="rounded-lg px-2 py-1 text-[13px] text-ink-3 hover:bg-beige hover:text-ink">내보내기</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-3">아직 승인한 학생이 없어요. 가입 코드를 학생들에게 알려 주세요.</p>
        )}
      </section>
      {error && <Notice tone="danger" className="lg:col-span-2">{error}</Notice>}
    </div>
  );
}
