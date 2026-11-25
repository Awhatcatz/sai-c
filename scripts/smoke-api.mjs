// 사이°C API 점검: npm run dev 가 켜진 상태에서 npm run test:api.
// 미리보기 로컬 DB 전용. example.com 가상 계정만 만들고, 교사 인증은 로컬 DB에서 대신 처리한다.
// 항목 번호는 TEST_CASES.md 와 같다.
import { execSync } from "node:child_process";
const B = "http://localhost:5173/api";
const tag = Date.now().toString(36).slice(-5);
const results = [];
const check = (id, ok, note = "") => results.push(`${ok ? "PASS" : "FAIL"} ${id} ${note}`);
const sql = q => execSync(`npx wrangler d1 execute DB --local --command ${JSON.stringify(q)}`, { cwd: process.cwd(), stdio: "pipe" }).toString();

function client() {
  let cookie = "";
  return async (method, path, data, headers = {}) => {
    const res = await fetch(B + path, {
      method,
      headers: { ...(data !== undefined ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    });
    const all = res.headers.getSetCookie();
    const set = all.at(-1);
    if (set) cookie = /Max-Age=0/i.test(set) ? "" : set.split(";")[0];
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, json, setCookie: set };
  };
}

sql("DELETE FROM rate_limit");

// 교사 A 가입 (인증 대기)
const tA = client();
let r = await tA("POST", "/auth/signup/teacher", { name: "예시 교사A", email: `a${tag}@example.com`, password: "short", schoolId: 1 });
check("ACC-03 약한 비밀번호 거절", r.status === 400, r.json?.error);
r = await tA("POST", "/auth/signup/teacher", { name: "예시 교사A", email: `a${tag}@example.com`, password: "test1234", schoolId: 1 });
check("ACC-01 교사 가입", r.status === 201 || r.status === 200, `status ${r.status}`);
check("SEC-02 HttpOnly 쿠키", /HttpOnly/i.test(r.setCookie ?? "") && /SameSite=Lax/i.test(r.setCookie ?? ""));
r = await tA("POST", "/auth/signup/teacher", { name: "예시 교사A", email: `a${tag}@example.com`, password: "test1234", schoolId: 1 });
check("ACC-02 중복 이메일 거절", r.status === 409, r.json?.error);
const tA2 = client();
r = await tA2("POST", "/auth/signup/teacher", { name: "x", email: `a${tag}@example.com`, password: "test1234", schoolId: 1 });

r = await tA("POST", "/teacher/classes", { grade: 3, classNo: 2 });
check("CLS-01 인증 전 학급 만들기 차단", r.status === 403, r.json?.error);

// 운영자 인증을 로컬 DB에서 대신 처리
sql(`UPDATE users SET teacher_status='verified' WHERE email='a${tag}@example.com'`);
const year = new Date().getFullYear();
const gradeA = 1 + (parseInt(tag, 36) % 6), classA = 1 + (parseInt(tag, 36) % 29);
r = await tA("POST", "/teacher/classes", { schoolYear: year, grade: gradeA, classNo: classA, inviteDays: 7 });
check("CLS-02 인증 후 학급 만들기", r.status === 201, `code ${r.json?.code}`);
const classId = r.json?.id; const code1 = r.json?.code;
r = await tA("POST", "/teacher/classes", { schoolYear: year, grade: gradeA, classNo: classA });
check("CLS-03 같은 학년·반 중복 차단", r.status === 409, r.json?.error);

// 가입 코드
r = await client()("GET", `/invites/${code1}`);
check("INV-01 코드 확인", r.json?.valid === true, r.json?.name ?? "");
r = await client()("GET", `/invites/ZZZZZZ`);
check("INV-02 없는 코드", r.json?.valid === false || r.status === 404, `status ${r.status}`);

// 학생 가입
const s1 = client();
r = await s1("POST", "/auth/signup/student", { name: "예시 학생1", studentNo: 7, loginId: `s1_${tag}`, password: "test1234", code: code1 });
check("JOIN-01 학생 가입 신청", r.status === 201 || r.status === 200, `status ${r.status}`);
r = await s1("GET", "/student/home");
check("JOIN-02 승인 전 대기 상태", r.status === 200 && JSON.stringify(r.json).includes("pending"), `status ${r.status}`);
const s2 = client();
r = await s2("POST", "/auth/signup/student", { name: "예시 학생2", studentNo: 8, loginId: `s1_${tag}`, password: "test1234", code: code1 });
check("JOIN-03 중복 아이디 거절", r.status === 409, r.json?.error);
r = await s2("POST", "/auth/signup/student", { name: "예시 학생2", studentNo: 8, loginId: `S2 ${tag}`, password: "test1234", code: code1 });
check("JOIN-04 잘못된 아이디 형식 거절", r.status === 400, r.json?.error);
r = await s2("POST", "/auth/signup/student", { name: "예시 학생2", studentNo: 8, loginId: `s2_${tag}`, password: "test1234", code: code1 });

// 권한
r = await s1("GET", `/teacher/classes/${classId}`);
check("SEC-03 학생이 교사 API 접근 차단", r.status === 403, r.json?.error);
const tB = client();
await tB("POST", "/auth/signup/teacher", { name: "예시 교사B", email: `b${tag}@example.com`, password: "test1234", schoolId: 2 });
sql(`UPDATE users SET teacher_status='verified' WHERE email='b${tag}@example.com'`);
r = await tB("GET", `/teacher/classes/${classId}`);
check("SEC-04 다른 담임 학급 접근 차단", r.status === 404, r.json?.error);
r = await tB("POST", `/teacher/classes/${classId}/members/decide`, { ids: [1, 2, 3], action: "approve" });
check("SEC-05 다른 담임이 승인 시도 차단", r.status === 404, r.json?.error);
r = await client()("GET", "/student/home");
check("SEC-06 로그인 없이 차단", r.status === 401, r.json?.error);
r = await fetch(B + "/auth/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "kind=student" });
check("SEC-07 JSON 아닌 요청 차단", r.status === 415);
r = await client()("GET", "/admin/overview");
check("ADM-01 관리자 비밀번호 없으면 숨김", r.status === 404, `status ${r.status}`);
r = await client()("GET", "/admin/overview", undefined, { authorization: "Bearer wrong-token" });
check("ADM-02 틀린 관리자 비밀번호 숨김", r.status === 404, `status ${r.status}`);

// 승인
r = await tA("GET", `/teacher/classes/${classId}`);
const pending = (r.json?.members ?? []).filter(m => m.status === "pending");
check("MEM-01 대기 명단에 두 명", pending.length === 2, `${pending.length}명`);
const m1 = pending.find(m => m.student_no === 7), m2 = pending.find(m => m.student_no === 8);
r = await tA("POST", `/teacher/classes/${classId}/members/decide`, { ids: [m1.id], action: "approve" });
check("MEM-02 승인", r.status === 200, `status ${r.status}`);
r = await tA("POST", `/teacher/classes/${classId}/members/decide`, { ids: [m1.id], action: "approve" });
check("MEM-03 두 번 승인 차단", r.status === 409, r.json?.error);
r = await tA("POST", `/teacher/classes/${classId}/members/decide`, { ids: [m2.id], action: "reject" });
check("MEM-04 거절", r.status === 200, `status ${r.status}`);
r = await s1("GET", "/student/home");
const home = JSON.stringify(r.json);
check("MEM-05 승인 후 학생 홈·알림", home.includes("approved") && home.includes("학급 가입이 승인됐어요"));
r = await s2("GET", "/student/home");
check("MEM-06 거절된 학생 홈", r.status === 200 && JSON.stringify(r.json).includes("rejected"), JSON.stringify(r.json).slice(0, 80));

// 코드 재발급 · 막기
r = await tA("POST", `/teacher/classes/${classId}/invite`, { days: 1 });
const code2 = r.json?.code ?? r.json?.invite?.code;
check("INV-03 재발급", r.status === 200 && !!code2 && code2 !== code1, `${code1}→${code2}`);
r = await client()("GET", `/invites/${code1}`);
check("INV-04 이전 코드 차단", r.json?.valid !== true, `status ${r.status}`);
r = await client()("POST", "/auth/signup/student", { name: "예시 학생3", studentNo: 9, loginId: `s3_${tag}`, password: "test1234", code: code1 });
check("INV-05 이전 코드로 가입 불가", r.status === 400, r.json?.error);
r = await tA("POST", `/teacher/classes/${classId}/invite/expire`, {});
r = await client()("GET", `/invites/${code2}`);
check("INV-06 코드 막기", r.json?.valid !== true, `status ${r.status}`);

// 로그인
const s1b = client();
r = await s1b("POST", "/auth/login", { kind: "student", id: `s1_${tag}`, password: "wrong999" });
check("ACC-04 틀린 비밀번호", r.status === 401 || r.status === 400, r.json?.error);
r = await s1b("POST", "/auth/login", { kind: "student", id: `s1_${tag}`, password: "test1234" });
check("ACC-05 학생 로그인", r.status === 200, `status ${r.status}`);
r = await client()("POST", "/auth/login", { kind: "teacher", id: `a${tag}@example.com`, password: "test1234" });
check("ACC-06 교사 로그인", r.status === 200, `status ${r.status}`);
r = await s1b("POST", "/auth/logout", {});
r = await s1b("GET", "/student/home");
check("ACC-07 로그아웃 후 차단", r.status === 401);

// 개인정보 · 크레딧 원칙 (DB 구조)
const cols = sql("SELECT name FROM pragma_table_info('users')");
check("PRV-01 학생 연락처·생년월일 칸 없음", !/phone|birth|address|photo/i.test(cols));
let blocked = false;
try { sql(`INSERT INTO credit_transactions (class_id, user_id, amount, reason) VALUES (${classId}, 1, 10, 'reconciliation')`); } catch { blocked = true; }
check("PRV-02 화해 사유 크레딧 지급 불가", blocked);

// 체험
const d = client();
r = await d("POST", "/demo/start", { as: "teacher" });
check("DEMO-01 체험 시작", r.status === 200 || r.status === 201, `status ${r.status}`);
r = await d("GET", "/demo/personas");
const personas = r.json?.personas ?? [];
check("DEMO-02 인물 목록", personas.length >= 11, `${personas.length}명`);
const stu = personas.find(p => p.role === "student");
r = await d("POST", "/demo/switch", { userId: stu?.id });
r = await d("GET", "/student/home");
check("DEMO-03 학생으로 바꾸기", r.status === 200, `status ${r.status}`);
const realId = Number(sql(`SELECT id FROM users WHERE login_id='s1_${tag}'`).match(/"id":\s*(\d+)/)?.[1]);
r = await d("POST", "/demo/switch", { userId: realId });
check("DEMO-06 체험 밖 계정으로 바꾸기 차단", r.status === 404, r.json?.error);
r = await client()("GET", "/schools?q=" + encodeURIComponent("체험"));
check("DEMO-04 학교 검색에 체험 학교 없음", !JSON.stringify(r.json).includes("체험"), JSON.stringify(r.json).slice(0, 80));
r = await d("POST", "/demo/end", {});
r = await d("GET", "/student/home");
check("DEMO-05 체험 끝내기 후 정리", r.status === 401, `status ${r.status}`);

sql("DELETE FROM rate_limit");
console.log(results.join("\n"));
console.log(`\n${results.filter(x => x.startsWith("PASS")).length}/${results.length} PASS`);
if (results.some(x => x.startsWith("FAIL"))) process.exitCode = 1;
