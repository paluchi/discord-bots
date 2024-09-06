import { Request, Response, Next } from "@platform/shared/framework/types";
import { getChatApp } from "../shared/chatApp";
import {
  interactionsMap,
  startBackofficeSalesTicketListener,
} from "./salesTicketListener";
import envs from "@platform/shared/env";
import { getSalesService } from "@platform/shared-context/firebaseContext";
import { pickUserWithRole } from "@/utils/pickUserWithRole";
import {
  calculateFinalCost,
  calculateFinalShippingCost,
  calculateTotalCommission,
  calculateTotalPoints,
} from "@/utils/saleCalculations";
import { roles } from "@platform/core/services/types.services";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from "discord.js";

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
      const saleId = channel.name.split("-")[1];
      console.log("saleId", saleId);

      // Retrieve sale data
      const sale = await salesService.getSaleById(saleId);

      // Send Welcome message to the channel
      channel.send(`Nuevo ticket de venta creado:`);

      // Select arbitrary manager to assign to the ticket
      const pickedManager = await pickUserWithRole({
        client: client,
        guildId: channel.guild.id,
        roleName: roles["Shipping-Manager"],
      });

      if (pickedManager)
        await channel.send(
          `${pickedManager.tag} fue seleccionado arbitrariamente como el manager de envios asignado a este ticket, pero cualquier manager puede tomar el control.`
        );

      // Send sale data to the channel
      const saleMessage = await channel.send(`
  🔹 **Código de seguimiento**: \`${saleId}\`
  
  🔸 **Vendedor**:
      - **Nombre**: \`${sale.salesman.name} ${sale.salesman.surname}\`
      - **ID**: \`${sale.salesman.id}\`
      - **Email**: \`${sale.salesman.email}\`
  
  🔸 **Cliente**:
      - **Nombre**: \`${sale.client.name}\`
      - **ID**: \`${sale.client.id}\`
      - **Teléfono**: \`${sale.client.phoneNumber}\`
      - **Email**: \`${sale.client.email}\`
      - **Dirección**: \`${sale.client.address}\`
      - **Notas**: \`${sale.client.addressNotes || "No especificadas"}\`
  
  🔸 **Productos**:
  ${sale.products
    .map(
      (product) => `   - **Nombre**: \`${product.productDetails.name}\`
      - **Cantidad**: \`${product.amount}\`
      - **Precio**: \`${product.productDetails.price}\`
      - **Comisión**: \`${product.productDetails.salesmanComission}\`
      - **Puntos**: \`${product.productDetails.points}\`
      - **Costo de envío individual**: \`${product.productDetails.shippingCost}\``
    )
    .join("\n")}
  
  🔸 **Estado**: \`${sale.status}\`
  
  📅 **Fecha de creación**: \`${new Date(sale.createDate).toLocaleString()}\`
  ✨ **Puntos totales**: \`${calculateTotalPoints(sale)}\`
  💰 **Comisión total**: \`${calculateTotalCommission(sale)}\`
  🚚 **Costo de envío final**: \`${calculateFinalShippingCost(sale)}\`
      - _El costo de envío final se calcula tomando el costo de envío más alto entre todos los productos._
  
  🛒 **Costo final**: \`${calculateFinalCost(sale)}\`
  `);

      // Pin the message with the sale data
      await saleMessage.pin();

      // send a set of buttons to the channel with some custom ids
      // to allow the user to change the status of the sale
      const statusButtons = [
        new ButtonBuilder()
          .setCustomId(interactionsMap.confirm_sale_button)
          .setLabel("Confirmar venta")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("✅"),
        new ButtonBuilder()
          .setCustomId(interactionsMap.request_sale_update_button)
          .setLabel("Solictar cambio")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔄"),
        new ButtonBuilder()
          .setCustomId(interactionsMap.reject_sale_button)
          .setLabel("Rechazar venta")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("❌"),
      ];

      const messages = await channel.messages.fetch({ limit: 100 });
      const buttonMessage = messages.find(
        (message) =>
          message.author.id === client.user!.id && message.components.length > 0
      );

      if (buttonMessage) {
        console.log("Open new sale ticket button already exists");
        return;
      }

      const row = new ActionRowBuilder().addComponents(statusButtons);

      const buttonsMessage = await (channel as TextChannel).send({
        content:
          "Selecciona una de las siguientes opciones para interactuar con el ticket:\n\n",
        components: [row as any],
      });

      // Pin the message with the buttons
      await buttonsMessage.pin();
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
