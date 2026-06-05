import { getAuthConfigStatus } from "@/lib/auth";
import { getQuotaSnapshot } from "@/lib/quota";
import { getRunpodConfigStatus } from "@/lib/transcribe";

export async function GET() {
  const auth = getAuthConfigStatus();
  const runpod = getRunpodConfigStatus();

  return Response.json({
    authConfigured: auth.isConfigured,
    quota: getQuotaSnapshot(),
    runpodConfigured: runpod.isConfigured,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
