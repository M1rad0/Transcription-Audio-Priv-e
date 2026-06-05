import { getSession } from "@/lib/auth";
import { getStoredJobArtifact } from "@/lib/jobs";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId") ?? "";
  const artifact = url.searchParams.get("artifact");

  if (
    artifact !== "raw" &&
    artifact !== "modified" &&
    artifact !== "result"
  ) {
    return Response.json(
      { error: "Le fichier demande est invalide." },
      { status: 400 },
    );
  }

  if (!jobId) {
    return Response.json(
      { error: "Un identifiant de traitement est requis." },
      { status: 400 },
    );
  }

  try {
    const file = await getStoredJobArtifact(jobId, artifact);

    return new Response(file.content, {
      headers: {
        "content-disposition": `attachment; filename="${file.filename}"`,
        "content-type": file.contentType,
      },
      status: 200,
    });
  } catch {
    return Response.json(
      { error: "Le fichier demande est introuvable." },
      { status: 404 },
    );
  }
}
