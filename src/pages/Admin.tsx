// 서비스 관리자(운영자) 화면: 교사 인증 · 학급 현황 · 운영 기록. 비밀번호(ADMIN_TOKEN)는 이 탭에만 남는다.
// 화해 신호 내용은 여기서도 볼 수 없다(서버에 그런 경로가 없다).
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Logo } from "../brand/Logo";
import { Button, Field, Notice, SectionTitle } from "../components/ui";
import { ApiError } from "../lib/api";
import { ago } from "../lib/format";
import { clearOwnerToken, ownerApi, ownerToken, setOwnerToken } from "../owner/ownerApi";

type Overview = { schools: number; classes: number; teachers: number; pending_teachers: number; students: number; live_demos: number };
type Teacher = { id: number; name: string; email: string; teacher_status: "pending" | "verified" | "rejected"; created_at: string; school_name: string | null; classes: number };
type ClassRow = { id: number; school_year: number; grade: number; class_no: number; school_name: string; teacher_name: string; created_at: string; students: number };
type Log = { id: number; actor_role: string; action: string; target_type: string | null; target_id: string | null; created_at: string };

const ACTION: Record<string, string> = {
  "teacher.signup": "교사 가입", "teacher.verified": "교사 인증 승인", "teacher.rejected": "교사 인증 반려", "class.create": "학급 개설",
  "class.join_request": "학급 가입 신청", "member.approve": "가입 승인", "member.reject": "가입 거절", "member.remove": "학생 내보내기",
  "invite.reissue": "코드 재발급", "invite.expire": "코드 막기", "user.withdraw": "회원 탈퇴",
};
const STATUS = { pending: ["확인 대기", "bg-gold-soft text-gold-ink"], verified: ["인증 완료", "bg-ok-soft text-ok"], rejected: ["반려", "bg-danger-soft text-danger"] } as const;

export default function Admin() {
  const [state, setState] = useState<"checking" | "ask" | "in">(ownerToken() ? "checking" : "ask");
  const [error, setError] = useState("");

  const tryToken = useCallback(async () => {
    setState("checking");
    try {
      await ownerApi("/api/admin/overview");
      setState("in");
    } catch (e) {
      clearOwnerToken();
      setError(e instanceof ApiError && e.status === 404 ? "비밀번호가 맞지 않거나 아직 관리자 비밀번호가 설정되지 않았어요" : (e as Error).message);
      setState("ask");
    }
  }, []);
  useEffect(() => { if (ownerToken()) void tryToken(); }, [tryToken]);

  if (state === "in") return <Console onLeave={() => { clearOwnerToken(); setState("ask"); setError(""); }} />;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("token") ?? "");
    if (!v) return setError("비밀번호를 적어 주세요");
    setOwnerToken(v);
    void tryToken();
  };
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory px-5">
      <form onSubmit={submit} className="w-full max-w-sm" noValidate>
        <Logo size="sm" />
        <h1 className="mt-6 text-[24px] font-bold">서비스 관리자</h1>
        <p className="mt-1 text-[14px] text-ink-2">교사 인증과 운영 현황을 보는 화면이에요.</p>
        <Field name="token" type="password" label="관리자 비밀번호" autoComplete="current-password" className="mt-6" error={error} disabled={state === "checking"} />
        <Button type="submit" size="lg" busy={state === "checking"} className="mt-4 w-full">열기</Button>
      </form>
    </div>
  );
}

function Console({ onLeave }: { onLeave: () => void }) {
  const [tab, setTab] = useState<"teachers" | "classes" | "logs">("teachers");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, t, c, l] = await Promise.all([
        ownerApi<{ overview: Overview }>("/api/admin/overview"),
        ownerApi<{ rows: Teacher[] }>("/api/admin/teachers"),
        ownerApi<{ rows: ClassRow[] }>("/api/admin/classes"),
        ownerApi<{ rows: Log[] }>("/api/admin/logs"),
      ]);
      setOverview(o.overview); setTeachers(t.rows); setClasses(c.rows); setLogs(l.rows);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const decide = async (id: number, action: "verify" | "reject") => {
    setBusy(id);
    try { await ownerApi(`/api/admin/teachers/${id}`, { method: "POST", body: JSON.stringify({ action }) }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };

  const stats: [string, number | undefined][] = [["학교", overview?.schools], ["학급", overview?.classes], ["교사", overview?.teachers], ["인증 대기", overview?.pending_teachers], ["학생", overview?.students], ["진행 중 체험", overview?.live_demos]];

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5 md:px-8">
          <Logo size="sm" />
          <span className="rounded-full bg-beige px-2.5 py-0.5 text-[12px] font-semibold text-ink-2">관리자</span>
          <Button variant="quiet" size="sm" onClick={onLeave} className="ml-auto">나가기</Button>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-5 py-6 md:px-8">
        <dl className="grid grid-cols-3 gap-y-4 rounded-3xl border border-line bg-paper p-5 sm:grid-cols-6">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[13px] text-ink-3">{k}</dt>
              <dd className={`text-[24px] font-bold num ${k === "인증 대기" && v ? "text-gold-ink" : ""}`}>{v ?? "–"}</dd>
            </div>
          ))}
        </dl>
        <p className="-mt-5 px-1 text-[12px] text-ink-3">체험 모드의 가상 학교·사용자는 숫자에 넣지 않아요. 화해 신호 내용은 관리자도 볼 수 없어요.</p>
        {error && <Notice tone="danger">{error}</Notice>}

        <div role="tablist" aria-label="관리 메뉴" className="flex gap-1 border-b border-line">
          {([["teachers", "교사 인증"], ["classes", "학급"], ["logs", "운영 기록"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-3 py-2.5 text-[15px] font-semibold ${tab === id ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{label}</button>
          ))}
        </div>

        {tab === "teachers" && (
          <section>
            <SectionTitle>교사 계정</SectionTitle>
            {teachers.length ? (
              <ul className="divide-y divide-line rounded-3xl border border-line bg-paper">
                {teachers.map(t => (
                  <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{t.name} <span className={`ml-1 rounded-full px-2 py-0.5 text-[12px] ${STATUS[t.teacher_status][1]}`}>{STATUS[t.teacher_status][0]}</span></p>
                      <p className="text-[13px] text-ink-3">{t.school_name ?? "학교 없음"} · {t.email} · {ago(t.created_at)} 가입 · 학급 {t.classes}</p>
                    </div>
                    <div className="flex gap-2">
                      {t.teacher_status !== "rejected" && <Button size="sm" variant="quiet" disabled={busy === t.id} onClick={() => void decide(t.id, "reject")}>반려</Button>}
                      {t.teacher_status !== "verified" && <Button size="sm" disabled={busy === t.id} onClick={() => void decide(t.id, "verify")}>인증 승인</Button>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[14px] text-ink-3">가입한 교사가 아직 없어요</p>}
            <p className="mt-2 px-1 text-[13px] text-ink-3">재직 증명 자동 확인(교육청 연동)은 구현 예정이에요. 지금은 학교에 직접 확인한 뒤 승인해 주세요.</p>
          </section>
        )}

        {tab === "classes" && (
          <section>
            <SectionTitle>운영 중인 학급</SectionTitle>
            {classes.length ? (
              <ul className="divide-y divide-line rounded-3xl border border-line bg-paper">
                {classes.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="font-semibold">{c.school_name} {c.grade}학년 {c.class_no}반</p>
                      <p className="text-[13px] text-ink-3">{c.school_year}학년도 · {c.teacher_name} · {ago(c.created_at)} 개설</p>
                    </div>
                    <span className="text-[14px] text-ink-2 num">{c.students}명</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[14px] text-ink-3">개설된 학급이 아직 없어요</p>}
          </section>
        )}

        {tab === "logs" && (
          <section>
            <SectionTitle>최근 운영 기록 100건</SectionTitle>
            <ul className="divide-y divide-line rounded-3xl border border-line bg-paper text-[14px]">
              {logs.map(l => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span><b className="font-semibold">{ACTION[l.action] ?? l.action}</b> <span className="text-ink-3">· {{ teacher: "교사", student: "학생", admin: "관리자" }[l.actor_role] ?? l.actor_role}</span></span>
                  <time className="shrink-0 text-[12px] text-ink-3" dateTime={l.created_at}>{ago(l.created_at)}</time>
                </li>
              ))}
              {!logs.length && <li className="px-5 py-4 text-ink-3">기록이 없어요</li>}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
