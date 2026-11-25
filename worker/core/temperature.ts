// 개인·학급 온도를 credit_transactions 에서 계산한다. 저장된 온도 값을 믿지 않고 늘 합계로 다시 센다.
import { CLASS_MILESTONES, classTemperature, personalTemperature } from "../../src/shared/temperature";
import type { Bindings } from "../lib";

export type Season = {
  id: number; class_id: number; title: string; starts_on: string; ends_on: string; status: string;
  personal_target_credits: number; class_target_credits: number | null; base_reward: number; special_reward: number;
  ranking_public: number; daily_mission_limit: number;
};

export function activeSeason(env: Bindings, classId: number) {
  return env.DB.prepare("SELECT * FROM manitto_seasons WHERE class_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1").bind(classId).first<Season>();
}

export async function classSnapshot(env: Bindings, classId: number) {
  const season = await activeSeason(env, classId);
  if (!season) return { season: null, temperature: 0, credits: 0, target: 0, participants: 0, milestones: milestones(0) };
  const row = await env.DB.prepare(
    `SELECT (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE season_id = ?1) AS credits,
            (SELECT COUNT(*) FROM season_participants WHERE season_id = ?1) AS participants`,
  ).bind(season.id).first<{ credits: number; participants: number }>();
  const target = season.class_target_credits ?? 0;
  const temperature = classTemperature(row?.credits ?? 0, target);
  return { season, temperature, credits: row?.credits ?? 0, target, participants: row?.participants ?? 0, milestones: milestones(temperature) };
}

export async function studentSnapshot(env: Bindings, seasonId: number | null, personalTarget: number, userId: number) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(CASE WHEN season_id = ? THEN amount END), 0) AS season_credits,
            COALESCE(SUM(amount), 0) AS total_credits
       FROM credit_transactions WHERE user_id = ?`,
  ).bind(seasonId ?? -1, userId).first<{ season_credits: number; total_credits: number }>();
  const seasonCredits = row?.season_credits ?? 0;
  return { seasonCredits, totalCredits: row?.total_credits ?? 0, temperature: seasonId ? personalTemperature(seasonCredits, personalTarget) : 0 };
}

export function milestones(temperature: number) {
  return CLASS_MILESTONES.map(m => ({ ...m, reached: temperature >= m.at }));
}

/** 학급 온도의 날짜별 기록(그래프용). */
export async function classHistory(env: Bindings, seasonId: number) {
  const { results } = await env.DB.prepare(
    "SELECT recorded_on AS day, temperature, credits FROM temperature_history WHERE season_id = ? AND subject = 'class' ORDER BY recorded_on",
  ).bind(seasonId).all<{ day: string; temperature: number; credits: number }>();
  return results;
}

/** 한국 시간 기준 오늘(YYYY-MM-DD). */
export const todayKst = (offsetDays = 0) => new Date(Date.now() + 9 * 36e5 + offsetDays * 864e5).toISOString().slice(0, 10);

/** 크레딧이 바뀐 뒤 부른다: 오늘 날짜의 학급·개인 온도 기록을 최신 값으로 덮어쓴다. */
export async function recordTemperatures(env: Bindings, seasonId: number, userIds: number[]) {
  const season = await env.DB.prepare("SELECT * FROM manitto_seasons WHERE id = ?").bind(seasonId).first<Season>();
  if (!season) return;
  const snap = await classSnapshot(env, season.class_id);
  const day = todayKst();
  const upsert = `INSERT INTO temperature_history (class_id, season_id, subject, temperature, credits, recorded_on) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(season_id, subject, recorded_on) DO UPDATE SET temperature = excluded.temperature, credits = excluded.credits, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;
  const stmts = [env.DB.prepare(upsert).bind(season.class_id, seasonId, "class", snap.temperature, snap.credits, day)];
  for (const uid of userIds) {
    const s = await studentSnapshot(env, seasonId, season.personal_target_credits, uid);
    stmts.push(env.DB.prepare(upsert).bind(season.class_id, seasonId, String(uid), s.temperature, s.seasonCredits, day));
  }
  await env.DB.batch(stmts);
}
