// 심사 체험 입구: 누구로 볼지 고르면 나만 쓰는 가상 학급이 새로 만들어진다.
import { useState } from "react";
import { useNavigate } from "react-router";
import { AuthFrame } from "../components/AuthFrame";
import { Notice } from "../components/ui";
import { post } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";

const ROLES = [
  { as: "teacher" as const, title: "담임 선생님으로 보기", body: "학급 온도와 지난 7일 변화, 가입 승인 대기 2명, 확인을 기다리는 미션을 볼 수 있어요." },
  { as: "student" as const, title: "학생으로 보기", body: "우리 반 온도와 내 온도, 오늘의 마니또 미션, 받은 알림을 볼 수 있어요." },
];

export default function Demo() {
  const { me, refresh, logout } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const start = async (as: "teacher" | "student") => {
    setBusy(as);
    setError("");
    try {
      if (me) await logout();
      await post("/api/demo/start", { as });
      await refresh();
      nav(homeFor(as));
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <AuthFrame
      title="심사 체험 모드"
      lead="가상 학교·선생님·학생 10명으로 채운 학급이 지금 새로 만들어져요. 다른 사람의 체험과 섞이지 않고, 6시간 뒤 자동으로 지워져요."
      footer={<p>체험 중에는 맨 위 띠에서 다른 학생이나 선생님으로 바꿔 볼 수 있어요.</p>}
    >
      {me && !me.user.sandbox_id && <Notice tone="warn" className="mb-4">지금 로그인한 계정은 로그아웃되고 체험이 시작돼요.</Notice>}
      <div className="grid gap-3">
        {ROLES.map(r => (
          <button
            key={r.as}
            type="button"
            disabled={!!busy}
            onClick={() => void start(r.as)}
            className="group rounded-3xl border border-line bg-paper p-5 text-left transition-colors hover:border-ink disabled:opacity-60"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-[18px] font-bold">{r.title}</span>
              <span aria-hidden className="text-[20px] text-ink-3 transition-transform group-hover:translate-x-0.5">→</span>
            </span>
            <span className="mt-1.5 block text-[14px] leading-[1.7] text-ink-2">{busy === r.as ? "가상 학급을 만들고 있어요…" : r.body}</span>
          </button>
        ))}
      </div>
      {error && <Notice tone="danger" className="mt-4">{error}</Notice>}
    </AuthFrame>
  );
}
