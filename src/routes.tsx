import { HeartHandshake, Home as HomeIcon, ListChecks, School, Sparkles, Thermometer, UserRound } from "lucide-react";
import type { RouteObject } from "react-router";
import App from "./App";
import { Flask } from "./brand/Flask";
import { RoleShell, type ShellTab } from "./components/RoleShell";
import { ButtonLink, PlannedScreen } from "./components/ui";
import { RequireRole } from "./lib/auth";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Join from "./pages/auth/Join";
import Login from "./pages/auth/Login";
import TeacherSignup from "./pages/auth/TeacherSignup";
import Demo from "./pages/Demo";
import Home from "./pages/Home";
import StudentHome from "./pages/student/StudentHome";
import ClassDetail from "./pages/teacher/ClassDetail";
import TeacherHome from "./pages/teacher/TeacherHome";

// Every page of the app is listed here, and only here. main.tsx builds the router from this
// array and exposes it as window.__baze.routes so the BAZE preview can list the pages.
// /s = 학생 화면, /t = 담임교사 화면, /admin = 서비스 관리자. 역할 검사는 서버가 다시 한다.
const STUDENT_TABS: ShellTab[] = [
  { to: "/s", label: "홈", icon: HomeIcon, end: true },
  { to: "/s/missions", label: "미션", icon: ListChecks },
  { to: "/s/class", label: "우리 반", icon: Thermometer },
  { to: "/s/repair", label: "회복", icon: HeartHandshake },
  { to: "/s/me", label: "나", icon: UserRound },
];
const TEACHER_TABS: ShellTab[] = [
  { to: "/t", label: "학급", icon: School, end: true, also: "/t/classes" },
  { to: "/t/season", label: "마니또", icon: Sparkles },
  { to: "/t/repair", label: "회복", icon: HeartHandshake },
  { to: "/t/me", label: "나", icon: UserRound },
];

export const routes: RouteObject[] = [
  {
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/join", element: <Join /> },
      { path: "/signup/teacher", element: <TeacherSignup /> },
      { path: "/demo", element: <Demo /> },
      {
        path: "/s",
        element: <RequireRole role="student"><RoleShell tabs={STUDENT_TABS} /></RequireRole>,
        children: [
          { index: true, element: <StudentHome /> },
          {
            path: "missions",
            element: <PlannedScreen title="미션" lead="실천한 내용을 짧게 남기고 선생님 확인을 받는 화면이에요." items={["실천 기록 남기기 (200자 이내)", "선생님 승인 · 다시 쓰기 요청 받기", "지난 미션 모아 보기", "학급 온도 50°C에 열리는 특별 미션"]} />,
          },
          {
            path: "class",
            element: <PlannedScreen title="우리 반" lead="반 전체가 함께 올린 온도와 공동 목표를 보는 화면이에요." items={["지난 7일 학급 온도 변화", "공동 목표 단계와 보상 투표", "시즌 마지막 날 마니또 공개", "이름 없는 친절 순위 (상위 구간만)"]} />,
          },
          {
            path: "repair",
            element: (
              <PlannedScreen title="회복" lead="다툰 친구와 다시 가까워지고 싶을 때 쓰는 공간이에요." items={["화해 신호 보내기 — 서로 보낼 때만 두 사람에게 알려요", "오늘의 마음 날씨 남기기", "먼저 말 걸기 문장 도우미"]}>
                <p className="mt-5 rounded-2xl bg-beige px-4 py-3 text-[14px] leading-6 text-ink-2">화해 신호는 서로 마음이 맞기 전까지 선생님도, 운영자도 볼 수 없게 만들어요. 화해에는 크레딧을 주지 않아요.</p>
              </PlannedScreen>
            ),
          },
          { path: "me", element: <Account /> },
        ],
      },
      {
        path: "/t",
        element: <RequireRole role="teacher"><RoleShell tabs={TEACHER_TABS} /></RequireRole>,
        children: [
          { index: true, element: <TeacherHome /> },
          { path: "classes/:id", element: <ClassDetail /> },
          {
            path: "season",
            element: <PlannedScreen title="마니또 시즌" lead="시즌을 열고, 짝을 정하고, 학생이 남긴 실천 기록을 확인하는 화면이에요." items={["시즌 기간 · 1인 목표 크레딧 정하기", "마니또 짝 자동 배정 (자기 자신·맞짝 제외)", "실천 기록 승인 · 다시 쓰기 요청", "같은 미션 중복 크레딧 막기", "시즌 마감과 마니또 공개"]} />,
          },
          {
            path: "repair",
            element: <PlannedScreen title="관계 회복" lead="학급 분위기를 살피고 회복 대화를 돕는 화면이에요." items={["학급 마음 날씨 흐름 (개인 응답은 익명)", "회복 대화 진행 안내서", "도움이 필요한 학생 상담 연계"]}>
                <p className="mt-5 rounded-2xl bg-beige px-4 py-3 text-[14px] leading-6 text-ink-2">학생끼리 보낸 화해 신호는 서로 맞기 전까지 선생님 화면에도 나타나지 않아요.</p>
              </PlannedScreen>,
          },
          { path: "me", element: <Account /> },
        ],
      },
      { path: "/admin", element: <Admin />, handle: { owner: true } },
      { path: "*", element: <NotFound /> },
    ],
  },
];

function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <Flask value={0} size={96} riseOnMount={false} className="mx-auto" />
        <p className="mt-3 text-[48px] font-bold text-coral-ink num">0°C</p>
        <h1 className="mt-2 text-[22px] font-bold">찾는 화면이 없어요</h1>
        <p className="mt-1 text-[15px] text-ink-2">주소를 다시 확인해 주세요.</p>
        <ButtonLink to="/" className="mt-6">처음 화면으로</ButtonLink>
      </div>
    </div>
  );
}
