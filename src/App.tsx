import { Outlet, ScrollRestoration } from "react-router";
import { DemoBar } from "./components/DemoBar";
import { AuthProvider } from "./lib/auth";

export default function App() {
  return (
    <AuthProvider>
      <DemoBar />
      <Outlet />
      <ScrollRestoration />
    </AuthProvider>
  );
}
