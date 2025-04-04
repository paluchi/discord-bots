import * as functions from "firebase-functions";
import { getBackofficeCatalogueService } from "@platform/shared-context/firebaseContext";

// scheduledSyncCatalogue_BT // Bring Tech
// scheduledSyncCatalogue_GH // Gold Hash

// Scheduled function that runs based on your cron expression
export const scheduledSyncCatalogue_GH = functions.pubsub
  .schedule("*/15 * * * *")
  .onRun(async (context) => {
    try {
      console.log("Started sync catalogue job");

      const backofficeCatalogueService = await getBackofficeCatalogueService();
      await backofficeCatalogueService.syncCatalogue();

      console.log("Sync catalogue job completed successfully");
    } catch (err) {
      console.error("Error running syncCatalogue job:", err);
    }
  });
