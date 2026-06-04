import { redirectIfAuthenticated } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/ui/logo-mark";
import { StatusPill } from "@/components/ui/status-pill";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fbff_0%,#eef4f9_100%)] px-6 py-10 lg:px-10">
      <div className="w-full max-w-xl">
        <Card className="mx-auto bg-white px-8 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <LogoMark compact />
            <div className="mt-6 space-y-3">
              <StatusPill tone="success">Acces securise</StatusPill>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Transcription Audio Privée
              </h1>
              <p className="mx-auto max-w-sm text-sm leading-6 text-[var(--muted-strong)] sm:text-base">
                Connectez-vous pour accéder à l'espace local protégé.
              </p>
            </div>

            <div className="mt-8 w-full rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)] sm:p-6">
              <LoginForm />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
