// 심사용 체험 모드. 「체험 시작」마다 가상 학교·교사·학생을 새로 만들어 그 사람만 쓰게 한다.
// - 체험 계정은 비밀번호가 없어 일반 로그인으로 들어올 수 없다.
// - 실제 학교 검색·가입 코드·관리자 통계는 sandbox_id 가 있는 행을 보지 않는다.
// - 6시간이 지난 체험 공간은 다음 체험 시작 때 통째로 지워진다(ON DELETE CASCADE).
import { Hono } from "hono";
import { classTargetCredits } from "../../src/shared/temperature";
import { PRESET_MISSIONS } from "../../src/shared/missions";
import { type AppEnv, currentUser, endSession, requireUser, startSession } from "../core/auth";
import { logActivity } from "../core/access";
import { todayKst } from "../core/temperature";
import { bad, body, daysFromNow, intIn, nowIso, randomCode, rateLimited } from "../lib";

const r = new Hono<AppEnv>();
const HOURS = 6;

// 가상 인물. 실제 인물과 관계없다. 화면에도 「가상」 표시가 붙는다.
const STUDENTS = ["강도윤", "김서연", "박지호", "이하준", "최유나", "정민재", "한예린", "윤시우", "오채원", "임건우"];
const PENDING = ["서지안", "문태오"];
const CREDITS = [40, 50, 60, 30, 50, 40, 20, 40, 30, 20]; // 합 380 → 학급 38°C
const CURVE = [0.06, 0.15, 0.26, 0.47, 0.63, 0.82, 1]; // 지난 7일 누적 비율

r.post("/start", async c => {
  if (await rateLimited(c, "demo", 30, 3600)) return bad(c, "체험을 너무 자주 시작했어요. 잠시 뒤 다시 시도해 주세요", 429);
  const db = c.env.DB;
  await db.prepare("DELETE FROM demo_sandboxes WHERE expires_at < ?").bind(nowIso()).run();
  const b = await body(c);
  const as = b.as === "student" ? "student" : "teacher";

  const sid = crypto.randomUUID();
  await db.prepare("INSERT INTO demo_sandboxes (id, expires_at) VALUES (?, ?)").bind(sid, new Date(Date.now() + HOURS * 36e5).toISOString()).run();
  const school = await db.prepare("INSERT INTO schools (name, level, region, district, source, sandbox_id) VALUES ('체험중학교 (가상)', 'middle', '체험시', '체험구', 'demo', ?) RETURNING id").bind(sid).first<{ id: number }>();
  const teacher = await db.prepare("INSERT INTO users (role, name, school_id, teacher_status, sandbox_id) VALUES ('teacher', '김하늘 선생님 (가상)', ?, 'verified', ?) RETURNING id").bind(school!.id, sid).first<{ id: number }>();
  const year = Number(todayKst().slice(0, 4));
  const cls = await db.prepare("INSERT INTO classes (school_id, teacher_id, school_year, grade, class_no) VALUES (?, ?, ?, 2, 3) RETURNING id").bind(school!.id, teacher!.id, year).first<{ id: number }>();
  const classId = cls!.id;

  // 쿼리 수를 줄이려고 여러 줄을 한 번에 넣는다. 값은 전부 이 파일의 상수와 서버가 만든 숫자다(사용자 입력 없음).
  const q = (v: string | number | null) => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);
  const rows = (list: (string | number | null)[][]) => list.map(r => `(${r.map(q).join(", ")})`).join(", ");
  const all = [...STUDENTS, ...PENDING];
  await db.prepare(`INSERT INTO users (role, name, nickname, sandbox_id) VALUES ${rows(all.map(n => ["student", n, n.slice(1), sid]))}`).run();
  const { results: made } = await db.prepare("SELECT id, name FROM users WHERE sandbox_id = ? AND role = 'student'").bind(sid).all<{ id: number; name: string }>();
  const ids = all.map(n => made.find(m => m.name === n)!.id);
  const approved = ids.slice(0, STUDENTS.length);

  const target = 100;
  const classTarget = classTargetCredits(approved.length, target);
  const season = await db.prepare(
    `INSERT INTO manitto_seasons (class_id, title, starts_on, ends_on, status, personal_target_credits, class_target_credits, created_by, started_at)
     VALUES (?, '2학기 마니또 시즌 (체험)', ?, ?, 'active', ?, ?, ?, ?) RETURNING id`,
  ).bind(classId, todayKst(-6), todayKst(8), target, classTarget, teacher!.id, nowIso()).first<{ id: number }>();
  const seasonId = season!.id;
  const t = teacher!.id, now = nowIso();
  const ago = (h: number) => new Date(Date.now() - h * 36e5).toISOString();

  const missions: (string | number | null)[][] = [];
  approved.forEach((id, i) => {
    const done = CREDITS[i] / 10;
    for (let k = 0; k < done; k++) {
      const p = PRESET_MISSIONS[(i + k) % PRESET_MISSIONS.length];
      missions.push([seasonId, id, p.title, p.description, "basic", 10, p.minutes, "approved"]);
    }
    const cur = PRESET_MISSIONS[(i + done) % PRESET_MISSIONS.length];
    missions.push([seasonId, id, cur.title, cur.description, cur.kind, cur.kind === "special" ? 20 : 10, cur.minutes, i < 3 ? "submitted" : "active"]);
  });
  const current = (i: number) => PRESET_MISSIONS[(i + CREDITS[i] / 10) % PRESET_MISSIONS.length].title;
  const total = CREDITS.reduce((a, x) => a + x, 0);

  await db.batch([
    db.prepare("INSERT INTO class_invites (class_id, code, created_by, expires_at) VALUES (?, ?, ?, ?)").bind(classId, randomCode(6), t, daysFromNow(1)),
    db.prepare(`INSERT INTO class_members (class_id, user_id, student_no, status, decided_at, decided_by) VALUES ${rows(ids.map((id, i) => i < STUDENTS.length ? [classId, id, i + 1, "approved", now, t] : [classId, id, i + 1, "pending", null, null]))}`),
    db.prepare(`INSERT INTO season_participants (season_id, user_id) VALUES ${rows(approved.map(id => [seasonId, id]))}`),
    db.prepare(`INSERT INTO manitto_pairs (season_id, giver_id, receiver_id) VALUES ${rows(approved.map((id, i) => [seasonId, id, approved[(i + 3) % approved.length]]))}`),
    db.prepare(`INSERT INTO missions (season_id, user_id, title, description, kind, reward_credits, est_minutes, status) VALUES ${rows(missions)}`),
    db.prepare(`INSERT INTO credit_transactions (class_id, season_id, user_id, amount, reason, created_by) VALUES ${rows(approved.map((id, i) => [classId, seasonId, id, CREDITS[i], "demo_seed", t]))}`),
    db.prepare(`INSERT INTO notifications (user_id, class_id, kind, title, body, created_at) VALUES ${rows(approved.flatMap((id, i) => [
      [id, classId, "mission.new", "새 미션이 도착했어요", current(i), ago(2)],
      [id, classId, "credit.earned", "미션이 승인됐어요", "+10 크레딧 · 우리 반 온도가 올랐어요", ago(26)],
    ]))}`),
    db.prepare(`INSERT INTO temperature_history (class_id, season_id, subject, temperature, credits, recorded_on) VALUES ${rows(CURVE.map((f, d) => {
      const credits = Math.round(total * f);
      return [classId, seasonId, "class", Math.round((credits / classTarget) * 1000) / 10, credits, todayKst(d - 6)];
    }))}`),
    // 제출 대기 중인 미션(교사 화면의 「승인 대기」)
    db.prepare(`INSERT INTO mission_submissions (mission_id, user_id, content)
      SELECT id, user_id, '쉬는 시간에 친구에게 먼저 다가가서 오늘 발표 멋있었다고 말했어요. 친구가 웃으면서 고맙다고 했어요.'
        FROM missions WHERE season_id = ? AND status = 'submitted'`).bind(seasonId),
  ]);

  await logActivity(c.env, { role: "demo", action: "demo.start", targetType: "sandbox", targetId: sid, classId, sandboxId: sid });
  await startSession(c, as === "teacher" ? teacher!.id : approved[1], sid);
  return c.json({ ok: true, as }, 201);
});

/** 같은 체험 공간 안의 인물 목록(교사 1, 학생, 승인 대기 학생). */
r.get("/personas", requireUser, async c => {
  const u = c.get("user");
  if (!u.sandbox_id) return bad(c, "체험 모드가 아니에요", 403);
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.role, u.name, m.status AS member_status, m.student_no
       FROM users u LEFT JOIN class_members m ON m.user_id = u.id
      WHERE u.sandbox_id = ? ORDER BY u.role DESC, m.student_no`,
  ).bind(u.sandbox_id).all();
  const box = await c.env.DB.prepare("SELECT expires_at FROM demo_sandboxes WHERE id = ?").bind(u.sandbox_id).first<{ expires_at: string }>();
  return c.json({ me: u.id, personas: results, expiresAt: box?.expires_at });
});

/** 인물 바꾸기: 같은 체험 공간 안에서만. */
r.post("/switch", requireUser, async c => {
  const u = c.get("user");
  if (!u.sandbox_id) return bad(c, "체험 모드가 아니에요", 403);
  const b = await body(c);
  const target = await c.env.DB.prepare("SELECT id, role FROM users WHERE id = ? AND sandbox_id = ?").bind(intIn(b.userId, 1, 1e12, 0), u.sandbox_id).first<{ id: number; role: string }>();
  if (!target) return bad(c, "이 체험에 없는 인물이에요", 404);
  await endSession(c);
  await startSession(c, target.id, u.sandbox_id);
  return c.json({ ok: true, role: target.role });
});

r.post("/end", async c => {
  const s = await currentUser(c);
  await endSession(c);
  if (s?.user.sandbox_id) await c.env.DB.prepare("DELETE FROM demo_sandboxes WHERE id = ?").bind(s.user.sandbox_id).run();
  return c.json({ ok: true });
});

export default r;
