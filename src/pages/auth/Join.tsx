// 학생 가입: ① 학급 코드 확인 → ② (처음이면) 계정 만들기 / (이미 학생 계정이면) 이 학급에 가입 신청.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AuthFrame } from "../../components/AuthFrame";
import { Button, ButtonLink, Field, Notice } from "../../components/ui";
import { api, post } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { shortDate } from "../../lib/format";

type Invite = { valid: true; demo: boolean; schoolName: string; schoolYear: number; grade: number; classNo: number; name: string; expiresAt: string };
const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);

export default function Join() {
  const { me, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [code, setCode] = useState(clean(params.get("code") ?? ""));
  const [invite, setInvite] = useState<Invite | null>(null);
  const [codeError, setCodeError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const check = async (value = code) => {
    if (value.length !== 6) return setCodeError("학급 코드 6자리를 모두 적어 주세요");
    setBusy(true);
    setCodeError("");
    try {
      const r = await api<Invite | { valid: false }>(`/api/invites/${value}`);
      if (!r.valid) setCodeError("맞는 학급이 없거나 코드 기간이 끝났어요. 선생님께 새 코드를 받아 주세요");
      else setInvite(r);
    } catch (e) {
      setCodeError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (code.length === 6) void check(code);
    // 주소로 받은 코드는 한 번만 확인한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    const studentNo = Number(f.get("studentNo"));
    if (!Number.isInteger(studentNo) || studentNo < 1 || studentNo > 99) next.studentNo = "출석번호를 1~99 사이 숫자로 적어 주세요";
    if (!me) {
      if (!String(f.get("name") ?? "").trim()) next.name = "이름을 적어 주세요";
      if (!/^[a-z0-9_]{4,20}$/.test(String(f.get("loginId") ?? "").toLowerCase())) next.loginId = "영문 소문자·숫자·밑줄(_)로 4~20자예요";
      const pw = String(f.get("password") ?? "");
      if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) next.password = "영문과 숫자를 섞어 8자 이상으로 정해 주세요";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (me) await post("/api/student/join", { code, studentNo });
      else await post("/api/auth/signup/student", { code, studentNo, name: f.get("name"), loginId: f.get("loginId"), password: f.get("password") });
      await refresh();
      nav("/s", { replace: true });
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (me?.user.role === "teacher") {
    return (
      <AuthFrame title="학생용 가입 화면이에요" lead="선생님 계정으로 로그인되어 있어요. 학생에게는 학급 코드나 가입 링크를 전해 주세요.">
        <ButtonLink to="/t" size="lg" className="w-full">내 학급으로</ButtonLink>
      </AuthFrame>
    );
  }

  const label = invite && `${invite.schoolYear}학년도 ${invite.grade}학년 ${invite.classNo}반${invite.name ? ` · ${invite.name}` : ""}`;

  return (
    <AuthFrame
      title={invite ? (me ? "이 학급에 가입 신청할까요?" : "계정을 만들어요") : "학급 코드로 가입하기"}
      lead={invite ? "가입 신청을 보내면 담임 선생님이 확인한 뒤 들어갈 수 있어요." : "담임 선생님이 알려 준 6자리 코드를 적어 주세요."}
      footer={!me && <p>이미 계정이 있나요? <Link to="/login" className="font-semibold text-ink underline underline-offset-4">로그인</Link> 후 「나」 화면에서 새 학급 코드를 넣을 수 있어요.</p>}
    >
      {!invite ? (
        <form onSubmit={e => { e.preventDefault(); void check(); }} className="grid gap-4" noValidate>
          <Field
            label="학급 코드"
            value={code}
            onChange={e => { setCode(clean(e.target.value)); setCodeError(""); }}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            placeholder="예: K7M2QA"
            className="[&_input]:text-center [&_input]:text-[24px] [&_input]:font-bold [&_input]:tracking-[0.35em]"
            error={codeError}
            maxLength={6}
            required
          />
          <Button type="submit" size="lg" busy={busy}>학급 확인</Button>
        </form>
      ) : (
        <>
          <div className="rounded-2xl bg-beige px-5 py-4">
            <p className="text-[13px] text-ink-3">가입할 학급</p>
            <p className="mt-0.5 text-[18px] font-bold">{invite.schoolName}</p>
            <p className="text-[15px] text-ink-2">{label}</p>
            <div className="mt-2 flex items-center justify-between text-[13px] text-ink-3">
              <span>코드 {code} · {shortDate(invite.expiresAt)}까지</span>
              <button type="button" onClick={() => { setInvite(null); setErrors({}); }} className="font-semibold text-ink-2 underline underline-offset-4">다른 코드</button>
            </div>
          </div>
          {invite.demo && <Notice tone="lavender" className="mt-3">체험용 가상 학급 코드예요. 체험 화면에서만 쓸 수 있어요.</Notice>}
          <form onSubmit={submit} className="mt-6 grid gap-4" noValidate>
            {!me && <Field name="name" label="이름" autoComplete="name" placeholder="예시: 김서연" required error={errors.name} hint="선생님이 누군지 알아볼 수 있게 실명으로 적어 주세요" />}
            <Field name="studentNo" label="출석번호" type="number" inputMode="numeric" min={1} max={99} placeholder="예: 7" required error={errors.studentNo} />
            {!me && (
              <>
                <Field name="loginId" label="아이디" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="영문 소문자·숫자 4~20자" required error={errors.loginId} />
                <Field name="password" label="비밀번호" type="password" autoComplete="new-password" required error={errors.password} hint="영문과 숫자를 섞어 8자 이상" />
                <p className="text-[13px] leading-6 text-ink-3">전화번호·생일·사진은 받지 않아요. 앱 안에서 이름과 출석번호는 우리 반 담임 선생님만 볼 수 있어요.</p>
              </>
            )}
            {errors.form && <Notice tone="danger">{errors.form}</Notice>}
            <Button type="submit" size="lg" busy={busy}>가입 신청하기</Button>
          </form>
        </>
      )}
    </AuthFrame>
  );
}
