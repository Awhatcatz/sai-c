// 화면에서 서버를 부르는 한 곳. 로그인은 HttpOnly 쿠키로 오가므로 화면 코드는 토큰을 만지지 않는다.
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, { credentials: "same-origin", ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  } catch {
    throw new ApiError("인터넷 연결을 확인한 뒤 다시 시도해 주세요", 0);
  }
  const isJson = (r.headers.get("content-type") ?? "").includes("json");
  if (!isJson) throw new ApiError("서버에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요", r.status);
  const body = (await r.json()) as T & { error?: string; code?: string };
  if (!r.ok) throw new ApiError(body.error ?? `요청이 실패했어요 (${r.status})`, r.status, body.code);
  return body;
}

export const post = <T,>(path: string, data: unknown = {}) => api<T>(path, { method: "POST", body: JSON.stringify(data) });
