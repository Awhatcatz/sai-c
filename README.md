# 사이°C

> 작은 행동이 우리 사이의 온도를 높입니다

사이°C는 학교 학급을 위한 관계 형성·회복 웹앱이에요. 학생은 마니또 친구를 몰래 챙기는 작은 친절 미션을 하고, 담임교사가 확인한 만큼 크레딧이 쌓여 **개인 온도**와 **우리 반 온도**가 올라가요. 휴대폰 화면을 먼저 생각한 반응형 웹이에요.

- 사용자: 학생, 담임교사, 서비스 관리자(운영자)
- 상징: C 글자 모양 유리 플라스크. 안의 액체 높이가 실제 온도(0~100°C)를 따라요.
- 지금 단계: 계정·학급·가입 승인·온도 표시까지 만들었고, 마니또 시즌 운영·미션 제출·화해 신호는 구현 예정이에요. 자세한 현황은 [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md)를 보세요.

## 로컬에서 실행하기

```bash
npm install
npm run dev
```

`npm run dev`(`scripts/dev.mjs`)는 아래 세 가지를 한 번에 해요.

1. 화면 개발 서버(Vite, 5173번)를 띄워요. `/api` 요청은 API 서버로 넘겨요.
2. `npm run db:init`과 같은 일을 해요: 로컬 DB에 `schema.sql`을 적용해요(`seed.sql`이 있으면 함께).
3. API 서버(`wrangler dev`, 8787번)를 띄워요.

로컬 DB를 직접 보고 싶을 때:

```bash
npm run db:init                                                   # schema.sql 다시 적용(이미 있는 표는 그대로)
npx wrangler d1 execute app --local --command "SELECT id, role, teacher_status FROM users"
```

로컬 DB는 `.wrangler/` 폴더에만 있고 저장소에 올라가지 않아요. 게시된 앱은 따로 DB를 가지며, 소유자는 BAZE **설정 > 데이터베이스**에서 그 행을 봐요. 자세한 내용은 [DATABASE.md](DATABASE.md).

| 스크립트 | 하는 일 |
|---|---|
| `npm run dev` | 화면 + 로컬 DB 준비 + API 서버 |
| `npm run build` | 타입 검사 후 화면 빌드(`dist/`) |
| `npm run db:init` | 로컬 DB에 `schema.sql` 적용 |
| `npm run test:api` | API 점검 42개(가입·승인·권한·코드·체험). `npm run dev`가 켜져 있어야 함. [TEST_CASES.md](TEST_CASES.md) |

## 체험 모드 (`/demo`)

가입 없이 둘러보는 심사·시연용 모드예요. 「체험 시작」을 누를 때마다 그 사람만 쓰는 가상 학교·담임교사·학생 10명·승인 대기 2명·진행 중인 마니또 시즌(학급 38°C)이 새로 만들어져요.

- 화면 맨 위 보라색 띠에서 교사↔학생 인물을 바꿀 수 있어요.
- 체험 계정은 비밀번호가 없어 일반 로그인으로 들어올 수 없어요.
- 실제 학교 검색, 가입 코드, 관리자 통계에는 체험 데이터가 섞이지 않아요.
- 6시간이 지난 체험 공간은 다음 체험 시작 때 통째로 지워져요. 「체험 끝내기」를 누르면 바로 지워져요.

## 서비스 관리자 화면 (`/admin`)

교사 인증 승인·반려, 운영 중인 학급, 최근 운영 기록을 보는 화면이에요.

- 소유자가 BAZE **설정 > 환경 변수**에 `ADMIN_TOKEN`(관리자 비밀번호)을 넣어야 열려요. 값은 어떤 파일에도 적지 않아요.
- 비밀번호가 없거나 틀리면 관리자 API는 존재 자체를 숨겨요(404).
- 입력한 비밀번호는 그 브라우저 탭에만 남아요.
- 화해 신호는 관리자 화면에서도 볼 수 없어요(그런 경로가 서버에 없어요).

## 폴더 구조

```
schema.sql              DB 구조(배포 때 그대로 적용). 설명은 DATABASE.md
worker/
  index.ts              API 입구. 기능 모듈을 한 줄씩 연결
  lib.ts                공통 도구(입력 정리, 속도 제한, 코드 생성, 관리자 검사)
  core/auth.ts          비밀번호 해시, 세션 쿠키, 로그인·역할 검사
  core/access.ts        학교·학급 단위 접근 검사, 운영 기록
  core/temperature.ts   크레딧 합계로 온도 계산·기록
  modules/*.ts          기능별 API: auth, invites, teacher, student, demo, admin
src/
  routes.tsx            모든 화면 경로(여기에만 등록)
  pages/                화면: Home, Demo, Admin, Account, auth/, student/, teacher/
  components/           공통 부품: ui, temp(온도 카드·그래프), RoleShell, AuthFrame, DemoBar
  brand/                Flask(플라스크 심볼), Logo(워드마크·로딩 화면)
  shared/               서버와 화면이 함께 쓰는 계산식(temperature)과 기본 미션(missions)
  lib/                  화면용 API 호출, 로그인 상태, 날짜·숫자 형식
  owner/ownerApi.ts     관리자 비밀번호 보관·관리자 API 호출
  styles.css            디자인 토큰(색·글꼴·움직임)
scripts/                dev.mjs, db-init.mjs
```

## 문서

| 문서 | 내용 |
|---|---|
| [PROJECT_SPEC.md](PROJECT_SPEC.md) | 목표, 역할, 원칙, 온도 계산식, 화면·API 목록, 범위 밖 |
| [DATABASE.md](DATABASE.md) | 표별 설명, 관계, 체험 데이터 격리, 중복 지급 방지 |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | 색, 글꼴, 플라스크 심볼, 부품, 문구 규칙 |
| [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) | 구현됨 / 구현 예정 / 막힘 |
| [CHANGELOG.md](CHANGELOG.md) | 바뀐 내용 기록 |
| [TEAM_GUIDE.md](TEAM_GUIDE.md) | BAZE에서 여럿이 함께 개발하는 방법, 파일 담당 규칙 |
| [TEST_CASES.md](TEST_CASES.md) | 확인한 시험 항목과 결과 |
