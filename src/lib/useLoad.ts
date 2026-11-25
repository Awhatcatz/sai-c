// 화면 하나가 서버에서 읽어 오는 값. path 가 바뀌면 다시 읽고, reload() 로 새로 고친다.
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export function useLoad<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    void reload();
  }, [reload]);
  return { data, error, reload, setData };
}
