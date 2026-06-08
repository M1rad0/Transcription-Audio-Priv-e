import { SidebarNav } from "@/components/app/sidebar-nav";
import { HistoryView } from "@/components/history/history-view";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { PreflightUploadCard } from "@/components/upload/preflight-upload-card";
import { requireSession } from "@/lib/auth";
import { getStoredJob, listStoredJobs } from "@/lib/jobs";
import { getPipelineConfigStatus } from "@/lib/pipeline";
import { ALLOWED_AUDIO_EXTENSIONS, getMaxAudioSizeMb } from "@/lib/transcribe";
import { parsePositiveInt } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HomePageProps = PageProps<"/">;

function getSingleValue(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await requireSession();
  const params = await searchParams;
  const tab = getSingleValue(params.tab) === "history" ? "history" : "treatment";
  const maxAudioSizeMb = getMaxAudioSizeMb();
  const pipelineConfig = getPipelineConfigStatus();

  const historyFilters = {
    date: getSingleValue(params.date) ?? "",
    dateFrom: getSingleValue(params.dateFrom) ?? "",
    dateTo: getSingleValue(params.dateTo) ?? "",
    firstName: getSingleValue(params.firstName) ?? "",
    lastName: getSingleValue(params.lastName) ?? "",
    originalFilename: getSingleValue(params.originalFilename) ?? "",
    page: parsePositiveInt(getSingleValue(params.page), 1) ?? 1,
  };

  const history =
    tab === "history"
      ? await listStoredJobs({
          date: historyFilters.date || undefined,
          dateFrom: historyFilters.dateFrom || undefined,
          dateTo: historyFilters.dateTo || undefined,
          firstName: historyFilters.firstName || undefined,
          lastName: historyFilters.lastName || undefined,
          originalFilename: historyFilters.originalFilename || undefined,
          page: historyFilters.page,
        })
      : null;

  const selectedJobId = getSingleValue(params.jobId);
  const selectedJob =
    tab === "history" && selectedJobId
      ? await (async () => {
          try {
            return await getStoredJob(selectedJobId);
          } catch {
            return null;
          }
        })()
      : null;

  return (
    <main className="box-border h-screen overflow-hidden bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid h-full w-full max-w-[1600px] gap-4 lg:grid-cols-[20.5rem_minmax(0,1fr)]">
        <SidebarNav currentTab={tab} username={session.username} />

        <section className="grid min-h-0 gap-4 overflow-hidden">
          {tab === "treatment" ? (
            <Card
              actions={
                <div className="flex flex-wrap justify-end gap-1.5 text-xs text-slate-500">
                  <StatusPill tone={pipelineConfig.isMockFallback ? "warning" : "success"}>
                    {pipelineConfig.modeLabel}
                  </StatusPill>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5">
                    Formats {ALLOWED_AUDIO_EXTENSIONS.join(", ")}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5">
                    Max {maxAudioSizeMb} Mo
                  </span>
                </div>
              }
              className="flex h-[calc(100vh-2rem)] flex-col overflow-hidden bg-white"
              eyebrow="Traitement"
              title="Lancer une transcription"
            >
              <div className="grid w-full flex-1 min-h-0 gap-4 overflow-hidden lg:grid-rows-[auto_minmax(0,1fr)]">
                <p className="text-sm leading-6 text-slate-600">
                  Importez un audio, vérifiez le résultat, puis retrouvez-le ensuite dans l’historique local.
                </p>
                <div className="min-h-0 overflow-hidden">
                  <PreflightUploadCard
                    allowedExtensions={[...ALLOWED_AUDIO_EXTENSIONS]}
                    maxAudioSizeMb={maxAudioSizeMb}
                    pipelineModeLabel={pipelineConfig.modeLabel}
                  />
                </div>
              </div>
            </Card>
          ) : history ? (
            <div className="min-h-0">
              <HistoryView
                filters={{
                  date: historyFilters.date,
                  dateFrom: historyFilters.dateFrom,
                  dateTo: historyFilters.dateTo,
                  firstName: historyFilters.firstName,
                  lastName: historyFilters.lastName,
                  originalFilename: historyFilters.originalFilename,
                }}
                history={history}
                selectedJob={selectedJob}
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
