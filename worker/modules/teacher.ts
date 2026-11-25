// 담임교사: 학급 개설 · 가입 코드 · 가입 승인 · 대시보드. 모든 경로가 「본인 학급인지」를 먼저 확인한다.
import { Hono } from "hono";
import { type AppEnv, requireRole, requireUser } from "../core/auth";
import { classLabel, logActivity, teacherClass, teacherClasses } from "../core/access";
import { classHistory, classSnapshot } from "../core/temperature";
import { bad, body, clean, daysFromNow, intIn, nowIso, randomCode } from "../lib";

const r = new Hono<AppEnv>();
r.use("*", requireUser, requireRole("teacher"));

const INVITE_DAYS = [1, 7, 14, 30];

async function issueInvite(c: { env: AppEnv["Bindings"] }, classId: number, by: number, days: number) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(6);
    try {
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE class_invites SET revoked_at = ? WHERE class_id = ? AND revoked_at IS NULL").bind(nowIso(), classId),
        c.env.DB.prepare("INSERT INTO class_invites (class_id, code, created_by, expires_at) VALUES (?, ?, ?, ?)").bind(classId, code, by, daysFromNow(days)),
      ]);
      return code;
    } catch (e) {
      if (!String(e).includes("UNIQUE")) throw e; // 드물게 같은 코드가 나오면 다시 뽑는다
    }
  }
  throw new Error("invite code collision");
}

function activeInvite(c: { env: AppEnv["Bindings"] }, classId: number) {
  return c.env.DB.prepare(
    "SELECT code, created_at, expires_at FROM class_invites WHERE class_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY id DESC LIMIT 1",
  ).bind(classId, nowIso()).first<{ code: string; created_at: string; expires_at: string }>();
}

r.get("/classes", async c => {
  const u = c.get("user");
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.school_year, c.grade, c.class_no, c.name, s.name AS school_name,
            SUM(CASE WHEN m.status = 'approved' THEN 1 ELSE 0 END) AS students,
            SUM(CASE WHEN m.status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM classes c JOIN schools s ON s.id = c.school_id LEFT JOIN class_members m ON m.class_id = c.id
      WHERE c.teacher_id = ? AND c.status = 'active'
      GROUP BY c.id ORDER BY c.school_year DESC, c.grade, c.class_no`,
  ).bind(u.id).all();
  return c.json({ classes: results });
});

r.post("/classes", async c => {
  const u = c.get("user");
  if (u.teacher_status !== "verified") return bad(c, "교사 인증이 끝나면 학급을 만들 수 있어요", 403);
  if (!u.school_id) return bad(c, "소속 학교가 없어요. 서비스 관리자에게 문의해 주세요");
  const school = await c.env.DB.prepare("SELECT level FROM schools WHERE id = ?").bind(u.school_id).first<{ level: string }>();
  const b = await body(c);
  const year = new Date().getFullYear();
  const schoolYear = intIn(b.schoolYear, year - 1, year + 1, year);
  const grade = intIn(b.grade, 1, school?.level === "elementary" ? 6 : 3, 0);
  const classNo = intIn(b.classNo, 1, 30, 0);
  const name = clean(b.name, 30);
  if (!grade || !classNo) return bad(c, "학년과 반을 골라 주세요");
  const days = INVITE_DAYS.includes(Number(b.inviteDays)) ? Number(b.inviteDays) : 14;
  let created: { id: number } | null;
  try {
    created = await c.env.DB.prepare(
      "INSERT INTO classes (school_id, teacher_id, school_year, grade, class_no, name) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
    ).bind(u.school_id, u.id, schoolYear, grade, classNo, name).first<{ id: number }>();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return bad(c, `${schoolYear}학년도 ${grade}학년 ${classNo}반은 이미 개설돼 있어요`, 409);
    throw e;
  }
  const code = await issueInvite(c, created!.id, u.id, days);
  await logActivity(c.env, { actorId: u.id, role: "teacher", action: "class.create", targetType: "class", targetId: created!.id, classId: created!.id, sandboxId: u.sandbox_id });
  return c.json({ id: created!.id, code }, 201);
});

r.get("/classes/:id", async c => {
  const u = c.get("user");
  const cls = await teacherClass(c.env, u.id, Number(c.req.param("id")));
  if (!cls) return bad(c, "학급을 찾을 수 없어요", 404);
  const { results: members } = await c.env.DB.prepare(
    `SELECT m.id, m.student_no, m.status, m.requested_at, m.decided_at, u.name, u.login_id
       FROM class_members m JOIN users u ON u.id = m.user_id
      WHERE m.class_id = ? AND m.status IN ('pending', 'approved')
      ORDER BY m.status = 'pending' DESC, m.student_no, u.name`,
  ).bind(cls.id).all();
  return c.json({ class: { ...cls, label: classLabel(cls) }, invite: await activeInvite(c, cls.id), members });
});

r.patch("/classes/:id", async c => {
  const u = c.get("user");
  const cls = await teacherClass(c.env, u.id, Number(c.req.param("id")));
  if (!cls) return bad(c, "학급을 찾을 수 없어요", 404);
  const b = await body(c);
  await c.env.DB.prepare("UPDATE classes SET name = ? WHERE id = ?").bind(clean(b.name, 30), cls.id).run();
  return c.json({ ok: true });
});

/** 코드 재발급: 이전 코드는 바로 막힌다. */
r.post("/classes/:id/invite", async c => {
  const u = c.get("user");
  const cls = await teacherClass(c.env, u.id, Number(c.req.param("id")));
  if (!cls) return bad(c, "학급을 찾을 수 없어요", 404);
  const b = await body(c);
  const days = INVITE_DAYS.includes(Number(b.days)) ? Number(b.days) : 14;
  const code = await issueInvite(c, cls.id, u.id, days);
  await logActivity(c.env, { actorId: u.id, role: "teacher", action: "invite.reissue", targetType: "class", targetId: cls.id, classId: cls.id, sandboxId: u.sandbox_id });
  return c.json({ invite: await activeInvite(c, cls.id), code });
});

/** 코드 만료: 새로 발급하기 전까지 아무도 가입 신청을 할 수 없다. */
r.post("/classes/:id/invite/expire", async c => {
  const u = c.get("user");
  const cls = await teacherClass(c.env, u.id, Number(c.req.param("id")));
  if (!cls) return bad(c, "학급을 찾을 수 없어요", 404);
  await c.env.DB.prepare("UPDATE class_invites SET revoked_at = ? WHERE class_id = ? AND revoked_at IS NULL").bind(nowIso(), cls.id).run();
  await logActivity(c.env, { actorId: u.id, role: "teacher", action: "invite.expire", targetType: "class", targetId: cls.id, classId: cls.id, sandboxId: u.sandbox_id });
  return c.json({ invite: null });
});

/** 가입 승인·거절·내보내기. 한 명이든 여러 명이든 같은 경로. 다른 학급 학생 id 는 조건에서 걸러진다. */
r.post("/classes/:id/members/decide", async c => {
  const u = c.get("user");
  const cls = await teacherClass(c.env, u.id, Number(c.req.param("id")));
  if (!cls) return bad(c, "학급을 찾을 수 없어요", 404);
  const b = await body(c);
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(n => Number.isInteger(n) && n > 0).slice(0, 60);
  const action = String(b.action);
  const move = { approve: ["pending", "approved"], reject: ["pending", "rejected"], remove: ["approved", "left"] }[action];
  if (!move || !ids.length) return bad(c, "처리할 학생을 골라 주세요");
  const marks = ids.map(() => "?").join(",");
  const { results: targets } = await c.env.DB.prepare(
    `SELECT id, user_id FROM class_members WHERE class_id = ? AND status = ? AND id IN (${marks})`,
  ).bind(cls.id, move[0], ...ids).all<{ id: number; user_id: number }>();
  if (!targets.length) return bad(c, "이미 처리된 학생이에요", 409);
  const now = nowIso();
  const label = `${cls.school_name} ${classLabel(cls)}`;
  const stmts = targets.map(t => c.env.DB.prepare("UPDATE class_members SET status = ?, decided_at = ?, decided_by = ? WHERE id = ? AND status = ?").bind(move[1], now, u.id, t.id, move[0]));
  if (action === "approve") {
    for (const t of targets) stmts.push(c.env.DB.prepare("INSERT INTO notifications (user_id, class_id, kind, title, body) VALUES (?, ?, 'class.approved', ?, ?)").bind(t.user_id, cls.id, "학급 가입이 승인됐어요", `${label}에 들어왔어요. 반가워요!`));
  }
  await c.env.DB.batch(stmts);
  await logActivity(c.env, { actorId: u.id, role: "teacher", action: `member.${action}`, targetType: "class", targetId: cls.id, classId: cls.id, sandboxId: u.sandbox_id, meta: { count: targets.length } });
  return c.json({ changed: targets.length });
});

r.get("/classes/:id/dashboard", async c => {
  const u = c.get("user");
  const cls = await teacherClass(c.env, u.id, Number(c.req.param("id")));
  if (!cls) return bad(c, "학급을 찾을 수 없어요", 404);
  const snap = await classSnapshot(c.env, cls.id);
  const counts = await c.env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM class_members WHERE class_id = ?1 AND status = 'approved') AS students,
            (SELECT COUNT(*) FROM class_members WHERE class_id = ?1 AND status = 'pending') AS pending_members,
            (SELECT COUNT(*) FROM missions WHERE season_id = ?2 AND status = 'approved') AS missions_done,
            (SELECT COUNT(*) FROM mission_submissions s JOIN missions m ON m.id = s.mission_id WHERE m.season_id = ?2 AND s.status = 'pending') AS pending_submissions`,
  ).bind(cls.id, snap.season?.id ?? -1).first();
  return c.json({
    class: { ...cls, label: classLabel(cls) },
    counts,
    season: snap.season ? { id: snap.season.id, title: snap.season.title, startsOn: snap.season.starts_on, endsOn: snap.season.ends_on, personalTarget: snap.season.personal_target_credits } : null,
    temperature: snap.temperature, credits: snap.credits, target: snap.target, participants: snap.participants,
    milestones: snap.milestones,
    history: snap.season ? await classHistory(c.env, snap.season.id) : [],
  });
});

// 첫 화면에서 학급을 고를 수 있도록 내 학급 이름만 따로.
r.get("/classes-brief", async c => {
  const { results } = await teacherClasses(c.env, c.get("user").id);
  return c.json({ classes: results.map(k => ({ id: k.id, label: `${k.school_year}학년도 ${classLabel(k)}`, school: k.school_name })) });
});

export default r;
