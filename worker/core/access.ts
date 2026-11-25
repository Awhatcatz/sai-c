// 학교·학급 단위 접근 검사. 모든 학급 데이터 요청은 여기 함수 중 하나를 먼저 통과한다.
import type { Bindings } from "../lib";

export type ClassRow = {
  id: number; school_id: number; teacher_id: number; school_year: number; grade: number; class_no: number;
  name: string; status: string; school_name: string; school_level: string; school_source: string;
};

const CLASS_SELECT = `SELECT c.*, s.name AS school_name, s.level AS school_level, s.source AS school_source
  FROM classes c JOIN schools s ON s.id = c.school_id`;

/** 담임교사 본인의 학급만. 다른 교사·다른 학교 학급이면 null. */
export function teacherClass(env: Bindings, teacherId: number, classId: number) {
  return env.DB.prepare(`${CLASS_SELECT} WHERE c.id = ? AND c.teacher_id = ? AND c.status = 'active'`).bind(classId, teacherId).first<ClassRow>();
}

export function teacherClasses(env: Bindings, teacherId: number) {
  return env.DB.prepare(
    `${CLASS_SELECT} WHERE c.teacher_id = ? AND c.status = 'active' ORDER BY c.school_year DESC, c.grade, c.class_no`,
  ).bind(teacherId).all<ClassRow>();
}

export type Membership = ClassRow & { member_id: number; member_status: string; student_no: number; requested_at: string; class_id: number };

/** 학생의 모든 학급 가입(학년이 바뀌어도 계정은 그대로, 가입만 늘어난다). */
export async function studentMemberships(env: Bindings, userId: number) {
  const { results } = await env.DB.prepare(
    `SELECT c.*, c.id AS class_id, s.name AS school_name, s.level AS school_level, s.source AS school_source,
            m.id AS member_id, m.status AS member_status, m.student_no, m.requested_at
       FROM class_members m JOIN classes c ON c.id = m.class_id JOIN schools s ON s.id = c.school_id
      WHERE m.user_id = ? AND c.status = 'active'
      ORDER BY c.school_year DESC, m.requested_at DESC`,
  ).bind(userId).all<Membership>();
  return results;
}

/** 지금 쓰는 학급 = 승인된 가입 가운데 가장 최근 학년도. 없으면 null. */
export async function studentCurrentClass(env: Bindings, userId: number) {
  const list = await studentMemberships(env, userId);
  return list.find(m => m.member_status === "approved") ?? null;
}

export function classLabel(c: Pick<ClassRow, "grade" | "class_no" | "name">) {
  return c.name ? c.name : `${c.grade}학년 ${c.class_no}반`;
}

export async function logActivity(
  env: Bindings,
  a: { actorId?: number | null; role: string; action: string; targetType?: string; targetId?: string | number; classId?: number | null; sandboxId?: string | null; meta?: object },
) {
  await env.DB.prepare(
    "INSERT INTO activity_logs (actor_id, actor_role, action, target_type, target_id, class_id, sandbox_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(a.actorId ?? null, a.role, a.action, a.targetType ?? "", String(a.targetId ?? ""), a.classId ?? null, a.sandboxId ?? null, JSON.stringify(a.meta ?? {})).run();
}
