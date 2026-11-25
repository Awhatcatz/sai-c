# 디자인 시스템

토큰 원본은 `src/styles.css`의 `@theme static` 블록. 이 문서와 CSS가 어긋나면 CSS가 맞다.

## 1. 색

| 이름 | 값 | 쓰는 곳 |
|---|---|---|
| ivory | `#FFFCF8` | 바탕 |
| paper | `#FFFFFF` | 카드 |
| ink (차콜) | `#302D2C` | 글자, 주 버튼 |
| ink-2 / ink-3 | `#5C5653` / `#736C68` | 보조 글자(ink-3은 아이보리 위 4.6:1, 글자 색의 하한) |
| line / line-strong | `#ECE4DA` / `#D8CCBE` | 테두리 |
| beige / beige-2 | `#F5EEE5` / `#EBE1D4` | 보조 버튼, 안내 상자 |
| **coral** | `#E46557` | **온도에만**: 플라스크 액체, 온도 막대·그래프 |
| coral-ink | `#B8473B` | 온도 숫자, 크레딧 글자(흰 바탕 5.2:1) |
| coral-soft / coral-light | `#FCECE8` / `#EF8C80` | 진행 중 표시, 지난 날 그래프 |
| gold 계열 | `#C9A04E` 외 | 대기·확인 필요(승인 대기, 확인 대기 미션) |
| lavender 계열 | `#EBE7F6` / `#574B84` | 「구현 예정」 배지, 체험 모드 띠 |
| ok / danger 계열 | `#2C7A53` / `#B42318` | 완료 / 오류·삭제 |

규칙: 버튼은 차콜. 코랄을 버튼·장식에 쓰지 않는다 — 코랄이 보이면 「온도」라는 뜻이다.

## 2. 글꼴과 한국어 조판

- `Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, system-ui`
- 본문 `line-height: 1.7`, `word-break: keep-all`(어절 단위 줄바꿈), 제목 `letter-spacing: -0.02em`
- 숫자는 `.num`(고정폭 숫자). 기울임꼴은 쓰지 않는다. 강조는 굵기·색으로.
- 한 줄 40~50자 안팎(`max-w-[36ch]~[44ch]`). 긴 문단은 가운데 정렬하지 않는다.
- 기본 모양은 `@layer base` 안에 둔다. 밖에 두면 버튼의 `text-white` 같은 클래스를 덮어써 글자가 사라진다(2026-11-25 실제 버그).

## 3. 상징: C자 유리 플라스크

`src/brand/Flask.tsx` — C 글자 자체가 유리관이고, 붉은 액체 높이가 온도(0~100)를 따른다.

| 속성 | 뜻 |
|---|---|
| `value` | 온도 0~100. 액체가 1.6초 동안 부드럽게 차오르고 표면 물결 두 겹이 흐른다 |
| `size` | 가로 픽셀 |
| `degree` | 왼쪽 위에 ° 고리를 붙인다(워드마크·로딩용) |
| `label` | 주면 `role="img"`와 「라벨 n°C」 대체 글을 단다. 없으면 장식으로 숨긴다 |
| `riseOnMount` | 처음 그릴 때 0에서 차오를지 |

- 워드마크 `Logo`: 「사이」 + ° 붙은 플라스크. `Splash`: 로딩 화면(플라스크가 천천히 숨쉰다).
- 쓰는 곳: 랜딩 히어로(미션 승인 버튼으로 실제 계산식대로 오른다), 학급 온도 카드, 내 온도, 승인 대기 화면, 404(0°C).

## 4. 부품

| 부품 | 파일 | 쓰는 법 |
|---|---|---|
| `Button`, `ButtonLink` | `components/ui.tsx` | variant: primary(차콜) · secondary(베이지) · quiet · warm · danger / size: sm·md·lg / `busy`면 「처리 중…」 |
| `Field`, `SelectField` | `ui.tsx` | 라벨은 칸 위, 필수는 `*`, 오류는 칸 아래 빨간 문장. 입력 글자 16px(휴대폰 확대 방지) |
| `Notice` | `ui.tsx` | tone: info · ok · warn · danger · lavender |
| `Planned`, `PlannedScreen` | `ui.tsx` | 「구현 예정」 배지 / 예정 기능 화면 |
| `SectionTitle`, `Stat` | `ui.tsx` | 구역 제목 / 숫자 칸 |
| `ClassTempCard`, `MilestoneBar`, `TempHistory` | `components/temp.tsx` | 학급 온도 카드 / 25·50·75 단계 막대 / 최근 7일 막대 그래프 |
| `RoleShell` | `components/RoleShell.tsx` | 휴대폰은 아래 탭 막대, 넓은 화면은 위 막대 탭 |
| `AuthFrame`, `Segmented` | `components/AuthFrame.tsx` | 로그인·가입 틀 / 학생·선생님 고르기 |
| `DemoBar` | `components/DemoBar.tsx` | 체험 중에만 맨 위 보라 띠(인물 바꾸기·체험 끝내기) |

모서리: 입력·버튼 `rounded-2xl`, 카드 `rounded-3xl`, 큰 카드 `rounded-[28px]`.

## 5. 움직임

- `sai-level`(수위 1.6초), `sai-wave`(물결), `sai-in`(화면 등장 0.45초), `sai-pop`(+크레딧 떠오름), `sai-breathe`(로딩)
- `prefers-reduced-motion`이면 물결·숨쉬기를 멈추고 전환을 즉시 끝낸다.

## 6. 문구

- 화면 문장은 해요체(「승인했어요」, 「다시 시도해 주세요」). 버튼은 짧은 동사(`가입 신청하기`, `승인`, `내보내기`).
- 오류는 코드가 아니라 무엇을 하면 되는지 말한다.
- 날짜 `2026년 11월 25일 (수)`, 숫자 `1,000`, 크레딧은 「크레딧」, 온도는 `38°C`.
- 견본·가상 데이터에는 「(가상)」, 「(테스트용)」, 「예시:」를 붙인다.
- 안 만든 기능은 반드시 「구현 예정」. 「곧」, 「준비 중」으로 흐리지 않는다.
