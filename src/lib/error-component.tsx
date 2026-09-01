import { Component, type ErrorInfo, type ReactNode } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";

function openApp() {
  window.location.replace("/app?v=" + Date.now());
}

function Screen({ title, detail }: { title: string; detail?: string }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
      style={{ background: "#050505", color: "#f4f4f4", minHeight: "100svh" }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h1>
      {detail ? (
        <p style={{ maxWidth: 360, fontSize: 13, color: "#bdbdbd", wordBreak: "break-word" }}>{detail}</p>
      ) : null}
      <button
        type="button"
        onClick={openApp}
        style={{
          marginTop: 8,
          height: 44,
          padding: "0 18px",
          border: 0,
          borderRadius: 12,
          background: "#a7192e",
          color: "#fff",
          fontWeight: 700,
        }}
      >
        Hap Albanian AI
      </button>
    </main>
  );
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return <Screen title="Albanian AI" detail={error?.message || "Hape përsëri."} />;
}

export class AppBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error?.message || String(error) };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Albanian AI]", error, info.componentStack);
  }
  render() {
    if (this.state.error) return <Screen title="Albanian AI" detail={this.state.error} />;
    return this.props.children;
  }
}
