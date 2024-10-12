import * as functions from "firebase-functions";
import getChatApp from "@platform/shared-context/bots/getChatApp";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import SaleModel from "@platform/database/models/Sale";
import {
  getCatalogueService,
  getSalesmanService,
  getSalesService,
} from "@platform/shared-context/firebaseContext";
import {
  calculateTotalPoints,
  calculateTotalCommission,
} from "@platform/shared/saleCalculations";

const closeTicketCustomId = "close-salesman-ticket";

// Get zen quote from GET https://zenquotes.io/api/random
const getZenQuote = async () => {
  try {
    const response = await fetch("https://zenquotes.io/api/random");
    const data = await response.json();
    return data[0].q;
  } catch (error) {
    return "";
  }
};


// onSaleStatusUpdate_BT // bring tech
// onSaleStatusUpdate_GH // gold hash

export const onSaleStatusUpdate_GH = functions.firestore
  .document("sales/{saleId}")
  .onUpdate(async (change, context) => {
    try {
      const newValue = change.after.data() as SaleModel;
      const previousValue = change.before.data() as SaleModel;

      const status = newValue.status;
      const transactionalStatus = newValue.transactionalStatus;

      // Check if the status field has been updated
      if (
        status === previousValue.status &&
        transactionalStatus === previousValue.transactionalStatus
      )
        return;

      const salesService = await getSalesService();
      const salesmanService = await getSalesmanService();
      const catalogueService = await getCatalogueService();

      const ticketsChat = await getChatApp("TICKETS_BOT", true);
      const ticketsClient = ticketsChat.getClient();

      // get channel by salesmanCommunicationGatewayId
      const salesmanCommunicationGatewayId =
        newValue.details.salesmanCommunicationGatewayId!;

      const salesmanChannel = (await ticketsClient.channels.fetch(
        salesmanCommunicationGatewayId
      )) as TextChannel;

      const backofficeTicketsChat = await getChatApp(
        "BACKOFFICE_SALES_TICKETS_BOT",
        true
      );
      const backofficeTicketsClient = backofficeTicketsChat.getClient();

      // Get thread by backofficeCommunicationGatewayId
      const backofficeCommunicationGatewayId =
        newValue.details.backofficeCommunicationGatewayId!;

      const backofficeThread = (await backofficeTicketsClient.channels.fetch(
        backofficeCommunicationGatewayId
      )) as ThreadChannel;

      if (status === "completed") {
        if (transactionalStatus === "send-salesman-message") {
          // Get sale
          const sale = await salesService.getSaleById(newValue.id);

          const salesmanPoints = calculateTotalPoints(sale);
          const salesmanCommission = calculateTotalCommission(sale);

          // Get zen quotes
          const zenQuote = await getZenQuote();

          // Send message to the channel telling the sale has been completed
          await salesmanChannel.send(
            `**Se completó la venta! 🎉**\n\n**ID de la venta:** \'${newValue.id}\'

**Puntos totales obtenidos:** ${salesmanPoints} puntos
**Comisión total obtenida:** $${salesmanCommission}

${zenQuote.length > 0 ? `**Frase zen motivadora:**\n\'${zenQuote}\'` : ""}
            `
          );

          // Send close button
          const row = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
              .setCustomId(closeTicketCustomId)
              .setLabel("Finalizar ticket")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("⭐"),
          ]);

          await salesmanChannel.send({
            components: [row as any],
          });

          await salesService.updateSale(newValue.id, {
            transactionalStatus: "awaiting-ticket-archivation",
          });

          await salesmanService.sumPoints(sale.salesman.id, salesmanPoints);
        }
      } else if (status === "canceled") {
        const sale = await salesService.getSaleById(newValue.id);

        if (transactionalStatus === "send-salesman-message") {
          await catalogueService.addStock(
            sale.products.map((product) => ({
              productId: product.productId,
              amount: product.amount,
            }))
          );

          // Send message to the channel telling the sale has been completed
          await salesmanChannel.send(
            `Se canceló la venta! 😢\n\n**ID de la venta:** \'${newValue.id}\'

**Razón de la cancelación:** \n\'${newValue.details.backofficeCancelReason}\'

Si necesitas mas información, comunicate con el manager de ventas designado a este ticket.`
          );

          // Send close button
          const row = new ActionRowBuilder().addComponents([
            new ButtonBuilder()
              .setCustomId(closeTicketCustomId)
              .setLabel("Finalizar ticket")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("❤️‍🩹"),
          ]);

          await salesmanChannel.send({
            components: [row as any],
          });
        }
      } else if (status === "backoffice-update-request") {
        // Send message to the channel telling the sale has been completed
        await salesmanChannel.send(
          `**Se solicitó una actualización de la venta! 🔄**\n\n**ID de la venta:** ${newValue.id}

**Razon de la solicitud:** \n\`${newValue.details.backofficeUpdateRequest}\`

Si necesitas mas información, comunicate con el manager de ventas designado a este ticket.
`
        );

        // Send close button
        const row = new ActionRowBuilder().addComponents([
          new ButtonBuilder()
            .setCustomId(closeTicketCustomId)
            .setLabel("Iniciar proceso de actualización")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔄"),
        ]);

        await salesmanChannel.send({
          components: [row as any],
        });
      } else if (status === "salesman-update-request") {
        // Send message to the channel telling the sale has been completed
        await backofficeThread.send(
          `**Se solicitó una actualización de la venta! 🔄**\n\n**ID de la venta:** \'${newValue.id}\'

**Razon de la solicitud:** \n\`${newValue.details.salesmanUpdateRequest}\`

Si necesitas mas información, comunicate con el vendedor al siguiente canal: <#${salesmanChannel.id}>
`
        );

        // Send close button
        const row = new ActionRowBuilder().addComponents([
          new ButtonBuilder()
            .setCustomId("accept-salesman-update")
            .setLabel("Aceptar actualización")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔄"),
          new ButtonBuilder()
            .setCustomId("deny-salesman-update")
            .setLabel("Denegar y cancelar venta")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🚫"),
        ]);

        await backofficeThread.send({
          components: [row as any],
        });
      } else if (status === "processing") {
        // pass
      } else {
        console.error("Unhandled status: ", newValue);
      }

      if (transactionalStatus === "awaiting-ticket-archivation") {
        // Pass
      } else if (transactionalStatus === "ticket-archived") {
        // Send message to the channel telling the sale has been completed and archive it
        await backofficeThread.send(
          `**La venta ha sido archivada! 📂**\n\n**ID de la venta:** \'${newValue.id}\'`
        );

        // Archive the thread
        await backofficeThread.setArchived(true);
      }

      return;
    } catch (error) {
      console.error("Error in onSaleStatusUpdate:", error);
      return;
    }
  });
