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
        eyebrow="MIRË SE ERDHE"
        title="Vazhdo me Albanian AI"
        note="Shkruaj vetëm emrin dhe mbiemrin për të filluar. Nuk kërkohet email ose fjalëkalim."
      />
    </main>
  );
}
