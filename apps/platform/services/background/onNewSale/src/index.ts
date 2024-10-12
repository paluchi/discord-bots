import functions from "firebase-functions";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { getSalesService } from "@platform/shared-context/firebaseContext";
import getChatApp from "@platform/shared-context/bots/getChatApp";
import envs from "@platform/shared/env";
import SaleModel from "@platform/database/models/Sale";
import { pickUserWithRole } from "@platform/shared/discordUtils/pickUserWithRole";

import {
  calculateFinalCost,
  calculateFinalShippingCost,
  calculateTotalCommission,
  calculateTotalPoints,
} from "@platform/shared/saleCalculations";
import { roles } from "@platform/core/services/types.services";

export const interactionsMap = {
  confirm_sale_button: "confirm_sale_button",
  request_sale_update_button: "request_sale_update_button",
  reject_sale_button: "reject_sale_button",
};

const sendMessages = async (thread: ThreadChannel, saleModel: SaleModel) => {
  // Send Welcome message to the channel
  thread.send(`Nuevo ticket de venta creado:`);

  const salesService = await getSalesService();
  const sale = await salesService.getSaleById(saleModel.id);

  const client = thread.client;

  // Select arbitrary manager to assign to the ticket
  const pickedManager = await pickUserWithRole({
    client: client,
    guildId: thread.guild.id,
    roleName: roles["Shipping-Manager"],
  });

  if (pickedManager)
    await thread.send(
      `${pickedManager.tag} fue seleccionado arbitrariamente como el manager de envios asignado a este ticket, pero cualquier manager puede tomar el control.`
    );

  // Send sale data to the channel
  const saleMessage = await thread.send(`
🔹 **Código de seguimiento**: \`${(await sale).id}\`

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
    // new ButtonBuilder()
    //   .setCustomId(interactionsMap.request_sale_update_button)
    //   .setLabel("Solictar cambio")
    //   .setStyle(ButtonStyle.Primary)
    //   .setEmoji("🔄"),
    new ButtonBuilder()
      .setCustomId(interactionsMap.reject_sale_button)
      .setLabel("Rechazar venta")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("❌"),
  ];

  const row = new ActionRowBuilder().addComponents(statusButtons);

  const buttonsMessage = await thread.send({
    content:
      "Selecciona una de las siguientes opciones para interactuar con el ticket:\n\n",
    components: [row as any],
  });

  // Pin the message with the buttons
  await buttonsMessage.pin();
};

// onNewSale_BT // bring tech
// onNewSale_GH // gold hash

export const onNewSale_GH = functions.firestore
  .document("sales/{saleId}")
  .onCreate(async (snap, context) => {
    try {
      // Get the sale data
      const newSaleData = snap.data() as SaleModel;

      const backofficeSaleschatApp = await getChatApp(
        "BACKOFFICE_SALES_TICKETS_BOT",
        true
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

      // Send messages to the thread
      await sendMessages(newThread, newSaleData);

      const salesService = await getSalesService();
      await salesService.updateSale(newSaleData.id, {
        details: {
          backofficeCommunicationMethod: "discord-thread",
          backofficeCommunicationGatewayId: newThread.id,
        },
        status: "processing",
        transactionalStatus: "awaiting-request-feedback",
      });

      // Example: You could add logic to update a summary document, notify users, etc.
    } catch (error) {
      console.log("error", error);
    }
  });
