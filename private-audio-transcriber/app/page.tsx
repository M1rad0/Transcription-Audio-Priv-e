import { logoutAction } from "@/app/actions/auth";
import { Card } from "@/components/ui/card";
import { LogoMark } from "@/components/ui/logo-mark";
import { StatusPill } from "@/components/ui/status-pill";
import { PreflightUploadCard } from "@/components/upload/preflight-upload-card";
import { requireSession } from "@/lib/auth";
import { ALLOWED_AUDIO_EXTENSIONS, getMaxAudioSizeMb } from "@/lib/transcribe";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await requireSession();
  const maxAudioSizeMb = getMaxAudioSizeMb();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#eef4f9_100%)] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark compact />
            <div>
              <p className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                Transcription Audio Privée
              </p>
              <p className="text-sm text-[var(--muted)]">
                Connecte en tant que {session.username}
              </p>
            </div>
          </div>

          <form action={logoutAction}>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50">
              Se déconnecter
            </button>
          </form>
        </div>

        <Card className="overflow-hidden bg-white px-5 py-6 sm:px-7 sm:py-7">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <StatusPill tone="success">Importer un audio</StatusPill>

            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Déposez votre fichier et lancez le traitement.
            </h1>

            <div className="mt-5 w-full">
              <PreflightUploadCard
                allowedExtensions={[...ALLOWED_AUDIO_EXTENSIONS]}
                maxAudioSizeMb={maxAudioSizeMb}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--muted)]">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                Formats : {ALLOWED_AUDIO_EXTENSIONS.join(", ")}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
