// 학급 가입 코드 · 학교 검색 (로그인 전에도 쓰는 공개 조회)
import { Hono } from "hono";
import { type AppEnv, currentUser } from "../core/auth";
import { type Bindings, bad, clean, normalizeCode, nowIso, rateLimited } from "../lib";

export type InviteRow = { id: number; class_id: number; code: string; expires_at: string; school_name: string; school_year: number; grade: number; class_no: number; name: string; sandbox_id: string | null };

/** 살아 있는 코드만: 취소되지 않았고, 기한 전이고, 학급이 운영 중. */
export function findInvite(env: Bindings, code: string) {
  if (code.length !== 6) return Promise.resolve(null);
  return env.DB.prepare(
    `SELECT i.id, i.class_id, i.code, i.expires_at, s.name AS school_name, s.sandbox_id, c.school_year, c.grade, c.class_no, c.name
       FROM class_invites i JOIN classes c ON c.id = i.class_id JOIN schools s ON s.id = c.school_id
      WHERE i.code = ? AND i.revoked_at IS NULL AND i.expires_at > ? AND c.status = 'active'`,
  ).bind(code, nowIso()).first<InviteRow>();
}

const r = new Hono<AppEnv>();

r.get("/invites/:code", async c => {
  if (await rateLimited(c, "invite-lookup", 40, 600)) return bad(c, "잠시 뒤 다시 시도해 주세요", 429);
  const inv = await findInvite(c.env, normalizeCode(c.req.param("code")));
  if (!inv) return c.json({ valid: false });
  return c.json({ valid: true, demo: !!inv.sandbox_id, schoolName: inv.school_name, schoolYear: inv.school_year, grade: inv.grade, classNo: inv.class_no, name: inv.name, expiresAt: inv.expires_at });
});

/**
 * 학교 검색. 지금은 schools 표(테스트용 가상 학교)만 찾는다.
 * 공식 학교 데이터(NEIS 학교기본정보) 연동 때는 NEIS_API_KEY 가 있으면 여기서 원격 결과를 받아
 * source='neis' 로 schools 에 넣고(neis_school_code 로 중복 방지) 같은 모양으로 돌려준다.
 */
r.get("/schools", async c => {
  const q = clean(c.req.query("q"), 30);
  const level = c.req.query("level");
  const me = await currentUser(c);
  const sandbox = me?.user.sandbox_id ?? null;
  const where = ["(sandbox_id IS ? )"], args: unknown[] = [sandbox];
  if (q) { where.push("name LIKE ?"); args.push(`%${q}%`); }
  if (level === "elementary" || level === "middle" || level === "high") { where.push("level = ?"); args.push(level); }
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, level, region, district, source FROM schools WHERE ${where.join(" AND ")} ORDER BY level, name LIMIT 30`,
  ).bind(...args).all();
  return c.json({ schools: results, provider: "test" });
});

export default r;
