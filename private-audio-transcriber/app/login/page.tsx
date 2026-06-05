import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/ui/logo-mark";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectIfAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-6 py-10 lg:px-10">
      <div className="w-full max-w-xl">
        <Card className="mx-auto bg-white px-8 py-10 sm:px-10 sm:py-12">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <LogoMark compact />
            <div className="mt-6 space-y-3">
              <StatusPill tone="success">Accès sécurisé</StatusPill>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Transcription Audio Privée
              </h1>
              <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600 sm:text-base">
                Connectez-vous pour accéder à votre espace local protégé.
              </p>
            </div>

            <div className="mt-8 w-full rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200 sm:p-6">
              <LoginForm />
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
