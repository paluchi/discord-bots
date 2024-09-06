import { Events, Interaction, TextInputStyle } from "discord.js";
import { getChatApp } from "../shared/chatApp";
import { sendModal } from "@/utils/sendModal";

export const interactionsMap = {
  confirm_sale_button: "confirm_sale_button",
  request_sale_update_button: "request_sale_update_button",
  reject_sale_button: "reject_sale_button",
};
const possibleInteractions = Object.values(interactionsMap);

export async function startBackofficeSalesTicketListener() {
  try {
    const chatApp = await getChatApp();

    const client = chatApp.getClient();

    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isButton()) return;

      const id = interaction.customId;
      if (!possibleInteractions.includes(id)) return;

      if (id === interactionsMap["confirm_sale_button"]) {
        // Send a modal to confirm the sale
        const data = await sendModal({
          interaction,
          customId: "confirm_sale_modal",
          title: "Confirmar venta",
          fields: [
            {
              customId: "confirm_sale_field",
              label: "test1",
              style: TextInputStyle.Short,
              required: true,
              checker: (input) => {
                return "test"
              },
            },
            {
              customId: "confirm_sale_field2",
              label: "test2",
              style: TextInputStyle.Short,
              required: false,
            },
          ],
        });
        console.log("data", data);
      } else if (id === interactionsMap["reject_sale_button"]) {
        console.log("TEST_2");
      }
    });
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}
