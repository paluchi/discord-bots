import cron from "node-cron";
import { getBackofficeCatalogueService } from "@platform/shared-context/firebaseContext";
import envs from "@platform/shared/env";

const main = async () => {
  console.log("Started sync catalogue job");

  const backofficeCatalogueService = await getBackofficeCatalogueService();

  await backofficeCatalogueService.syncCatalogue();
};

// Schedule the job
cron.schedule(envs.CATALOGUE_SYNC_CRON_EXPRESSION, () => {
  console.log("Running syncCatalogue job");
  main().catch((err) => console.error("Error running syncCatalogue job:", err));
});

main();
