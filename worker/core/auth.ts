// 로그인 · 세션 · 역할 검사. 비밀번호는 PBKDF2-SHA256(소금, 10만 회)으로만 저장하고,
// 세션 토큰은 HttpOnly 쿠키로만 오가며 DB 에는 토큰의 SHA-256 만 남긴다.
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { type Bindings, sameToken, sha256 } from "../lib";

export type Role = "teacher" | "student";
export type SessionUser = {
  id: number;
  role: Role;
  name: string;
  email: string | null;
  login_id: string | null;
  nickname: string | null;
  school_id: number | null;
  teacher_status: "pending" | "verified" | "rejected" | null;
  sandbox_id: string | null;
};
export type AppEnv = { Bindings: Bindings; Variables: { user: SessionUser; sessionId: string } };
export type Ctx = Context<AppEnv>;

const COOKIE = "sai_sid";
const SESSION_DAYS = 30;
const ITERATIONS = 100_000; // Workers 의 PBKDF2 상한

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(stored: string | null, password: string) {
  if (!stored) return false;
  const [scheme, iter, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !salt || !hash) return false;
  return sameToken(b64(await pbkdf2(password, unb64(salt), Number(iter))), hash);
}

const isHttps = (c: Context) => c.req.url.startsWith("https:") || c.req.header("x-forwarded-proto") === "https";

export async function startSession(c: Ctx, userId: number, sandboxId: string | null = null) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, ch => ({ "+": "-", "/": "_", "=": "" })[ch]!);
  const days = sandboxId ? 1 : SESSION_DAYS;
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?").bind(userId, new Date().toISOString()),
    c.env.DB.prepare("INSERT INTO sessions (id, user_id, sandbox_id, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), userId, sandboxId, expires),
    c.env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(new Date().toISOString(), userId),
  ]);
  setCookie(c, COOKIE, token, { httpOnly: true, sameSite: "Lax", path: "/", secure: isHttps(c), maxAge: days * 86400 });
}

export async function endSession(c: Ctx) {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256(token)).run();
  deleteCookie(c, COOKIE, { path: "/", secure: isHttps(c) });
}

export async function currentUser(c: Ctx): Promise<{ user: SessionUser; sessionId: string } | null> {
  const token = getCookie(c, COOKIE);
  if (!token || token.length > 100) return null;
  const sid = await sha256(token);
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.role, u.name, u.email, u.login_id, u.nickname, u.school_id, u.teacher_status, u.sandbox_id
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > ? AND u.status = 'active'`,
  ).bind(sid, new Date().toISOString()).first<SessionUser>();
  return user ? { user, sessionId: sid } : null;
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const s = await currentUser(c);
  if (!s) return c.json({ error: "로그인이 필요해요", code: "auth" }, 401);
  c.set("user", s.user);
  c.set("sessionId", s.sessionId);
  await next();
};

export const requireRole = (role: Role): MiddlewareHandler<AppEnv> => async (c, next) => {
  if (c.get("user").role !== role) return c.json({ error: "이 화면을 열 권한이 없어요", code: "role" }, 403);
  await next();
};
