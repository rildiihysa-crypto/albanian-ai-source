import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AuthCard } from "@/components/auth-card";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (!isPending && user) return <Navigate to="/" />;

  return (
    <main className="signin">
      <AuthCard
        eyebrow="HYRJE"
        title="Meet Albanian AI."
        note="Krijo llogari me email ose hyr me Google. Bisedat mbeten vetëm të tua. Lexo politikën e privatësisë: albanianai.it/privacy"
      />
    </main>
  );
}
