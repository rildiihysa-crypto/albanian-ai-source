import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing";
import { useEffect } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) window.location.replace("/app");
  }, []);
  return (
    <Landing
      onEnter={() => {
        localStorage.removeItem("albanian-ai-guest-thread");
        sessionStorage.removeItem("albanian-ai-selected");
        window.location.assign("/app?new=1");
      }}
    />
  );
}
