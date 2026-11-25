import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { AuthFrame, Segmented } from "../../components/AuthFrame";
import { Button, Field, Notice } from "../../components/ui";
import { api, post } from "../../lib/api";
import { homeFor, useAuth } from "../../lib/auth";
import { LEVEL } from "../../lib/format";

type School = { id: number; name: string; level: string; region: string | null; district: string | null; source: string };
type Level = "all" | "elementary" | "middle" | "high";

export default function TeacherSignup() {
  const { me, loading, refresh } = useAuth();
  const nav = useNavigate();
  const [level, setLevel] = useState<Level>("all");
  const [q, setQ] = useState("");
  const [schools, setSchools] = useState<School[] | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (school) return;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ q, ...(level === "all" ? {} : { level }) });
      api<{ schools: School[] }>(`/api/schools?${qs}`).then(r => setSchools(r.schools)).catch(() => setSchools([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, level, school]);

  if (!loading && me) return <Navigate to={homeFor(me.user.role)} replace />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (!String(f.get("name") ?? "").trim()) next.name = "이름을 적어 주세요";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(f.get("email") ?? ""))) next.email = "이메일 주소를 다시 확인해 주세요";
    const pw = String(f.get("password") ?? "");
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) next.password = "영문과 숫자를 섞어 8자 이상으로 정해 주세요";
    if (!school) next.school = "소속 학교를 목록에서 골라 주세요";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await post("/api/auth/signup/teacher", { name: f.get("name"), email: f.get("email"), password: pw, schoolId: school!.id });
      await refresh();
      nav("/t", { replace: true });
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="선생님으로 시작하기"
      lead="가입하면 서비스 관리자가 교사 신분을 확인해요. 확인이 끝나면 담임 학급을 만들고 학생을 초대할 수 있어요."
      footer={<p>이미 계정이 있나요? <Link to="/login?as=teacher" className="font-semibold text-ink underline underline-offset-4">로그인</Link></p>}
    >
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink-2">소속 학교<span className="ml-0.5 text-coral-ink" aria-hidden>*</span></legend>
          {school ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink bg-paper px-4 py-3">
              <div>
                <p className="font-semibold">{school.name}</p>
                <p className="text-[13px] text-ink-3">{[school.region, school.district].filter(Boolean).join(" ")} · {LEVEL[school.level]}</p>
              </div>
              <Button type="button" variant="quiet" size="sm" onClick={() => setSchool(null)}>바꾸기</Button>
            </div>
          ) : (
            <>
              <Segmented label="학교급" value={level} onChange={setLevel} options={[{ value: "all", label: "전체" }, { value: "elementary", label: "초" }, { value: "middle", label: "중" }, { value: "high", label: "고" }]} />
              <Field label="학교 이름 검색" className="mt-3" value={q} onChange={e => setQ(e.target.value)} placeholder="예: 사이" autoComplete="off" error={errors.school} />
              <ul className="mt-2 max-h-60 overflow-y-auto rounded-2xl border border-line bg-paper" aria-label="검색된 학교">
                {schools === null && <li className="px-4 py-3 text-[14px] text-ink-3">찾는 중이에요…</li>}
                {schools?.length === 0 && <li className="px-4 py-3 text-[14px] text-ink-3">맞는 학교가 없어요. 다른 이름으로 찾아보세요.</li>}
                {schools?.map(s => (
                  <li key={s.id} className="border-b border-line last:border-0">
                    <button type="button" onClick={() => { setSchool(s); setErrors(e => ({ ...e, school: "" })); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-beige">
                      <span>
                        <span className="block font-semibold">{s.name}</span>
                        <span className="block text-[13px] text-ink-3">{[s.region, s.district].filter(Boolean).join(" ")}</span>
                      </span>
                      <span className="shrink-0 text-[13px] text-ink-3">{LEVEL[s.level]}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[13px] text-ink-3">지금은 테스트용 가상 학교 목록이에요. 공식 학교 정보 연동은 구현 예정이에요.</p>
            </>
          )}
        </fieldset>
        <Field name="name" label="이름" autoComplete="name" placeholder="예시: 김하늘" required error={errors.name} />
        <Field name="email" label="이메일" type="email" inputMode="email" autoComplete="email" placeholder="name@school.kr" required error={errors.email} hint="로그인 아이디로 써요" />
        <Field name="password" label="비밀번호" type="password" autoComplete="new-password" required error={errors.password} hint="영문과 숫자를 섞어 8자 이상" />
        {errors.form && <Notice tone="danger">{errors.form}</Notice>}
        <Button type="submit" size="lg" busy={busy}>가입하고 인증 요청하기</Button>
      </form>
    </AuthFrame>
  );
}
