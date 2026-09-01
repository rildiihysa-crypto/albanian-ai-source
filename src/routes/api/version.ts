import { createFileRoute } from "@tanstack/react-router";
import { APP_BUILD, APP_VERSION } from "@/lib/app-version";

export const Route = createFileRoute("/api/version")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          JSON.stringify({
            name: "Albanian AI",
            version: APP_VERSION,
            build: APP_BUILD,
            notes: "Ky version ka rregulluar disa probleme dhe ka përforcuar sigurinë e përdoruesit.",
          }),
          {
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
              pragma: "no-cache",
              expires: "0",
            },
          },
        ),
    },
  },
});
