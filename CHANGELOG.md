# 변경 기록

새 항목을 맨 위에 쓴다. 형식: 날짜 · 무엇이 바뀌었나 · DB 구조 변경 여부.
DB 구조를 바꾼 항목에는 **[DB]**를 붙이고 `DATABASE.md`도 함께 고친다.

## 2026-11-25 · 0.1.0 첫 버전

### 추가
- 랜딩(`/`): 소개, 「작은 행동이 우리 사이의 온도를 높입니다」, 미션 승인 버튼으로 플라스크 온도를 직접 올려 보는 체험, 안심 설계 안내.
- 브랜드: 아이보리·코랄·차콜 색, Pretendard, C자 유리 플라스크(액체 높이 = 실제 온도, 물결 애니메이션, 움직임 줄이기 설정 존중), 워드마크, 로딩 화면.
- 계정: 교사 가입(학교 검색, 인증 대기), 학생 가입(학급 코드·가입 링크), 로그인(학생 아이디 / 교사 이메일), 로그아웃, 탈퇴(비밀번호 확인).
- 교사: 학급 만들기(인증된 교사만), 가입 코드 발급·재발급·막기, 가입 신청 승인·거절·내보내기, 학급 온도 대시보드(7일 기록).
- 학생: 홈(우리 반 온도, 내 온도, 현재 미션, 알림), 승인 대기 화면, 새 학급 가입 신청.
- 서비스 관리자(`/admin`): 교사 인증 승인·반려, 학급 현황, 운영 기록. 관리자 비밀번호(ADMIN_TOKEN)로 보호.
- 심사 체험(`/demo`): 시작할 때마다 가상 학교·교사·학생 10명·승인 대기 2명·진행 중 시즌·7일 온도 기록을 만들고, 맨 위 띠에서 인물을 바꾼다. 6시간 뒤 삭제.
- 미션·우리 반·회복·마니또 시즌 화면은 「구현 예정」 표시로 자리만 잡았다.
- 없는 주소 화면: 빈 플라스크와 0°C.
- API 점검 `npm run test:api`(42개: 계정·학급·가입 코드·승인·권한·원칙·체험).
- 문서: README, PROJECT_SPEC, DATABASE, DESIGN_SYSTEM, DEVELOPMENT_STATUS, CHANGELOG, TEAM_GUIDE, TEST_CASES.

### [DB] 데이터 구조
- 새 표: `schools`, `users`, `sessions`, `classes`, `class_members`, `class_invites`, `manitto_seasons`, `season_participants`, `manitto_exclusions`, `manitto_pairs`, `missions`, `mission_submissions`, `credit_transactions`, `temperature_history`, `badges`, `user_badges`, `reconciliation_signals`, `reconciliation_matches`, `user_blocks`, `counseling_requests`, `notifications`, `activity_logs`, `demo_sandboxes`, `rate_limit`.
- 크레딧 지급 사유에 화해가 없도록 제약을 걸었다. 같은 미션 제출에 크레딧을 두 번 줄 수 없다.

### 정리
- 시작 템플릿의 소유자 화면·설정 파일과 템플릿 디자인 문서(`DESIGN.md`)를 지웠다. 디자인 규칙은 `DESIGN_SYSTEM.md`로 옮겼다.

- `TEAM_GUIDE.md`의 공동 개발 안내를 바로잡았다. 「프로젝트 공유」는 채팅 프로젝트 기능이라, GitHub 저장소(브랜치·PR)를 가운데 두는 방식으로 바꿨다.

### 고친 문제
- 기본 글자 색 규칙이 버튼의 흰 글자를 덮어써 차콜 버튼 글자가 보이지 않던 문제(기본 모양을 `@layer base` 안으로 옮김).
