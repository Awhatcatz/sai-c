// 학생: 홈(우리 반 온도·개인 온도·미션·알림) · 다른 학급 코드로 가입 신청
import { Hono } from "hono";
import { type AppEnv, requireRole, requireUser } from "../core/auth";
import { classLabel, logActivity, studentCurrentClass, studentMemberships } from "../core/access";
import { classSnapshot, studentSnapshot } from "../core/temperature";
import { bad, body, intIn, normalizeCode } from "../lib";
import { findInvite } from "./invites";

const r = new Hono<AppEnv>();
r.use("*", requireUser, requireRole("student"));

r.get("/home", async c => {
  const u = c.get("user");
  const cls = await studentCurrentClass(c.env, u.id);
  if (!cls) {
    const memberships = await studentMemberships(c.env, u.id);
    return c.json({
      state: "waiting",
      memberships: memberships.map(m => ({ status: m.member_status, schoolName: m.school_name, label: `${m.school_year}학년도 ${classLabel(m)}`, requestedAt: m.requested_at })),
    });
  }
  const snap = await classSnapshot(c.env, cls.class_id);
  const me = await studentSnapshot(c.env, snap.season?.id ?? null, snap.season?.personal_target_credits ?? 0, u.id);
  const mission = snap.season
    ? await c.env.DB.prepare(
        "SELECT id, title, description, kind, reward_credits, est_minutes, status FROM missions WHERE season_id = ? AND user_id = ? AND status IN ('active', 'submitted', 'revise') ORDER BY id DESC LIMIT 1",
      ).bind(snap.season.id, u.id).first()
    : null;
  const { results: notifications } = await c.env.DB.prepare(
    "SELECT id, kind, title, body, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 5",
  ).bind(u.id).all();
  return c.json({
    state: "ready",
    class: { id: cls.class_id, schoolName: cls.school_name, label: classLabel(cls), schoolYear: cls.school_year, demo: cls.school_source === "demo" },
    season: snap.season ? { title: snap.season.title, startsOn: snap.season.starts_on, endsOn: snap.season.ends_on, personalTarget: snap.season.personal_target_credits } : null,
    classTemp: snap.temperature, classCredits: snap.credits, classTarget: snap.target, participants: snap.participants,
    milestones: snap.milestones,
    myTemp: me.temperature, seasonCredits: me.seasonCredits, totalCredits: me.totalCredits,
    mission, notifications,
  });
});

/** 새 학년 · 새 학급: 같은 계정으로 다른 학급 코드를 넣어 가입 신청한다. */
r.post("/join", async c => {
  const u = c.get("user");
  const b = await body(c);
  const studentNo = intIn(b.studentNo, 1, 99, 0);
  if (!studentNo) return bad(c, "출석번호를 1~99 사이 숫자로 적어 주세요");
  const invite = await findInvite(c.env, normalizeCode(b.code));
  if (!invite || (invite.sandbox_id ?? null) !== (u.sandbox_id ?? null)) return bad(c, "학급 코드가 맞지 않거나 기간이 끝났어요");
  const existing = await c.env.DB.prepare("SELECT id, status FROM class_members WHERE class_id = ? AND user_id = ?").bind(invite.class_id, u.id).first<{ id: number; status: string }>();
  if (existing && (existing.status === "pending" || existing.status === "approved")) return bad(c, existing.status === "approved" ? "이미 들어와 있는 학급이에요" : "이미 가입 신청을 보냈어요. 선생님 승인을 기다려 주세요", 409);
  if (existing) {
    await c.env.DB.prepare("UPDATE class_members SET status = 'pending', student_no = ?, requested_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), decided_at = NULL, decided_by = NULL WHERE id = ?").bind(studentNo, existing.id).run();
  } else {
    await c.env.DB.prepare("INSERT INTO class_members (class_id, user_id, student_no) VALUES (?, ?, ?)").bind(invite.class_id, u.id, studentNo).run();
  }
  await logActivity(c.env, { actorId: u.id, role: "student", action: "class.join_request", targetType: "class", targetId: invite.class_id, classId: invite.class_id, sandboxId: u.sandbox_id });
  return c.json({ ok: true, schoolName: invite.school_name, label: `${invite.school_year}학년도 ${classLabel(invite)}` }, 201);
});

export default r;
