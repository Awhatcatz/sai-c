// 회원가입 · 로그인 · 로그아웃 · 내 정보 · 탈퇴
import { Hono } from "hono";
import { type AppEnv, currentUser, endSession, hashPassword, requireUser, startSession, verifyPassword } from "../core/auth";
import { logActivity, studentMemberships, teacherClasses } from "../core/access";
import { bad, body, clean, intIn, normalizeCode, nowIso, rateLimited } from "../lib";
import { findInvite } from "./invites";

const r = new Hono<AppEnv>();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LOGIN_ID = /^[a-z0-9_]{4,20}$/;
function passwordProblem(pw: string) {
  if (pw.length < 8) return "비밀번호는 8자 이상으로 정해 주세요";
  if (pw.length > 64) return "비밀번호는 64자 이하로 정해 주세요";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "비밀번호에 영문과 숫자를 함께 넣어 주세요";
  return "";
}

r.post("/signup/teacher", async c => {
  if (await rateLimited(c, "signup", 10, 600)) return bad(c, "잠시 뒤 다시 시도해 주세요", 429);
  const b = await body(c);
  const name = clean(b.name, 20), email = clean(b.email, 120).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
  const schoolId = intIn(b.schoolId, 1, 1e9, 0);
  if (!name) return bad(c, "이름을 적어 주세요");
  if (!EMAIL.test(email)) return bad(c, "이메일 주소를 다시 확인해 주세요");
  const pwErr = passwordProblem(password);
  if (pwErr) return bad(c, pwErr);
  const school = await c.env.DB.prepare("SELECT id FROM schools WHERE id = ? AND sandbox_id IS NULL").bind(schoolId).first();
  if (!school) return bad(c, "학교를 목록에서 골라 주세요");
  if (await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first()) return bad(c, "이미 가입된 이메일이에요. 로그인해 주세요", 409);
  const user = await c.env.DB.prepare(
    "INSERT INTO users (role, name, email, password_hash, school_id, teacher_status) VALUES ('teacher', ?, ?, ?, ?, 'pending') RETURNING id",
  ).bind(name, email, await hashPassword(password), schoolId).first<{ id: number }>();
  await logActivity(c.env, { actorId: user!.id, role: "teacher", action: "teacher.signup", targetType: "user", targetId: user!.id });
  await startSession(c, user!.id);
  return c.json({ ok: true }, 201);
});

r.post("/signup/student", async c => {
  if (await rateLimited(c, "signup", 10, 600)) return bad(c, "잠시 뒤 다시 시도해 주세요", 429);
  const b = await body(c);
  const name = clean(b.name, 20), loginId = clean(b.loginId, 20).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
  const studentNo = intIn(b.studentNo, 1, 99, 0);
  const code = normalizeCode(b.code);
  if (!name) return bad(c, "이름을 적어 주세요");
  if (!studentNo) return bad(c, "출석번호를 1~99 사이 숫자로 적어 주세요");
  if (!LOGIN_ID.test(loginId)) return bad(c, "아이디는 영문 소문자·숫자·밑줄(_)로 4~20자예요");
  const pwErr = passwordProblem(password);
  if (pwErr) return bad(c, pwErr);
  const invite = await findInvite(c.env, code);
  if (!invite || invite.sandbox_id) return bad(c, "학급 코드가 맞지 않거나 기간이 끝났어요. 선생님께 새 코드를 받아 주세요");
  if (await c.env.DB.prepare("SELECT 1 FROM users WHERE login_id = ?").bind(loginId).first()) return bad(c, "이미 쓰고 있는 아이디예요. 다른 아이디를 정해 주세요", 409);
  const user = await c.env.DB.prepare(
    "INSERT INTO users (role, name, login_id, password_hash) VALUES ('student', ?, ?, ?) RETURNING id",
  ).bind(name, loginId, await hashPassword(password)).first<{ id: number }>();
  await c.env.DB.prepare("INSERT INTO class_members (class_id, user_id, student_no) VALUES (?, ?, ?)").bind(invite.class_id, user!.id, studentNo).run();
  await logActivity(c.env, { actorId: user!.id, role: "student", action: "class.join_request", targetType: "class", targetId: invite.class_id, classId: invite.class_id });
  await startSession(c, user!.id);
  return c.json({ ok: true }, 201);
});

r.post("/login", async c => {
  if (await rateLimited(c, "login", 20, 600)) return bad(c, "로그인 시도가 많아요. 10분 뒤 다시 시도해 주세요", 429);
  const b = await body(c);
  const kind = b.kind === "teacher" ? "teacher" : "student";
  const id = clean(b.id, 120).toLowerCase(), password = typeof b.password === "string" ? b.password : "";
  const user = await c.env.DB.prepare(
    `SELECT id, password_hash, status FROM users WHERE role = ? AND ${kind === "teacher" ? "email" : "login_id"} = ? AND sandbox_id IS NULL`,
  ).bind(kind, id).first<{ id: number; password_hash: string | null; status: string }>();
  // 계정이 없을 때도 같은 시간이 걸리도록 비교를 한 번 한다.
  const ok = await verifyPassword(user?.password_hash ?? "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAA", password);
  if (!user || !ok) return bad(c, kind === "teacher" ? "이메일 또는 비밀번호가 맞지 않아요" : "아이디 또는 비밀번호가 맞지 않아요", 400);
  if (user.status !== "active") return bad(c, "이용이 제한된 계정이에요. 학교나 서비스 관리자에게 문의해 주세요", 403);
  await startSession(c, user.id);
  return c.json({ ok: true });
});

r.post("/logout", async c => {
  await endSession(c);
  return c.json({ ok: true });
});

r.get("/me", async c => {
  const s = await currentUser(c);
  if (!s) return c.json({ user: null });
  const u = s.user;
  const school = u.school_id ? await c.env.DB.prepare("SELECT id, name, level, source FROM schools WHERE id = ?").bind(u.school_id).first() : null;
  if (u.role === "student") {
    const memberships = await studentMemberships(c.env, u.id);
    return c.json({ user: u, school, memberships: memberships.map(m => ({ id: m.member_id, classId: m.class_id, status: m.member_status, studentNo: m.student_no, schoolName: m.school_name, schoolYear: m.school_year, grade: m.grade, classNo: m.class_no, name: m.name })) });
  }
  const { results } = await teacherClasses(c.env, u.id);
  return c.json({ user: u, school, classes: results.map(k => ({ id: k.id, schoolYear: k.school_year, grade: k.grade, classNo: k.class_no, name: k.name, schoolName: k.school_name })) });
});

/** 회원 탈퇴: 비밀번호를 한 번 더 받는다. 학생은 가입·크레딧·신호 기록까지 함께 지워진다. */
r.delete("/me", requireUser, async c => {
  const u = c.get("user");
  if (u.sandbox_id) return bad(c, "체험 계정은 「체험 끝내기」로 정리돼요");
  const b = await body(c);
  const row = await c.env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(u.id).first<{ password_hash: string }>();
  if (!(await verifyPassword(row?.password_hash ?? null, typeof b.password === "string" ? b.password : ""))) return bad(c, "비밀번호가 맞지 않아요");
  if (u.role === "teacher") {
    const n = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM classes WHERE teacher_id = ? AND status = 'active'").bind(u.id).first<{ n: number }>();
    if (n && n.n > 0) return bad(c, "담당 학급이 남아 있어요. 학급을 먼저 정리한 뒤 탈퇴해 주세요", 409);
  }
  await logActivity(c.env, { actorId: null, role: u.role, action: "user.withdraw", targetType: "user", targetId: u.id, meta: { at: nowIso() } });
  await endSession(c);
  await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(u.id).run();
  return c.json({ ok: true });
});

export default r;
