// 심사 체험 중일 때만 맨 위에 붙는 띠: 가상 데이터 표시 · 인물 바꾸기 · 체험 끝내기.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, post } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";

type Persona = { id: number; role: "teacher" | "student"; name: string; member_status: string | null; student_no: number | null };

export function DemoBar() {
  const { me, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [busy, setBusy] = useState(false);
  const sandbox = me?.user.sandbox_id;

  useEffect(() => {
    if (!sandbox) return;
    api<{ personas: Persona[] }>("/api/demo/personas").then(r => setPersonas(r.personas)).catch(() => setPersonas([]));
  }, [sandbox]);

  if (!me || !sandbox) return null;

  const switchTo = async (id: number) => {
    setBusy(true);
    try {
      const r = await post<{ role: "teacher" | "student" }>("/api/demo/switch", { userId: id });
      await refresh();
      nav(homeFor(r.role));
    } finally {
      setBusy(false);
    }
  };
  const end = async () => {
    await logout();
    nav("/");
  };

  return (
    <div className="relative z-40 bg-lavender text-lavender-ink">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-[13px] sm:px-8">
        <span className="font-bold">심사 체험 중</span>
        <span className="hidden sm:inline">모든 사람과 학교는 가상이에요</span>
        <label className="ml-auto flex items-center gap-1.5">
          <span className="sr-only sm:not-sr-only">보는 사람</span>
          <select
            value={me.user.id}
            disabled={busy}
            onChange={e => void switchTo(Number(e.target.value))}
            className="h-8 max-w-[11rem] rounded-lg border border-lavender-ink/25 bg-paper px-2 text-[13px] text-ink"
          >
            {personas.map(p => (
              <option key={p.id} value={p.id}>
                {p.role === "teacher" ? p.name : `${p.student_no}번 ${p.name}${p.member_status === "pending" ? " (승인 대기)" : ""}`}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void end()} className="h-8 rounded-lg px-2.5 font-semibold hover:bg-paper/60">체험 끝내기</button>
      </div>
    </div>
  );
}
