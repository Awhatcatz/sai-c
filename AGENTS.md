# 사이°C

## 이 앱

- 학교용 학급 관계 형성·회복 서비스. 문구 「작은 행동이 우리 사이의 온도를 높입니다」. 모바일 중심 반응형 웹앱.
- 브랜드: 아이보리 바탕, 코랄 #E46557(온도·액체·크레딧에만), 차콜 #302D2C(버튼·글자), Pretendard. C자 유리 플라스크 속 액체가 실제 온도를 따른다.
- 화면: `/` 랜딩(플라스크 체험 버튼) · `/login`(학생 아이디 / 교사 이메일) · `/signup/teacher`(학교 검색, 인증 대기) · `/join`(학급 코드·가입 링크로 학생 가입) · `/demo`(심사 체험).
- 학생 `/s`: 홈(우리 반 온도·내 온도·현재 미션·알림, 승인 전엔 기다림 화면), 나(새 학급 코드·로그아웃·탈퇴). 미션·우리 반·회복은 「구현 예정」 화면.
- 교사 `/t`: 학급 목록·학급 만들기(인증된 교사만), `/t/classes/:id` 학급 온도·7일 기록·가입 코드(발급·재발급·막기)·가입 승인/거절/내보내기. 마니또·회복은 「구현 예정」.
- `/admin`: 서비스 관리자(ADMIN_TOKEN 비밀번호). 교사 인증 승인·반려, 학급 현황, 운영 기록.
- 체험 모드: 시작할 때마다 가상 학교·교사·학생 10명+대기 2명을 새로 만들고 6시간 뒤 지움. 맨 위 띠에서 인물 바꾸기.
- 저장: users(교사·학생 계정), schools(지금은 테스트용 가상 학교), classes, class_members(가입 신청·승인), class_invites, manitto_seasons, missions, mission_submissions, credit_transactions(크레딧 원본), temperature_history, notifications, activity_logs, reconciliation_*(화해 신호, 어떤 화면·관리자 API도 읽지 않음).

## 지켜야 할 결정

- 화해 신호는 쌍방 매칭 전까지 학생·교사·관리자 누구에게도 공개하지 않는다. 크레딧은 현금 가치가 없고 화해에 주지 않는다.
- 학생 개인정보는 이름·출석번호·아이디만. 역할·학교·학급 접근은 서버가 매 요청마다 검사한다.
- 안 만든 기능은 「구현 예정」 표시. APK·PWA·공식 학교 API·교사 신분 자동 인증은 아직 없다(완료처럼 쓰지 않기).
- 코드 구조: 기능 하나 = `worker/modules/*.ts` 하나, 화면은 `src/pages/<역할>/`, 페이지 등록은 `src/routes.tsx` 에만, 온도 계산식은 `src/shared/temperature.ts`.
- 공동 개발은 GitHub 저장소(브랜치·PR)를 가운데 두고, 게시는 이 프로젝트에서만 한다(TEAM_GUIDE.md). 문서의 「프로젝트 공유」는 채팅 프로젝트 기능이며 바이브 코딩 공동 편집은 문서에 없다. ADMIN_TOKEN은 운영 비밀번호일 뿐 개발 권한이 아니다. 저장소: https://github.com/Awhatcatz/sai-c (공개, main). 이후 변경은 브랜치·PR로.

## 다음 할 일

- 마니또 시즌 열기·짝 배정, 미션 실천 기록·교사 승인(중복 크레딧 방지), 우리 반 화면, 화해 신호(쌍방 매칭), 비밀번호 찾기.
- 문서: README, PROJECT_SPEC, DATABASE, DESIGN_SYSTEM, DEVELOPMENT_STATUS, CHANGELOG, TEAM_GUIDE, TEST_CASES — 기능을 바꿀 때 함께 고친다.
- 점검: `npm run test:api` (미리보기 로컬 DB에 가상 계정만 만든다, 2026-11-25 42/42 통과). 항목 번호는 TEST_CASES와 같다. 새 기능엔 항목을 더한다.
- 아직 확인 못 함: ADMIN_TOKEN을 넣은 뒤 `/admin` 로그인·교사 인증 승인 화면.
