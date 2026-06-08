import { getAuthConfigStatus } from "@/lib/auth";
import { getPipelineConfigStatus } from "@/lib/pipeline";
import { getQuotaSnapshot } from "@/lib/quota";

export async function GET() {
  const auth = getAuthConfigStatus();
  const pipeline = getPipelineConfigStatus();

  return Response.json({
    authConfigured: auth.isConfigured,
    pipelineMode: pipeline.modeLabel,
    quota: getQuotaSnapshot(),
    runpodConfigured: pipeline.isConfigured,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
