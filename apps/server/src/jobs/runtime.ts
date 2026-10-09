import type { JobRegistration } from "./registry";

export type JobRuntime = {
  stop: () => Promise<void>;
};

export async function startJobRuntime(
  registrations: readonly JobRegistration[]
): Promise<JobRuntime> {
  const active: { name: string; stop: () => Promise<void> }[] = [];

  const stopAll = async () => {
    const failures: Error[] = [];
    for (const job of active.splice(0).reverse()) {
      try {
        await job.stop();
      } catch (error) {
        failures.push(new Error(`Could not stop job worker ${job.name}`, { cause: error }));
      }
    }
    if (failures.length) throw new AggregateError(failures, "Could not stop all job workers");
  };

  try {
    for (const registration of registrations) {
      const worker = await registration.start();
      active.push({ name: registration.name, stop: worker.stop });
    }
  } catch (error) {
    try {
      await stopAll();
    } catch (stopError) {
      const failures = new AggregateError(
        [error, stopError],
        "Job worker startup and cleanup failed"
      );
      throw failures;
    }
    throw error;
  }

  let stopping: Promise<void> | undefined;
  return { stop: () => (stopping ??= stopAll()) };
}
