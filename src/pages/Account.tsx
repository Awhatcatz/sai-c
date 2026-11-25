// 「나」 화면(학생·교사 공통): 내 정보 · (학생) 새 학급 코드 · 로그아웃 · 탈퇴.
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button, Field, Notice, SectionTitle } from "../components/ui";
import { api, post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { LEVEL } from "../lib/format";

const TEACHER_STATUS = { pending: "인증 확인 중", verified: "인증 완료", rejected: "인증 반려" } as const;

export default function Account() {
  const { me, refresh, logout } = useAuth();
  const nav = useNavigate();
  if (!me) return null;
  const u = me.user;
  const demo = !!u.sandbox_id;

  const rows: [string, string][] = [
    ["이름", u.name],
    [u.role === "teacher" ? "이메일" : "아이디", (u.role === "teacher" ? u.email : u.login_id) ?? (demo ? "체험 계정" : "-")],
  ];
  if (u.role === "teacher") {
    if (me.school) rows.push(["소속 학교", `${me.school.name} (${LEVEL[me.school.level]})`]);
    if (u.teacher_status) rows.push(["교사 인증", TEACHER_STATUS[u.teacher_status]]);
  }

  return (
    <div className="sai-in mx-auto grid max-w-xl gap-8">
      <section>
        <h1 className="mb-4 text-[24px] font-bold">내 정보</h1>
        <dl className="divide-y divide-line rounded-3xl border border-line bg-paper">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-5 py-3.5 text-[15px]">
              <dt className="text-ink-3">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {u.role === "student" && !!me.memberships?.length && (
          <ul className="mt-3 grid gap-1 px-1 text-[14px] text-ink-2">
            {me.memberships.map(m => (
              <li key={m.id}>{m.schoolName} {m.schoolYear}학년도 {m.grade}학년 {m.classNo}반 · {m.studentNo}번 · <span className="text-ink-3">{{ approved: "참여 중", pending: "승인 대기", rejected: "반려", left: "나감" }[m.status] ?? m.status}</span></li>
            ))}
          </ul>
        )}
      </section>

      {u.role === "student" && <JoinAnother onDone={async () => { await refresh(); nav("/s"); }} />}

      <section className="grid gap-3">
        <Button variant="secondary" onClick={async () => { await logout(); nav("/"); }}>{demo ? "체험 끝내기" : "로그아웃"}</Button>
        {!demo && <Withdraw onDone={async () => { await refresh(); nav("/"); }} />}
      </section>
    </div>
  );
}

function JoinAnother({ onDone }: { onDone: () => Promise<void> }) {
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    try {
      const r = await post<{ schoolName: string; label: string }>("/api/student/join", { code: f.get("code"), studentNo: Number(f.get("studentNo")) });
      setMsg({ tone: "ok", text: `${r.schoolName} ${r.label}에 가입 신청을 보냈어요` });
      await onDone();
    } catch (err) {
      setMsg({ tone: "danger", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <SectionTitle>새 학급에 가입하기</SectionTitle>
      <p className="-mt-1 mb-4 text-[14px] text-ink-2">새 학년이 되면 같은 계정으로 새 학급 코드를 넣어요. 지난 기록은 그대로 남아요.</p>
      <form onSubmit={submit} className="grid grid-cols-[1fr_7rem] gap-3" noValidate>
        <Field name="code" label="학급 코드" autoCapitalize="characters" autoComplete="off" maxLength={6} placeholder="6자리" required />
        <Field name="studentNo" label="출석번호" type="number" inputMode="numeric" min={1} max={99} required />
        {msg && <Notice tone={msg.tone} className="col-span-2">{msg.text}</Notice>}
        <Button type="submit" variant="secondary" busy={busy} className="col-span-2">가입 신청</Button>
      </form>
    </section>
  );
}

function Withdraw({ onDone }: { onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mx-auto mt-2 text-[13px] text-ink-3 underline underline-offset-4">회원 탈퇴</button>;
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/me", { method: "DELETE", body: JSON.stringify({ password: new FormData(e.currentTarget).get("password") }) });
      await onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="mt-2 grid gap-3 rounded-3xl border border-danger/25 bg-danger-soft/40 p-5" noValidate>
      <p className="text-[14px] leading-6 text-ink-2">탈퇴하면 계정과 학급 가입·크레딧·미션 기록이 함께 지워지고 되돌릴 수 없어요.</p>
      <Field name="password" label="비밀번호 확인" type="password" autoComplete="current-password" required error={error} />
      <div className="flex gap-2">
        <Button type="button" variant="quiet" onClick={() => setOpen(false)}>취소</Button>
        <Button type="submit" variant="danger" busy={busy}>계정 지우기</Button>
      </div>
    </form>
  );
}
