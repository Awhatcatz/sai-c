import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { AuthFrame, Segmented } from "../../components/AuthFrame";
import { Button, Field, Notice, Planned } from "../../components/ui";
import { post } from "../../lib/api";
import { homeFor, useAuth } from "../../lib/auth";

export default function Login() {
  const { me, loading, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [kind, setKind] = useState<"student" | "teacher">(params.get("as") === "teacher" ? "teacher" : "student");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && me) return <Navigate to={homeFor(me.user.role)} replace />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      await post("/api/auth/login", { kind, id: f.get("id"), password: f.get("password") });
      const next = await refresh();
      const want = params.get("next");
      nav(want && next && want.startsWith(homeFor(next.user.role)) ? want : homeFor(next?.user.role ?? kind), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="다시 만나서 반가워요"
      footer={
        <div className="grid gap-2">
          <p>처음이라면 <Link to="/join" className="font-semibold text-ink underline underline-offset-4">학급 코드로 가입</Link>하거나 <Link to="/signup/teacher" className="font-semibold text-ink underline underline-offset-4">선생님으로 시작</Link>하세요.</p>
          <p className="flex flex-wrap items-center gap-2">비밀번호 찾기 · 초기화 <Planned /></p>
        </div>
      }
    >
      <Segmented label="누구로 로그인할까요" value={kind} onChange={v => { setKind(v); setError(""); }} options={[{ value: "student", label: "학생" }, { value: "teacher", label: "선생님" }]} />
      <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
        {kind === "student" ? (
          <Field key="sid" name="id" label="아이디" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="가입할 때 정한 아이디" required />
        ) : (
          <Field key="tid" name="id" label="이메일" type="email" autoComplete="email" inputMode="email" placeholder="name@school.kr" required />
        )}
        <Field name="password" label="비밀번호" type="password" autoComplete="current-password" required />
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" size="lg" busy={busy} className="mt-1">로그인</Button>
      </form>
    </AuthFrame>
  );
}
