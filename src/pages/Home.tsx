// 랜딩: 서비스 소개 · 선생님 시작 · 학급 코드 가입 · 심사 체험. 로그인한 사람은 자기 홈으로 바로 보낸다.
import { useState } from "react";
import { Navigate } from "react-router";
import { Flask } from "../brand/Flask";
import { Logo } from "../brand/Logo";
import { ButtonLink, Planned } from "../components/ui";
import { homeFor, useAuth } from "../lib/auth";
import { temp } from "../lib/format";
import { CLASS_MILESTONES } from "../shared/temperature";

const STEPS = [
  { n: "1", title: "몰래 친구를 챙겨요", body: "마니또 친구가 정해지면 매일 작은 친절 미션이 도착해요. 인사, 칭찬, 함께 정리하기처럼 1~10분이면 되는 일이에요." },
  { n: "2", title: "선생님이 확인해요", body: "실천한 내용을 짧게 남기면 담임 선생님이 확인해요. 승인된 미션만 크레딧이 되고, 같은 미션은 두 번 쌓이지 않아요." },
  { n: "3", title: "우리 반 온도가 올라요", body: "모두의 크레딧이 모여 학급 온도가 됩니다. 25°C, 50°C, 75°C마다 반 전체가 함께 여는 목표가 있어요." },
];

const PROMISES = [
  { title: "화해 신호는 둘만 알아요", body: "서로 마음이 맞기 전까지 선생님도, 운영자도 볼 수 없어요. 맞았을 때만 두 사람에게 알려요.", planned: true },
  { title: "학생 정보는 꼭 필요한 만큼만", body: "이름, 출석번호, 아이디만 받아요. 전화번호·생일·사진은 묻지 않아요." },
  { title: "크레딧은 돈이 아니에요", body: "현금이나 상품으로 바꿀 수 없고, 화해했다고 크레딧을 주지도 않아요. 관계를 점수로 거래하지 않게요." },
  { title: "우리 반 기록은 우리 반에만", body: "다른 학교·다른 반 기록은 서버가 막아요. 선생님도 담임 학급만 볼 수 있어요." },
];

export default function Home() {
  const { me, loading } = useAuth();
  if (!loading && me) return <Navigate to={homeFor(me.user.role)} replace />;

  return (
    <div className="min-h-dvh bg-ivory">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
        <Logo size="md" to="/" />
        <nav className="flex items-center gap-1 text-[15px]">
          <ButtonLink to="/demo" variant="quiet" size="sm">심사 체험</ButtonLink>
          <ButtonLink to="/login" variant="quiet" size="sm">로그인</ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 md:grid-cols-[1.15fr_1fr] md:gap-8 md:pb-24 md:pt-12">
          <div className="sai-in">
            <p className="text-[15px] font-semibold text-coral-ink">학급 관계 형성 · 회복 서비스</p>
            <h1 className="mt-3 text-[34px] font-bold leading-[1.25] tracking-[-0.035em] sm:text-[46px] md:text-[54px]">
              작은 행동이<br />우리 사이의 온도를<br />높입니다
            </h1>
            <p className="mt-5 max-w-[34ch] text-[17px] leading-[1.8] text-ink-2">
              마니또 친구를 몰래 챙기고, 선생님이 확인한 만큼 우리 반 온도가 올라가요. 점수 경쟁 대신 서로를 알아 가는 한 학기를 만들어요.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
              <ButtonLink to="/signup/teacher" size="lg">선생님으로 시작하기</ButtonLink>
              <ButtonLink to="/join" size="lg" variant="secondary">학급 코드로 가입하기</ButtonLink>
            </div>
            <p className="mt-4 text-[14px] text-ink-3">
              가입 없이 둘러보려면{" "}
              <a href="/demo" className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">심사 체험 모드</a>
              로 가상 학급을 열어 보세요.
            </p>
          </div>

          <HeroThermo />
        </section>

        <section className="border-y border-line bg-paper">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-20">
            <h2 className="text-[26px] font-bold sm:text-[30px]">온도는 이렇게 올라가요</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
              {STEPS.map(s => (
                <li key={s.n}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-beige text-[15px] font-bold num">{s.n}</span>
                  <h3 className="mt-4 text-[19px] font-bold">{s.title}</h3>
                  <p className="mt-2 max-w-[36ch] text-[15px] leading-[1.75] text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 md:py-20">
          <h2 className="text-[26px] font-bold sm:text-[30px]">아이들이 안심할 수 있게</h2>
          <p className="mt-2 max-w-[44ch] text-[16px] text-ink-2">관계를 다루는 서비스라서, 무엇을 보이지 않을지부터 정했어요.</p>
          <ul className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {PROMISES.map(p => (
              <li key={p.title} className="border-t border-line pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[18px] font-bold">{p.title}</h3>
                  {p.planned && <Planned />}
                </div>
                <p className="mt-2 max-w-[42ch] text-[15px] leading-[1.75] text-ink-2">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-ink px-6 py-9 text-white sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="text-[22px] font-bold sm:text-[26px]">가상 학급으로 먼저 둘러보세요</h2>
              <p className="mt-2 max-w-[40ch] text-[15px] text-white/75">체험할 때마다 나만 쓰는 가상 학교·선생님·학생 10명이 새로 만들어져요. 6시간 뒤 자동으로 지워져요.</p>
            </div>
            <a href="/demo" className="inline-flex h-12 shrink-0 items-center rounded-2xl bg-white px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-beige">심사 체험 시작</a>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo size="sm" />
          <p>학교 이름은 실제 학교 정보 연동 전까지 테스트용 가상 데이터예요.</p>
        </div>
      </footer>
    </div>
  );
}

/** 히어로의 플라스크: 「미션 승인해 보기」를 누르면 실제 계산식대로 학급 온도가 오른다(학생 25명 × 목표 100크레딧). */
function HeroThermo() {
  const TARGET = 25 * 100;
  const [credits, setCredits] = useState(1550);
  const [pops, setPops] = useState<number[]>([]);
  const t = Math.min(100, (credits / TARGET) * 100);
  const next = CLASS_MILESTONES.find(m => m.at > t);

  const approve = () => {
    setCredits(c => Math.min(TARGET, c + 50));
    const id = Date.now();
    setPops(p => [...p.slice(-2), id]);
    setTimeout(() => setPops(p => p.filter(x => x !== id)), 1800);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Flask value={t} size={260} label="예시 학급 온도" className="h-auto w-[220px] sm:w-[260px]" />
        {pops.map(id => (
          <span key={id} className="sai-pop pointer-events-none absolute right-2 top-10 rounded-full bg-paper px-3 py-1 text-[14px] font-bold text-coral-ink shadow-[var(--shadow-float)]">
            +50 크레딧
          </span>
        ))}
      </div>
      <p className="mt-2 text-[14px] text-ink-3">예시 학급 · 2학년 3반</p>
      <p className="text-[52px] font-bold leading-tight text-coral-ink num" aria-live="polite">{temp(t)}°C</p>
      <p className="mt-1 text-[14px] text-ink-2">{next ? `${next.at}°C에서 「${next.label}」` : "공동 목표를 달성했어요"}</p>
      <button
        type="button"
        onClick={approve}
        disabled={t >= 100}
        className="mt-5 inline-flex h-11 items-center rounded-full border border-line-strong bg-paper px-5 text-[14px] font-semibold transition-colors hover:border-ink disabled:opacity-50"
      >
        미션 5개 승인해 보기
      </button>
    </div>
  );
}
