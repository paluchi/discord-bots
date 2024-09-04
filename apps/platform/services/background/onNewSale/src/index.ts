import functions from "firebase-functions";
import { getSalesService } from "@platform/shared-context/firebaseContext";
import getChatApp from "@platform/shared-context/bots/getChatApp";
import envs from "@platform/shared/env";
import { TextChannel } from "discord.js";

export const onNewSale = functions.firestore
  .document("sales/{saleId}")
  .onCreate(async (snap, context) => {
    try {
      // Get the sale data
      const newSaleData = snap.data();

      const backofficeSaleschatApp = await getChatApp(
        "BACKOFFICE_SALES_TICKETS_BOT"
      );
      const backofficeSalesClient = backofficeSaleschatApp.getClient();

      const channel = await backofficeSalesClient.channels.fetch(
        envs.BACKOFFICE_SALES_TICKETS_MANAGEMENT_CHANNEL_ID
      );
      // Create new thread in the sales channel
      const newThread = await (channel as TextChannel).threads.create({
        name: `🎫-${newSaleData.id}`,
        autoArchiveDuration: 10080, // 1 week
      });

      const salesService = await getSalesService();
      await salesService.updateSale(newSaleData.id, {
        details: {
          "backoffice-communicated": true,
          "backoffice-communication-method": "discord-thread",
          discordThreadId: newThread.id,
        },
      });

      // Example: You could add logic to update a summary document, notify users, etc.
    } catch (error) {
      console.log("error", error);
    }
  });
