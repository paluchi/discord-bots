import getChatApp from "@platform/shared-context/bots/getChatApp";
import {
  getCatalogueService,
  getSalesService,
} from "@platform/shared-context/firebaseContext";
import envs from "@platform/shared/env";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChannelType,
  Client,
  EmbedBuilder,
  GuildChannel,
  PermissionsBitField,
  StringSelectMenuBuilder,
  TextChannel,
  TextInputStyle,
} from "discord.js";
import {
  channelTopicsMap,
  ChatData,
  interactionButtons,
  ticketButtons,
} from "./types";
import { displayClientData } from "./clientUtils";
import {
  calculateFinalCost,
  calculateTotalCommission,
  calculateTotalPoints,
} from "@platform/shared/saleCalculations";
import { pickUserWithRole } from "@platform/shared/discordUtils/pickUserWithRole";
import { ChatApp } from "@platform/shared/framework/ChatApp";
import { Category } from "@platform/core/domain/catalogue";
import { sendDropdown } from "@/utils/sendDropdown";
import { sendModal } from "@/utils/sendModal";
import { sendButtons } from "@/utils/sendButtons";
import { check } from "prettier";

export const onChannelCreate = async (channel: TextChannel) => {
  const chatApp = await getChatApp("TICKETS_BOT");
  const stateManager = await chatApp.getStateManager();

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_sale")
      .setLabel("Confirmar venta")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✅"),
    new ButtonBuilder()
      .setCustomId("discard_ticket")
      .setLabel("Cancelar venta")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑")
  );

  // Send both the select menu and buttons in the same message
  const finishMessage = await channel.send({
    content: "Elige una opción y confirma la venta:",
    components: [buttonRow], // Dropdown and buttons on separate rows
  });

  // Set the channel topic to initiated
  await channel.setTopic(channelTopicsMap.initiated);

  const setClientMessage = await channel.send({
    content: "",
    components: [
      new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setCustomId(ticketButtons["select_client"])
          .setLabel("Seleccionar cliente")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔽"),
        new ButtonBuilder()
          .setCustomId(ticketButtons["add_client"])
          .setLabel("Agregar cliente")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("➕"),
      ]) as any,
    ],
  });

  await displayClientData(setClientMessage, undefined);

  const addProductMessage = await channel.send({
    content: "",
    components: [
      new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setCustomId(ticketButtons["add_product"])
          .setLabel("Agregar producto")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🛒"),
      ]) as any,
    ],
  });

  const productsDataMessage = await channel.send({
    content: "\n**Aqui se mostrarán los productos que agregaste a la venta.**",
  });

  const chatData = await stateManager!.getChatData(channel.id);
  await stateManager!.setChatData(channel.id, {
    ...chatData,
    setClientMessageId: setClientMessage.id,
    addProductMessageId: addProductMessage.id,
    productsDataMessageId: productsDataMessage.id,
    finishMessageId: finishMessage.id,
  });
};

export const onClientReady = async (client: Client) => {
  // Send the message with the button on bot initialization
  const channel = client.channels.cache.get(
    envs.SALES_REQUEST_CHANNEL_ID
  ) as TextChannel;

  if (channel) {
    try {
      // Fetch the last 100 messages in the channel
      const messages = await channel.messages.fetch({ limit: 100 });
      const buttonMessage = messages.find(
        (message) =>
          message.author.id === client.user!.id && message.components.length > 0
      );

      if (buttonMessage) {
        console.log("Open new sale ticket button already exists");
        return;
      }

      const button = new ButtonBuilder()
        .setCustomId(interactionButtons["create-ticket-button"])
        .setLabel("Abrir nuevo ticket de venta")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📩");

      const row = new ActionRowBuilder().addComponents(button);

      (channel as any).send({
        content:
          "Hola comunidad! 👋\n\n Soy el nuevo manager de ventas. Si necesitas ayuda con una venta, por favor abre un nuevo ticket presionando el botón de abajo, y estaré encantado de ayudarte a ejecutar tus ventas!\n\n",
        components: [row],
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  } else {
    console.error("Channel not found");
  }
};

// TODO - Implement the function to get the open sales channels by salesman
// Below method is not working as expected
const getOpenSalesChannelsBySalesman = async (
  userId: string,
  guild: any
): Promise<number> => {
  // Fetch all channels in the guild
  await guild.channels.fetch();

  // Filter channels that belong to the specific category and have the desired name format
  const openSalesChannels = guild.channels.cache.filter(
    (channel: GuildChannel) => {
      return (
        channel.parentId === envs.OPEN_SALES_CATEGORY_ID &&
        channel.name.includes(`ticket-${userId}`)
      );
    }
  );

  return openSalesChannels.size;
};

export const onCreateTicketButtonClick = async (
  interaction: ButtonInteraction<CacheType>
) => {
  const openSalesChannels = await getOpenSalesChannelsBySalesman(
    interaction.user.id,
    interaction.guild
  );

  if (openSalesChannels >= 30) {
    await interaction.reply({
      content: `⚠️ Alcanzaste el límite de tickets abiertos al mismo tiempo (${openSalesChannels}). Contacta a un moderador si necesitas ayuda o crees que es un error.`,
      ephemeral: true,
    });
    return;
  }

  const category = interaction.guild!.channels.cache.get(
    envs.OPEN_SALES_CATEGORY_ID
  );

  if (category && category.type === ChannelType.GuildCategory) {
    // Convert the Collection to an array of PermissionOverwrites
    const categoryPermissions = Array.from(
      category.permissionOverwrites.cache.values()
    );

    // Create a new array for channel permissions, starting with category permissions
    const channelPermissions: any = [...categoryPermissions];

    // Add specific permission for the user who clicked the button
    channelPermissions.push({
      id: interaction.user.id,
      allow: [PermissionsBitField.Flags.ViewChannel],
    });

    // Create the new channel with the adjusted permissions
    const newChannel = await interaction.guild!.channels.create({
      name: `ticket-${interaction.user.id}`,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: channelPermissions,
    });

    await interaction.reply({
      content: `Channel created: ${newChannel}`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: "Category not found or is not a category type",
      ephemeral: true,
    });
  }
};

export const closeSalesmanTicket = async (
  interaction: ButtonInteraction<CacheType>
) => {
  await interaction.deferReply({ ephemeral: true }); // Defer reply to avoid timeout

  // Get pinned messages
  const pinnedMessages = await interaction.channel!.messages.fetchPinned();

  // Get first pinned message
  // From first pinned message, get the sales ID by splitting the content by ":" and getting the second part
  const saleId = pinnedMessages.first()?.content.split(":")[1].trim()!;

  // Get interaction channel
  const channel = interaction.channel as TextChannel;

  const salesService = await getSalesService();

  await salesService.updateSale(saleId, {
    transactionalStatus: "ticket-archived",
  });

  await interaction.editReply({
    content: "Cerrando ticket...",
  });

  // Await 7 seconds
  await new Promise((resolve) => setTimeout(resolve, 7000));

  // Delete the channel
  await channel.delete();
};

export const handleDiscardTicket = async (interaction: ButtonInteraction) => {
  const channel = interaction.channel as TextChannel;

  await interaction.reply({
    content: "Venta cancelada.",
    ephemeral: true,
  });

  await interaction.editReply({
    content: "Cerrando ticket...",
  });

  // Await 5 seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Delete the channel
  await channel.delete();
};

export const handleConfirmSale = async (
  interaction: ButtonInteraction,
  chatApp: ChatApp
) => {
  const channel = interaction.channel as TextChannel;

  // Get the chat data using the state manager
  const stateManager = await chatApp.getStateManager()!;
  const chatData = (await stateManager.getChatData(channel.id)) as ChatData;

  // Ensure that necessary client and product information is present in the chatData
  const { client, products } = chatData;

  if (!client) {
    return interaction.reply({
      content:
        "No se ha seleccionado ningún cliente. Por favor selecciona un cliente antes de confirmar la venta.",
      ephemeral: true,
    });
  }

  if (!products || Object.keys(products).length === 0) {
    return interaction.reply({
      content:
        "No se ha agregado ningún producto a la venta. Por favor agrega productos antes de confirmar la venta.",
      ephemeral: true,
    });
  }

  // Proceed to process the sale
  try {
    await interaction.reply({
      content: "Gracias por la información! Estoy procesando tu venta...",
      ephemeral: true,
    });

    const salesService = await getSalesService();

    // Create the sale with the necessary information
    const saleRes = await salesService.createSale({
      salesmanId: interaction.user.id,
      clientId: client.clientId,
      details: {
        processVersion: 1,
        salesmanCommunicationGatewayId: channel.id,
      },
      products: Object.values(products).map((product) => ({
        productId: product.id,
        amount: product.amount,
      })),
    });

    if (!saleRes.success) {
      let negativeStockFound = false;

      for (const error of saleRes.errors || []) {
        if (error.code === "NEGATIVE_STOCK") {
          negativeStockFound = true;
          const productName = products[error.productId].name;
          await interaction.followUp({
            content: `No hay suficiente stock para el producto '${productName}'. Parece que alguien se te adelantó.`,
            ephemeral: true,
          });
        }
      }

      if (negativeStockFound) {
        await interaction.followUp({
          content: "Lamentamos el inconveniente. Por favor intenta nuevamente.",
          ephemeral: true,
        });
        return; // Add return here to end the function
      } else {
        await interaction.followUp({
          content:
            "Hubo un error al procesar tu venta. Intenta nuevamente más tarde.",
          ephemeral: true,
        });
        return; // Add return here to end the function
      }
    }

    // Sale successfully processed
    await interaction.followUp({
      content: `Venta procesada correctamente. Código de seguimiento: \`${saleRes.sale!.id}\``,
      ephemeral: true,
    });

    const productSummary = saleRes
      .sale!.products.map(
        (product) =>
          `- ${product.amount} x **${products[product.productId].name}**`
      )
      .join("\n");

    // Create the sale summary as an embed
    const saleEmbed = new EmbedBuilder()
      .setTitle("Resumen de la Venta")
      .setColor(0x00ff00) // You can choose a suitable color
      .addFields(
        {
          name: "Código de seguimiento",
          value: `\`${saleRes.sale!.id}\``,
          inline: false,
        },
        { name: "Cliente", value: `\`${client!.name}\``, inline: false },
        { name: "Productos", value: productSummary, inline: false },
        {
          name: "Total",
          value: `\`${calculateFinalCost(saleRes.sale!)}\``,
          inline: true,
        },
        {
          name: "Comisión",
          value: `\`${calculateTotalCommission(saleRes.sale!)}\``,
          inline: true,
        },
        {
          name: "Puntos totales",
          value: `\`${calculateTotalPoints(saleRes.sale!)}\``,
          inline: true,
        }
      )
      .setTimestamp();

    // Send the embed as a message (not ephemeral)
    const embedMessage = await channel.send({ embeds: [saleEmbed] });

    // Store the message ID of the embed in chatData
    chatData.saleSummaryMessageId = embedMessage.id;
    await stateManager.setChatData(channel.id, chatData);

    // Optionally assign a sales manager to the ticket
    const pickedManager = await pickUserWithRole({
      client: interaction.client,
      guildId: interaction.guildId!,
      roleName: "Sales-Manager",
    });

    if (pickedManager) {
      await interaction.followUp({
        content: `${pickedManager.tag} es el manager de ventas asignado a tu ticket.`,
        ephemeral: true,
      });
    }

    // Update the channel topic to indicate the sale is being processed
    channel.setTopic(channelTopicsMap.processing);
    return;
  } catch (error) {
    console.error("Error processing sale:", error);
    await interaction.followUp({
      content:
        "Ocurrió un error al procesar tu venta. Intenta nuevamente más tarde.",
      ephemeral: true,
    });
    return;
  }
};

export const handleAddProduct = async (
  interaction: ButtonInteraction,
  chatApp: ChatApp
) => {
  await interaction.deferReply({ ephemeral: true });

  const catalogueService = await getCatalogueService();

  const catalogue = await catalogueService.getFullCatalogue();

  const stateManager = await chatApp.getStateManager()!;

  // Filter out products with 0 stock or display false
  const filteredCategories = catalogue.categories.reduce(
    (acc: Category[], category) => {
      const products = category.products.filter(
        (product) => product.stock > 0 && product.display
      );
      if (products.length > 0) acc.push({ ...category, products });
      return acc;
    },
    [] as Category[]
  );

  // Create dropdown options for categories
  const categoryOptions = filteredCategories.map(({ name, ...props }) => ({
    label: name,
    description: props.description || "Sin descripción",
    value: props.id,
  }));

  // Step 1: Ask for the category
  const selectedCategoryId = await sendDropdown({
    options: categoryOptions,
    interaction,
    customId: "category_select",
  });

  if (!selectedCategoryId) {
    await interaction.followUp({
      content: "❌ No seleccionaste ninguna categoría.",
      ephemeral: true,
    });
    return;
  }

  const selectedCategory = filteredCategories.find(
    (category) => category.id === selectedCategoryId
  );

  if (!selectedCategory) {
    await interaction.followUp({
      content: "❌ Categoría no encontrada.",
      ephemeral: true,
    });
    return;
  }

  // Step 2: Ask for the product
  const productOptions = selectedCategory.products.map((product) => ({
    label: `${product.name} (Stock: ${product.stock})`,
    description: product.description || "Sin descripción",
    value: product.id,
  }));

  const selectedProductId = await sendDropdown({
    options: productOptions,
    interaction,
    customId: "product_select",
  });

  if (!selectedProductId) {
    await interaction.followUp({
      content: "❌ No seleccionaste ningún producto.",
      ephemeral: true,
    });
    return;
  }

  const selectedProduct = selectedCategory.products.find(
    (product) => product.id === selectedProductId
  );

  if (!selectedProduct) {
    await interaction.followUp({
      content: "❌ Producto no encontrado.",
      ephemeral: true,
    });
    return;
  }

  // Step 3: Show the modal to input the amount sold using your modal helper
  const fields = [
    {
      customId: "amount_input",
      label: `¿Cuántas unidades vendiste?`,
      style: TextInputStyle.Short,
      placeholder: `Stock disponible: ${selectedProduct.stock}`,
      required: true,
      checker: (input: string) => {
        const amount = parseInt(input);
        return !isNaN(amount) && amount > 0 && amount <= selectedProduct.stock
          ? true
          : `Cantidad inválida. Stock disponible: ${selectedProduct.stock}`;
      },
    },
  ];

  // Display confirm the product with 2 buttons for confirmation and cancellation
  // Display embed with the product information

  const productEmbed = new EmbedBuilder()
    .setTitle(selectedProduct.name)
    .setDescription(selectedProduct.description || "Sin descripción")
    .setColor(0x00ff00)
    .addFields(
      { name: "Precio", value: `\`${selectedProduct.price}\``, inline: true },
      { name: "Stock", value: `\`${selectedProduct.stock}\``, inline: true },
      {
        name: "Categoría",
        value: `\`${selectedCategory.name}\``,
        inline: true,
      },
      { name: "Comisión", value: `\`${selectedProduct.salesmanComission}\`` },
      { name: "Puntos por venta", value: `\`${selectedProduct.points}\`` },
      { name: "Costo de envio", value: `\`${selectedProduct.shippingCost}\`` }
    )
    .setTimestamp();

  const res = await sendButtons({
    interaction,
    buttons: [
      {
        label: "Confirmar",
        customId: "confirm_product",
        style: ButtonStyle.Primary,
        emoji: "✅",
      },
      {
        label: "Cancelar",
        customId: "cancel_product",
        style: ButtonStyle.Danger,
        emoji: "🗑",
      },
    ],
    embeds: [productEmbed],
    content: `🛒 ${selectedProduct.name} seleccionado.`,
    ephemeral: true,
    timeout: 60000, // Optional, default is 60s
  });

  if (!res) {
    await interaction.followUp({
      content: "❌ El tiempo para confirmar el producto ha expirado.",
      ephemeral: true,
    });
    return;
  } else if (res.customId === "cancel_product") {
    await interaction.followUp({
      content: "❌ Producto cancelado.",
      ephemeral: true,
    });
    return;
  }

  const modalResult = await sendModal({
    interaction: res!.interaction,
    customId: "product_amount_modal",
    title: "Cantidad de Productos Vendidos",
    fields,
  });

  if (!modalResult || !modalResult.amount_input) {
    await res!.interaction.followUp({
      content: "❌ El tiempo para ingresar la cantidad ha expirado.",
      ephemeral: true,
    });
    return;
  }

  const amount = parseInt(modalResult.amount_input);

  if (isNaN(amount) || amount <= 0) {
    await res!.interaction.followUp({
      content: "❌ Cantidad ingresada no es válida.",
      ephemeral: true,
    });
    return;
  }

  if (amount > selectedProduct.stock) {
    await res!.interaction.followUp({
      content: `❌ No hay suficiente stock. Stock disponible: ${selectedProduct.stock}.`,
      ephemeral: true,
    });
    return;
  }

  // Update the chat data with the selected product and amount
  await stateManager.updateChatData(
    interaction.channel!.id,
    (chatData: ChatData) => ({
      ...chatData,
      products: {
        ...chatData.products,
        [selectedProduct.id]: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          amount: amount,
        },
      },
    })
  );

  await res!.interaction.followUp({
    content: `✅ ${amount} unidades de ${selectedProduct.name} agregadas a la venta.`,
    ephemeral: true,
  });
};
