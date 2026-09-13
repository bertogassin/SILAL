import { Navigate, createFileRoute } from "@tanstack/react-router";
import { SignInButtons } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useT } from "@/lib/si/use-t";
import { SiWordmark } from "@/components/si/mark";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const t = useT();
  const { user, isPending } = useCurrentUserState();

  if (isPending) return null;
  if (user) return <Navigate to="/" />;

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      <div className="si-grain pointer-events-none absolute inset-0 opacity-20" />
      <section className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm">
        <SiWordmark size="lg" />
        <h1 className="mt-6 font-display text-3xl">{t("auth.signIn")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.signInHint")}</p>
        <div className="mt-6">
          <SignInButtons />
        </div>
      </section>
    </main>
  );
}
