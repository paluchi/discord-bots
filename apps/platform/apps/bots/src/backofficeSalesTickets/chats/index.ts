import { Request, Response, Next } from "@platform/shared/framework/types";
import { getChatApp } from "../shared/chatApp";
import { startBackofficeSalesTicketListener } from "./salesTicketListener";
import envs from "@platform/shared/env";
import { getSalesService } from "@platform/shared-context/firebaseContext";

async function main() {
  const salesService = await getSalesService();

  const chatStarterMiddleware = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    await res.send("TEST");
  };

  const chatApp = await getChatApp();

  // Add middleware to the chat app
  chatApp.addListener({
    channelId: envs.BACKOFFICE_SALES_TICKETS_MANAGEMENT_CHANNEL_ID,
    startPoint: chatStarterMiddleware,
    threadCreateCallback: async (channel, client) => {
      // Pass
    },
    timeoutCallback: async (req, sendMessage) => {
      await sendMessage(
        "Parece que has tardado demasiado en responder. Envia un mensaje para iniciar nuevamente."
      );
    },
  });

  startBackofficeSalesTicketListener();
}

main();
