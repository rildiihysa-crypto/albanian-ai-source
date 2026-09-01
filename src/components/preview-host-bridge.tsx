/**
 * Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
 * (and later receive registered routes). Noops when the app is not embedded.
 */

import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  collectRoutePathsFromTree,
  installPreviewHostBridge,
} from "@/lib/preview-host-bridge";

export function PreviewHostBridge() {
  const router = useRouter();

  useEffect(() => {
    return installPreviewHostBridge({
      navigate: (path) => {
        router.history.push(path);
      },
      getRoutePaths: () => collectRoutePathsFromTree(router.routeTree),
    });
  }, [router]);

  useEffect(() => {
    const hide = () => {
      document.documentElement.style.setProperty("--grok-banner-h", "0px");
      document
        .querySelectorAll("[data-created-with-grok-banner], [data-created-with-grok-spacer]")
        .forEach((node) => {
          const el = node as HTMLElement;
          el.style.display = "none";
          el.style.height = "0";
          el.setAttribute("aria-hidden", "true");
          el.remove();
        });
    };
    hide();
    const observer = new MutationObserver(hide);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
