import { Events, Interaction, TextInputStyle, ThreadChannel } from "discord.js";
import { getChatApp } from "../shared/chatApp";
import { sendModal } from "@/utils/sendModal";
import { getSalesService } from "@platform/shared-context/firebaseContext";

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
      if (interaction.guildId !== process.env.SERVER_ID) return;

      if (!interaction.isButton()) return;

      const id = interaction.customId;
      if (!possibleInteractions.includes(id)) return;

      const salesService = await getSalesService();

      // Get sale id from thread name
      const saleId = (interaction.channel as any).name.split("-")[1];

      if (id === interactionsMap["confirm_sale_button"]) {
        // Send a modal to confirm the sale
        const data = await sendModal({
          interaction,
          customId: "confirm_sale_modal",
          title: "Confirmar venta",
          fields: [
            {
              customId: "confirm_sale_field",
              label: "Confirmar venta?",
              style: TextInputStyle.Short,
              required: true,
              value: "si",
              checker: (input) => {
                return input === "si";
              },
            },
          ],
        });

        if (!data) return;

        await salesService.updateSale(saleId, {
          status: "completed",
          transactionalStatus: "send-salesman-message",
        });

        await interaction.editReply("Venta confirmada!");
        // Send message to the channel telling the sale has been completed
        const channel = interaction.channel as ThreadChannel;
        await channel.send(
          "**Venta confirmada!**\n\nEste hilo se archivará automaticamente cuando el vendedor reciba el mensaje."
        );
      } else if (id === interactionsMap["reject_sale_button"]) {
        // Send a modal to confirm the sale
        const data = await sendModal({
          interaction,
          customId: "cancel_sale_modal",
          title: "Cancelar venta",
          fields: [
            {
              customId: "cancel_sale_field",
              label: "Cancelar venta?",
              style: TextInputStyle.Short,
              required: true,
              value: "Cancelar",
              checker: (input) => {
                return input === "Cancelar";
              },
            },
            {
              customId: "cancel_sale_reason_field",
              label: "Razón de la cancelación",
              style: TextInputStyle.Paragraph,
              required: true,
              placeholder: "Un marciano apareció y se la llevo!",
              checker: (input) => {
                if (input.length < 10) {
                  return "La razón de la cancelación debe tener al menos 10 caracteres.";
                }
                return true;
              },
            },
          ],
        });

        if (!data) return;

        await salesService.updateSale(saleId, {
          status: "canceled",
          transactionalStatus: "send-salesman-message",
          details: {
            backofficeCancelReason: data["cancel_sale_reason_field"],
          },
        });

        await interaction.editReply("Venta cancelada!");
        // Send message to the channel telling the sale has been canceled
        const channel = interaction.channel as ThreadChannel;
        await channel.send(
          "**Venta cancelada!**\n\nEste hilo se archivará automaticamente cuando el vendedor reciba el mensaje."
        );
      }
    });
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}
