// 교사 첫 화면: 인증 상태 · 내 학급 목록 · 새 학급 만들기.
import { ChevronRight, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Splash } from "../../brand/Logo";
import { Button, Notice, SectionTitle, SelectField, Field } from "../../components/ui";
import { post } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useLoad } from "../../lib/useLoad";

type ClassRow = { id: number; school_year: number; grade: number; class_no: number; name: string; school_name: string; students: number; pending: number };

export default function TeacherHome() {
  const { me } = useAuth();
  const { data, error } = useLoad<{ classes: ClassRow[] }>("/api/teacher/classes");
  const status = me?.user.teacher_status;
  const verified = status === "verified";

  return (
    <div className="sai-in mx-auto grid max-w-3xl gap-8">
      <div>
        <p className="text-[13px] text-ink-3">{me?.school?.name}</p>
        <h1 className="text-[24px] font-bold">{me?.user.name.replace(/ 선생님.*$/, "")} 선생님, 안녕하세요</h1>
      </div>

      {status === "pending" && (
        <Notice tone="warn">
          <b className="font-semibold">교사 인증을 확인하고 있어요.</b> 서비스 관리자가 소속 학교를 확인하면 알림이 오고, 그때부터 학급을 만들 수 있어요.
        </Notice>
      )}
      {status === "rejected" && <Notice tone="danger">교사 인증이 반려됐어요. 소속 학교 정보를 확인한 뒤 서비스 관리자에게 문의해 주세요.</Notice>}

      <section>
        <SectionTitle>내 학급</SectionTitle>
        {error && <Notice tone="danger">{error}</Notice>}
        {!data && !error && <Splash />}
        {data && (data.classes.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.classes.map(c => (
              <li key={c.id}>
                <Link to={`/t/classes/${c.id}`} className="flex items-center gap-4 rounded-3xl border border-line bg-paper p-5 transition-colors hover:border-ink">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink-3">{c.school_year}학년도 · {c.school_name}</p>
                    <p className="text-[19px] font-bold">{c.grade}학년 {c.class_no}반{c.name && <span className="ml-1.5 text-[15px] font-semibold text-ink-2">{c.name}</span>}</p>
                    <p className="mt-1 flex items-center gap-3 text-[14px] text-ink-2">
                      <span className="inline-flex items-center gap-1"><Users size={15} aria-hidden /> {c.students}명</span>
                      {c.pending > 0 && <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[12px] font-semibold text-gold-ink">가입 대기 {c.pending}</span>}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-ink-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl border border-dashed border-line-strong px-5 py-8 text-center text-[14px] text-ink-3">
            {verified ? "아직 만든 학급이 없어요. 아래에서 담임 학급을 만들어 주세요." : "인증이 끝나면 여기에 담임 학급이 보여요."}
          </p>
        ))}
      </section>

      <CreateClass disabled={!verified} level={me?.school?.level ?? "middle"} />
    </div>
  );
}

function CreateClass({ disabled, level }: { disabled: boolean; level: string }) {
  const nav = useNavigate();
  const year = new Date().getFullYear();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const grades = level === "elementary" ? 6 : 3;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await post<{ id: number }>("/api/teacher/classes", {
        schoolYear: Number(f.get("schoolYear")), grade: Number(f.get("grade")), classNo: Number(f.get("classNo")), name: f.get("name"), inviteDays: Number(f.get("inviteDays")),
      });
      nav(`/t/classes/${r.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <section>
      <SectionTitle>새 학급 만들기</SectionTitle>
      <form onSubmit={submit} className="grid gap-4 rounded-3xl bg-paper p-5 shadow-[var(--shadow-float)] sm:grid-cols-3" aria-disabled={disabled}>
        <fieldset disabled={disabled || busy} className="contents">
          <SelectField name="schoolYear" label="학년도" defaultValue={year}>
            {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}학년도</option>)}
          </SelectField>
          <SelectField name="grade" label="학년" defaultValue={1}>
            {Array.from({ length: grades }, (_, i) => <option key={i} value={i + 1}>{i + 1}학년</option>)}
          </SelectField>
          <SelectField name="classNo" label="반" defaultValue={1}>
            {Array.from({ length: 20 }, (_, i) => <option key={i} value={i + 1}>{i + 1}반</option>)}
          </SelectField>
          <Field name="name" label="학급 별명 (선택)" maxLength={30} placeholder="예: 햇살반" className="sm:col-span-2" />
          <SelectField name="inviteDays" label="가입 코드 기간" defaultValue={14}>
            <option value={1}>1일</option><option value={7}>7일</option><option value={14}>14일</option><option value={30}>30일</option>
          </SelectField>
          {error && <Notice tone="danger" className="sm:col-span-3">{error}</Notice>}
          <Button type="submit" busy={busy} className="sm:col-span-3">{disabled ? "교사 인증 후 만들 수 있어요" : "학급 만들고 가입 코드 받기"}</Button>
        </fieldset>
      </form>
    </section>
  );
}
