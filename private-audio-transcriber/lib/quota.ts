import { parsePositiveInt } from "@/lib/utils";

type QuotaStore = {
  activeJobs: number;
  currentDateKey: string;
  jobsToday: number;
};

declare global {
  var __privateAudioQuotaStore__: QuotaStore | undefined;
}

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStore() {
  if (!globalThis.__privateAudioQuotaStore__) {
    globalThis.__privateAudioQuotaStore__ = {
      activeJobs: 0,
      currentDateKey: getDateKey(),
      jobsToday: 0,
    };
  }

  return globalThis.__privateAudioQuotaStore__;
}

function resetIfNeeded() {
  const store = getStore();
  const currentDateKey = getDateKey();

  if (store.currentDateKey !== currentDateKey) {
    store.currentDateKey = currentDateKey;
    store.jobsToday = 0;
  }

  return store;
}

export function getQuotaConfig() {
  return {
    maxConcurrentJobs: parsePositiveInt(process.env.MAX_CONCURRENT_JOBS, 1)!,
    maxJobsPerDay: parsePositiveInt(process.env.MAX_JOBS_PER_DAY),
  };
}

export function reserveQuotaSlot() {
  const store = resetIfNeeded();
  const config = getQuotaConfig();

  if (store.activeJobs >= config.maxConcurrentJobs) {
    return {
      ok: false as const,
      error: `${config.maxConcurrentJobs} job actif maximum est autorisé à la fois.`,
    };
  }

  if (config.maxJobsPerDay && store.jobsToday >= config.maxJobsPerDay) {
    return {
      ok: false as const,
      error: `Limite journalière atteinte (${config.maxJobsPerDay} jobs).`,
    };
  }

  store.activeJobs += 1;
  store.jobsToday += 1;

  return {
    ok: true as const,
    release: () => {
      const nextStore = getStore();
      nextStore.activeJobs = Math.max(0, nextStore.activeJobs - 1);
    },
  };
}

export function getQuotaSnapshot() {
  const store = resetIfNeeded();
  const config = getQuotaConfig();

  return {
    activeJobs: store.activeJobs,
    currentDateKey: store.currentDateKey,
    jobsToday: store.jobsToday,
    maxConcurrentJobs: config.maxConcurrentJobs,
    maxJobsPerDay: config.maxJobsPerDay ?? null,
  };
}
