import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatDateTime } from "@/lib/utils";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "jobs");
const JOB_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const DEFAULT_PAGE_SIZE = 8;

export type StoredJobMetadata = {
  job_id: string;
  first_name: string;
  last_name: string;
  original_filename: string;
  created_at: string;
  duration_seconds?: number;
  engine?: string;
  status: "success";
  files: {
    modified: "modified.txt";
    raw: "raw.txt";
    result: "result.json";
  };
};

export type StoredJobSummary = {
  createdAt: string;
  durationSeconds?: number;
  engine?: string;
  firstName: string;
  jobId: string;
  lastName: string;
  originalFilename: string;
  status: "success";
};

export type StoredJobDetail = StoredJobSummary & {
  createdAtLabel: string;
  modifiedText: string;
  rawText: string;
  result: unknown;
};

export type HistoryFilters = {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  firstName?: string;
  lastName?: string;
  originalFilename?: string;
  page?: number;
  pageSize?: number;
};

export type HistoryListResult = {
  items: StoredJobSummary[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type SaveCompletedJobInput = {
  createdAt: string;
  durationSeconds?: number;
  engine?: string;
  firstName: string;
  jobId: string;
  lastName: string;
  modifiedText: string;
  originalFilename: string;
  rawText: string;
  result: unknown;
};

function assertValidJobId(jobId: string) {
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new Error("Invalid job id.");
  }
}

function getJobDirectory(jobId: string) {
  assertValidJobId(jobId);
  return path.join(STORAGE_ROOT, jobId);
}

function normalizeFilterValue(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function mapMetadataToSummary(metadata: StoredJobMetadata): StoredJobSummary {
  return {
    createdAt: metadata.created_at,
    durationSeconds: metadata.duration_seconds,
    engine: metadata.engine,
    firstName: metadata.first_name,
    jobId: metadata.job_id,
    lastName: metadata.last_name,
    originalFilename: metadata.original_filename,
    status: metadata.status,
  };
}

async function ensureStorageRoot() {
  await mkdir(STORAGE_ROOT, { recursive: true });
}

async function readMetadata(jobId: string) {
  const metadataPath = path.join(getJobDirectory(jobId), "metadata.json");
  const metadataRaw = await readFile(metadataPath, "utf8");
  return JSON.parse(metadataRaw) as StoredJobMetadata;
}

function matchesFilters(metadata: StoredJobMetadata, filters: HistoryFilters) {
  const firstName = normalizeFilterValue(filters.firstName);
  const lastName = normalizeFilterValue(filters.lastName);
  const originalFilename = normalizeFilterValue(filters.originalFilename);

  if (
    firstName &&
    !metadata.first_name.toLowerCase().includes(firstName)
  ) {
    return false;
  }

  if (lastName && !metadata.last_name.toLowerCase().includes(lastName)) {
    return false;
  }

  if (
    originalFilename &&
    !metadata.original_filename.toLowerCase().includes(originalFilename)
  ) {
    return false;
  }

  const createdDate = metadata.created_at.slice(0, 10);

  if (filters.date && createdDate !== filters.date) {
    return false;
  }

  if (filters.dateFrom && createdDate < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && createdDate > filters.dateTo) {
    return false;
  }

  return true;
}

export async function saveCompletedJob({
  createdAt,
  durationSeconds,
  engine,
  firstName,
  jobId,
  lastName,
  modifiedText,
  originalFilename,
  rawText,
  result,
}: SaveCompletedJobInput) {
  const jobDirectory = getJobDirectory(jobId);
  const metadata: StoredJobMetadata = {
    created_at: createdAt,
    duration_seconds: durationSeconds,
    engine,
    files: {
      modified: "modified.txt",
      raw: "raw.txt",
      result: "result.json",
    },
    first_name: firstName,
    job_id: jobId,
    last_name: lastName,
    original_filename: originalFilename,
    status: "success",
  };

  await ensureStorageRoot();
  await mkdir(jobDirectory, { recursive: true });

  await Promise.all([
    writeFile(path.join(jobDirectory, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8"),
    writeFile(path.join(jobDirectory, "raw.txt"), rawText, "utf8"),
    writeFile(path.join(jobDirectory, "modified.txt"), modifiedText, "utf8"),
    writeFile(path.join(jobDirectory, "result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8"),
  ]);

  return metadata;
}

export async function listStoredJobs(filters: HistoryFilters): Promise<HistoryListResult> {
  await ensureStorageRoot();

  const entries = await readdir(STORAGE_ROOT, { withFileTypes: true });
  const allMetadata = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          return await readMetadata(entry.name);
        } catch {
          return null;
        }
      }),
  );

  const filtered = allMetadata
    .filter((metadata): metadata is StoredJobMetadata => Boolean(metadata))
    .filter((metadata) => matchesFilters(metadata, filters))
    .sort((left, right) => {
      return (
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
      );
    })
    .map(mapMetadataToSummary);

  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export async function getStoredJob(jobId: string): Promise<StoredJobDetail> {
  const jobDirectory = getJobDirectory(jobId);
  const metadata = await readMetadata(jobId);
  const [rawText, modifiedText, resultRaw] = await Promise.all([
    readFile(path.join(jobDirectory, metadata.files.raw), "utf8"),
    readFile(path.join(jobDirectory, metadata.files.modified), "utf8"),
    readFile(path.join(jobDirectory, metadata.files.result), "utf8"),
  ]);

  return {
    createdAt: metadata.created_at,
    createdAtLabel: formatDateTime(new Date(metadata.created_at)),
    durationSeconds: metadata.duration_seconds,
    engine: metadata.engine,
    firstName: metadata.first_name,
    jobId: metadata.job_id,
    lastName: metadata.last_name,
    modifiedText,
    originalFilename: metadata.original_filename,
    rawText,
    result: JSON.parse(resultRaw),
    status: metadata.status,
  };
}

export async function getStoredJobArtifact(
  jobId: string,
  artifact: "modified" | "raw" | "result",
) {
  const metadata = await readMetadata(jobId);
  const filename = metadata.files[artifact];
  const filePath = path.join(getJobDirectory(jobId), filename);
  const content = await readFile(filePath);

  return {
    content,
    contentType:
      artifact === "result"
        ? "application/json; charset=utf-8"
        : "text/plain; charset=utf-8",
    filename: `${jobId}-${filename}`,
  };
}
