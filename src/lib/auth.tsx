// 로그인 상태 한 곳. 화면은 useAuth() 로 지금 사용자와 역할을 읽고, 역할별 화면은 <RequireRole> 로 감싼다.
// 화면의 역할 검사는 길 안내일 뿐이고, 실제 권한은 서버가 모든 요청마다 다시 검사한다.
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Splash } from "../brand/Logo";
import { api, post } from "./api";

export type Me = {
  user: {
    id: number; role: "teacher" | "student"; name: string; email: string | null; login_id: string | null;
    teacher_status: "pending" | "verified" | "rejected" | null; sandbox_id: string | null; school_id: number | null;
  };
  school: { id: number; name: string; level: string; source: string } | null;
  memberships?: { id: number; classId: number; status: string; studentNo: number; schoolName: string; schoolYear: number; grade: number; classNo: number; name: string }[];
  classes?: { id: number; schoolYear: number; grade: number; classNo: number; name: string; schoolName: string }[];
};

type AuthState = { me: Me | null; loading: boolean; refresh: () => Promise<Me | null>; logout: () => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const r = await api<Me | { user: null }>("/api/auth/me");
      const next = r.user ? (r as Me) : null;
      setMe(next);
      return next;
    } catch {
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  const logout = useCallback(async () => {
    await post(me?.user.sandbox_id ? "/api/demo/end" : "/api/auth/logout").catch(() => {});
    setMe(null);
  }, [me]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <AuthContext value={{ me, loading, refresh, logout }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("AuthProvider 밖에서 useAuth 를 불렀어요");
  return ctx;
}

export const homeFor = (role: "teacher" | "student") => (role === "teacher" ? "/t" : "/s");

export function RequireRole({ role, children }: { role: "teacher" | "student"; children: ReactNode }) {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  if (!me) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (me.user.role !== role) return <Navigate to={homeFor(me.user.role)} replace />;
  return children;
}
