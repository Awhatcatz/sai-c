# 데이터베이스

원본은 `schema.sql`. 배포 때 BAZE가 그대로 적용하고, 미리보기는 `npm run dev`(scripts/db-init.mjs)가 로컬 DB에 적용한다.

- **바꾸는 규칙**: 이미 배포된 표는 지우거나 칸 이름을 바꾸지 않는다. `CREATE ... IF NOT EXISTS`, 새 표, 새 칸 추가만 한다. 바꿀 때는 이 문서와 `CHANGELOG.md`를 함께 고친다.
- **두 개의 DB**: 미리보기 DB(샌드박스 `.wrangler/`)와 게시된 앱의 DB는 따로다. 게시된 앱의 행은 BAZE **설정 > 데이터베이스**에서 본다. 미리보기 행은 버전 저장에 포함되지 않는다.
- **실제 학생 데이터**는 코드·견본·문서·커밋에 복사하지 않는다.
- 시각은 모두 UTC ISO 문자열(`2026-11-25T03:00:00Z`), 날짜는 한국 시간 `YYYY-MM-DD`.

## 관계 한눈에

```
schools ─┬─ users(교사, school_id)
         └─ classes ─┬─ class_members ── users(학생)
                     ├─ class_invites
                     ├─ manitto_seasons ─┬─ season_participants
                     │                   ├─ manitto_exclusions
                     │                   ├─ manitto_pairs
                     │                   ├─ missions ── mission_submissions
                     │                   └─ temperature_history
                     ├─ credit_transactions (크레딧 원본)
                     ├─ reconciliation_signals / reconciliation_matches (비공개)
                     ├─ counseling_requests
                     └─ notifications, activity_logs
demo_sandboxes ── schools·users·sessions·activity_logs (sandbox_id, 지우면 함께 삭제)
```

## 표

### 계정 · 학교

| 표 | 용도 | 주요 칸 · 제약 |
|---|---|---|
| `schools` | 학교. 지금은 테스트용 가상 학교 6곳(`source='test'`) | `level` 초·중·고, `neis_school_code`(연동 대비, 있으면 UNIQUE), `source` test/neis/demo |
| `users` | 교사·학생 계정 | `role`, `email`(교사, UNIQUE), `login_id`(학생, UNIQUE), `password_hash`(pbkdf2), `school_id`(교사 소속), `teacher_status` pending/verified/rejected, `status` active/suspended |
| `sessions` | 로그인 상태 | `id` = 쿠키 토큰의 SHA-256(표를 읽어도 로그인 불가), `expires_at` |
| `rate_limit` | 가입·로그인 등 속도 제한 | `key` = 구간 + IP 해시 |

학생 개인정보는 `name`, `login_id`, `class_members.student_no`뿐이다. `nickname`은 순위 표시용(구현 예정).

### 학급 · 가입

| 표 | 용도 | 주요 칸 · 제약 |
|---|---|---|
| `classes` | 학급 | 운영 중(`active`)인 학급은 학교·학년도·학년·반 조합이 UNIQUE, `teacher_id` 담임 |
| `class_members` | 학생의 학급 가입 신청·승인 | `status` pending → approved/rejected, approved → left. `(class_id, user_id)` UNIQUE. `student_no` 출석번호 |
| `class_invites` | 6자리 가입 코드 | `code` UNIQUE(헷갈리는 0·O·1·I·L 제외 31자), `expires_at`, `revoked_at`. 재발급하면 이전 코드에 `revoked_at`이 찍힌다 |

### 마니또 · 미션 · 크레딧

| 표 | 용도 | 주요 칸 · 제약 |
|---|---|---|
| `manitto_seasons` | 시즌 설정 | 기간, `status` draft/active/ended, 보상(기본 10·특별 20), `personal_target_credits`, `class_target_credits`(시작 때 확정), 하루 미션 수, 순위 공개, 종료 시 공개 |
| `season_participants` | 시즌 참여 학생 | `(season_id, user_id)` UNIQUE, 순위 제외·공개 동의 |
| `manitto_exclusions` | 담임이 지정한 배정 제외 쌍 | `(season_id, user_a, user_b)` UNIQUE |
| `manitto_pairs` | giver가 receiver를 몰래 챙긴다 | 시즌마다 giver·receiver 각각 UNIQUE, 자기 자신 금지 |
| `missions` | 학생별 미션 | `kind` basic/special/teacher, `source` ai/preset/teacher, `status` active → submitted → approved/revise, skipped |
| `mission_submissions` | 실천 기록 | `content`, `status` pending/approved/revise, 교사 코멘트·확인자 |
| `credit_transactions` | **크레딧의 유일한 원본** | `reason` = mission_basic / mission_special / teacher_award / demo_seed 만 허용(화해 사유 없음). `submission_id` UNIQUE로 같은 제출에 두 번 지급 불가 |
| `temperature_history` | 하루 한 줄 온도 기록 | `subject` = 'class' 또는 학생 id, `(season_id, subject, recorded_on)` UNIQUE |
| `badges` · `user_badges` | 학급 온도 단계 배지(25·50·75·100°C) | `(user_id, badge_id, season_id)` UNIQUE |

개인·학급 온도와 순위는 저장하지 않고 `credit_transactions` 합계로 계산한다(`worker/core/temperature.ts`).

### 회복 · 안전 (구현 예정, 표만 준비)

| 표 | 용도 | 열람 규칙 |
|---|---|---|
| `reconciliation_signals` | 학생이 보낸 비공개 화해 신호 | **보낸 학생 본인만**. 교사·관리자 화면과 API 어디에서도 읽지 않는다 |
| `reconciliation_matches` | 두 학생이 서로 보냈을 때만 생기는 매칭 | 매칭된 두 학생에게만 알림. 크레딧 지급 없음 |
| `user_blocks` | 학생 간 차단 | 본인만 |
| `counseling_requests` | 상담 요청(`urgent` = 학교폭력·위협, 보호 우선) | 담임 |

### 알림 · 운영

| 표 | 용도 |
|---|---|
| `notifications` | 사용자별 알림(가입 승인, 교사 인증, 미션 등) |
| `activity_logs` | 누가 무엇을 했는지(가입 승인, 코드 재발급, 교사 인증 …). 화해 신호 내용은 남기지 않는다 |
| `demo_sandboxes` | 심사 체험 공간 |

## 체험 데이터 격리

- 「체험 시작」마다 `demo_sandboxes` 한 줄과 그 `sandbox_id`를 단 가상 학교·교사·학생 10명·승인 대기 2명·진행 중 시즌·미션·크레딧·7일 온도 기록이 만들어진다.
- 실제 학교 검색, 가입 코드, 일반 로그인, 관리자 통계는 `sandbox_id`가 있는 행을 보지 않는다.
- 6시간이 지나면 다음 체험 시작 때, 또는 「체험 끝내기」를 누르면 `ON DELETE CASCADE`로 통째로 지워진다.

## 데이터 탭에 먼저 보이는 표

`baze.json`의 `data.tables`: users, classes, class_members, schools, manitto_seasons, missions, mission_submissions, credit_transactions, activity_logs. 나머지는 「앱 내부용 표」로 접혀 보인다.
