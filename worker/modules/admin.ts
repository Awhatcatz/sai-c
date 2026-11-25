// 서비스 관리자(운영자) API. ADMIN_TOKEN 이 맞을 때만 열리고, 틀리면 존재 자체를 숨긴다(404).
// 비공개 화해 신호·매칭 표는 이 파일 어디에서도 읽지 않는다 — 관리자도 열람할 수 없다.
import { Hono } from "hono";
import type { AppEnv } from "../core/auth";
import { logActivity } from "../core/access";
import { bad, body, ownerOnly } from "../lib";

const r = new Hono<AppEnv>();
r.use("*", ownerOnly);

r.get("/overview", async c => {
  const row = await c.env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM schools WHERE sandbox_id IS NULL) AS schools,
            (SELECT COUNT(*) FROM classes c JOIN schools s ON s.id = c.school_id WHERE s.sandbox_id IS NULL AND c.status = 'active') AS classes,
            (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND sandbox_id IS NULL) AS teachers,
            (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND sandbox_id IS NULL AND teacher_status = 'pending') AS pending_teachers,
            (SELECT COUNT(*) FROM users WHERE role = 'student' AND sandbox_id IS NULL) AS students,
            (SELECT COUNT(*) FROM demo_sandboxes WHERE expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) AS live_demos`,
  ).first();
  return c.json({ overview: row });
});

r.get("/teachers", async c => {
  const status = c.req.query("status");
  const filter = status === "pending" || status === "verified" || status === "rejected" ? "AND u.teacher_status = ?" : "";
  const stmt = c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.teacher_status, u.created_at, s.name AS school_name,
            (SELECT COUNT(*) FROM classes WHERE teacher_id = u.id AND status = 'active') AS classes
       FROM users u LEFT JOIN schools s ON s.id = u.school_id
      WHERE u.role = 'teacher' AND u.sandbox_id IS NULL ${filter}
      ORDER BY u.teacher_status = 'pending' DESC, u.id DESC LIMIT 300`,
  );
  const { results } = await (filter ? stmt.bind(status) : stmt).all();
  return c.json({ rows: results });
});

r.post("/teachers/:id", async c => {
  const b = await body(c);
  const next = b.action === "verify" ? "verified" : b.action === "reject" ? "rejected" : null;
  if (!next) return bad(c, "verify 또는 reject 만 할 수 있어요");
  const id = Number(c.req.param("id"));
  const res = await c.env.DB.prepare("UPDATE users SET teacher_status = ? WHERE id = ? AND role = 'teacher' AND sandbox_id IS NULL").bind(next, id).run();
  if (!res.meta.changes) return bad(c, "교사 계정을 찾을 수 없어요", 404);
  await c.env.DB.prepare("INSERT INTO notifications (user_id, kind, title, body) VALUES (?, 'teacher.verify', ?, ?)")
    .bind(id, next === "verified" ? "교사 인증이 끝났어요" : "교사 인증이 반려됐어요", next === "verified" ? "이제 학급을 개설할 수 있어요." : "소속 학교 정보를 확인한 뒤 서비스 관리자에게 문의해 주세요.").run();
  await logActivity(c.env, { role: "admin", action: `teacher.${next}`, targetType: "user", targetId: id });
  return c.json({ ok: true, status: next });
});

r.get("/classes", async c => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.school_year, c.grade, c.class_no, s.name AS school_name, u.name AS teacher_name, c.created_at,
            (SELECT COUNT(*) FROM class_members WHERE class_id = c.id AND status = 'approved') AS students
       FROM classes c JOIN schools s ON s.id = c.school_id JOIN users u ON u.id = c.teacher_id
      WHERE s.sandbox_id IS NULL AND c.status = 'active' ORDER BY c.id DESC LIMIT 300`,
  ).all();
  return c.json({ rows: results });
});

r.get("/logs", async c => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, actor_role, action, target_type, target_id, created_at FROM activity_logs WHERE sandbox_id IS NULL ORDER BY id DESC LIMIT 100",
  ).all();
  return c.json({ rows: results });
});

export default r;
