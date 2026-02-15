import { getTranslations } from "next-intl/server";
import { JobsTable } from "./_components/jobs-table";
import { JobStats } from "./_components/job-stats";
import { getScrapeJobs, getStores } from "@/lib/queries";

export default async function JobsPage() {
  const t = await getTranslations("Jobs");

  const [jobs, stores] = await Promise.all([getScrapeJobs(), getStores()]);
  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const running = jobs.filter((j) => j.status === "running").length;

  return (
    <>
      <JobStats
        total={jobs.length}
        completed={completed}
        failed={failed}
        running={running}
        labels={{
          totalJobs: t("totalJobs"),
          completed: t("completed"),
          running: t("running"),
          failed: t("failed"),
        }}
      />

      <JobsTable jobs={jobs} stores={stores} />
    </>
  );
}
