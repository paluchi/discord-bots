import { Events, Interaction } from "discord.js";
import { getChatApp } from "../shared/chatApp";
import {
  closeSalesmanTicket,
  handleAddProduct,
  handleConfirmSale,
  handleDiscardTicket,
  onClientReady,
  onCreateTicketButtonClick,
} from "./ticketUtils";
import {
  interactionButtonsList,
  InteractionId,
  ticketButtonsList,
} from "./ticketUtils/types";
import {
  handleAddClient,
  handleSelectClient,
  handleUnselectClient,
  handleUpdateClient,
} from "./ticketUtils/clientUtils";

export async function startSalesTicketListener() {
  try {
    const chatApp = await getChatApp();

    const client = chatApp.getClient();

    client.once(Events.ClientReady, async () => {
      await onClientReady(client);
    });

    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isButton()) return;

      const interactionId = interaction.customId as InteractionId;

      // Check if custom ID is the one we're expecting
      if (
        ![...interactionButtonsList, ...ticketButtonsList].includes(
          interactionId
        )
      )
        return;

      if (interactionId === "create-ticket-button") {
        await onCreateTicketButtonClick(interaction);
      } else if (interactionId === "close-salesman-ticket") {
        await closeSalesmanTicket(interaction);
      } else if (interactionId === "add_client") {
        await handleAddClient(interaction, chatApp);
      } else if (interactionId === "select_client") {
        await handleSelectClient(interaction, chatApp);
      } else if (interactionId === "unselect_client") {
        await handleUnselectClient(interaction, chatApp);
      } else if (interactionId === "update_client") {
        await handleUpdateClient(interaction, chatApp);
      } else if (interactionId === "confirm_sale") {
        await handleConfirmSale(interaction, chatApp);
      } else if (interactionId === "discard_ticket") {
        await handleDiscardTicket(interaction);
      } else if (interactionId === "add_product") {
        await handleAddProduct(interaction, chatApp);
      } else {
        console.log("Unhandled interactionId: ", interactionId);
      }
    });
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}
