// 사이°C 서버 입구. /api 는 여기서, 나머지 화면은 정적 파일(ASSETS)이 처리한다.
// 기능별 경로는 worker/modules/*.ts 에 나뉘어 있다(팀원별 작업 단위). 새 기능은 모듈 하나를 더하고 아래에 route 한 줄.
import { Hono } from "hono";
import type { AppEnv } from "./core/auth";
import { describeError } from "./lib";
import admin from "./modules/admin";
import auth from "./modules/auth";
import demo from "./modules/demo";
import invites from "./modules/invites";
import student from "./modules/student";
import teacher from "./modules/teacher";

const app = new Hono<AppEnv>().basePath("/api");

app.use("*", async (c, next) => {
  // 바꾸는 요청은 JSON 만 받는다: 다른 사이트의 <form> 이 로그인 쿠키를 싣고 보내는 요청(CSRF)을 막는다.
  if (c.req.method !== "GET" && c.req.method !== "HEAD" && !(c.req.header("content-type") ?? "").includes("application/json")) {
    return c.json({ error: "요청 형식이 맞지 않아요" }, 415);
  }
  await next();
  c.header("cache-control", "no-store");
  c.header("x-robots-tag", "noindex");
});

app.get("/health", c => c.json({ ok: true }));
app.route("/auth", auth);
app.route("/", invites);       // /api/invites/:code, /api/schools
app.route("/teacher", teacher);
app.route("/student", student);
app.route("/demo", demo);
app.route("/admin", admin);

app.notFound(c => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error(`[api] ${c.req.method} ${c.req.path} 500\n${describeError(err)}`);
  return c.json({ error: "잠시 뒤 다시 시도해 주세요" }, 500);
});

export default app;
