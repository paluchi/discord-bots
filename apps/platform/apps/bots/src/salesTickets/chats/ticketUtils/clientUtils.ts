import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Interaction,
  Message,
  TextChannel,
  TextInputStyle,
} from "discord.js";
import { ChatData, ClientData, ticketButtons } from "./types";
import { ChatApp } from "@platform/shared/framework/ChatApp";
import { getClientService } from "@platform/shared-context/firebaseContext";
import { ModalField, sendModal } from "@/utils/sendModal";
import { Client } from "@platform/core/domain/client";

import { sendDropdown } from "@/utils/sendDropdown";

const getMessageObject = async (interaction: Interaction, chatApp: ChatApp) => {
  // Get the channel from the interaction
  const channel = interaction.channel as TextChannel;

  // Get chatData from chatApp
  const stateManager = await chatApp.getStateManager();
  const chatData = (await stateManager!.getChatData(channel.id)) as ChatData;

  // Check if the message ID exists
  const messageId = chatData.setClientMessageId;
  if (!messageId) {
    throw new Error("Message ID not found in chat data.");
  }

  // Fetch the specific message by ID
  const message = await channel.messages.fetch(messageId);

  return { message, chatData };
};

export const displayClientData = async (
  message: Message,
  chatData?: ChatData
) => {
  let embed;
  let components;

  if (!chatData) {
    // Embed when no client is selected
    embed = new EmbedBuilder()
      .setTitle("No se seleccionó un cliente")
      .setDescription("Aquí se mostrarán los datos del cliente.")
      .setColor(0xff0000); // Red color for no client

    // Buttons for selecting or adding a client when no client is selected
    components = [
      new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setCustomId(ticketButtons["add_client"])
          .setLabel("Agregar cliente")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("➕"),
        new ButtonBuilder()
          .setCustomId(ticketButtons["select_client"])
          .setLabel("Seleccionar cliente")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🔽"),
      ]) as any,
    ];
  } else {
    // Embed with client data
    embed = new EmbedBuilder()
      .setTitle("Datos del Cliente")
      .setColor(0x00ff00) // Green color for a selected client
      .addFields(
        {
          name: "Nombre",
          value: chatData.client?.name || "Sin nombre",
          inline: true,
        },
        {
          name: "Teléfono",
          value: chatData.client?.phoneNumber || "Sin teléfono",
          inline: true,
        },
        {
          name: "Email",
          value: chatData.client?.email || "Sin email",
          inline: true,
        },
        {
          name: "Dirección",
          value: chatData.client?.address || "Sin dirección",
          inline: true,
        },
        {
          name: "Notas de dirección",
          value: chatData.client?.addressNotes || "Sin notas de dirección",
          inline: true,
        }
      );

    // Buttons for unselecting or updating the client when a client is selected
    components = [
      new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setCustomId(ticketButtons["unselect_client"])
          .setLabel("Borrar selección")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🗑"),
        new ButtonBuilder()
          .setCustomId(ticketButtons["update_client"])
          .setLabel("Actualizar datos")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔧"),
      ]) as any,
    ];
  }

  // Update the existing message with the embed and the appropriate buttons
  await message!.edit({
    embeds: [embed],
    components: components,
  });

  return message;
};

export const handleAddClient = async (
  interaction: ButtonInteraction,
  chatApp: ChatApp
) => {
  // Define modal fields for client data
  const fields: ModalField[] = [
    {
      customId: "client_name",
      label: "Nombre completo del cliente",
      style: TextInputStyle.Short,
      placeholder: "Ej: Juan Pérez",
    },
    {
      customId: "client_phone",
      label: "Número de teléfono del cliente",
      style: TextInputStyle.Short,
      placeholder: "Ej: +541112345678",
    },
    {
      customId: "client_email",
      label: "Email del cliente",
      style: TextInputStyle.Short,
      placeholder: "Ej: cliente@example.com",
    },
    {
      customId: "client_address",
      label: "Dirección del cliente",
      style: TextInputStyle.Short,
      placeholder: "Ej: Av. Siempre Viva 123",
    },
    {
      customId: "client_notes",
      label: "Notas adicionales",
      style: TextInputStyle.Paragraph,
      placeholder: "Ej: Timbre, Piso 4",
      required: false, // Optional field
    },
  ];

  // Trigger the modal with the defined fields
  const modalResult = await sendModal({
    interaction,
    customId: "add_client_modal",
    title: "Agregar nuevo cliente",
    fields,
  });

  if (!modalResult) {
    await interaction.followUp({
      content: "❌ Se canceló la operación de agregar cliente.",
      ephemeral: true,
    });
    return;
  }

  // Handle modal result (client data)

  const clientData: Omit<ClientData, "clientId"> = {
    name: modalResult["client_name"],
    phoneNumber: modalResult["client_phone"],
    email: modalResult["client_email"],
    address: modalResult["client_address"],
    addressNotes: modalResult["client_notes"] || "",
    salesmanId: interaction.user.id, // Assuming the requester's user ID is used
  };

  const clientService = await getClientService();

  try {
    // Store client data using service and get clientId
    const newClient: Client = await clientService.createClient(clientData);

    // Now that we have clientId, we update the clientData with it
    const formattedClient: ClientData = {
      ...clientData,
      clientId: newClient.id, // Add the clientId from the newly created client
    };

    const stateManager = await chatApp.getStateManager()!;

    // Store the client data in chat data
    await stateManager.updateChatData(interaction.channel!.id, {
      client: formattedClient,
    });

    const chatData = (await stateManager.getChatData(
      interaction.channel!.id
    )) as ChatData;

    await interaction.followUp({
      content: "✅ Cliente agregado correctamente.",
      ephemeral: true,
    });

    // Update the message with the new client data
    const { message } = await getMessageObject(interaction, chatApp);

    await displayClientData(message, chatData);
  } catch (error) {
    console.error("Error creating client:", error);
    await interaction.followUp({
      content:
        "Hubo un error al guardar los datos del cliente! Por favor intenta nuevamente más tarde.\nSi el problema persiste, contacta a un moderador.",
      ephemeral: true,
    });
  }
};

export const handleUnselectClient = async (
  interaction: ButtonInteraction,
  chatApp: ChatApp
) => {
  const stateManager = await chatApp.getStateManager()!;
  await stateManager.updateChatData(interaction.channel!.id, {
    client: undefined,
  });

  const { message } = await getMessageObject(interaction, chatApp);

  await displayClientData(message);

  interaction.reply({
    content: "✅ Cliente Desvinculado.",
    ephemeral: true,
  });
};

export const handleSelectClient = async (
  interaction: ButtonInteraction,
  chatApp: ChatApp
) => {
  const stateManager = await chatApp.getStateManager()!;

  const clientService = await getClientService();

  const clients = await clientService.findClientsBySalesmanId(
    interaction.user.id
  );

  const clientOptions = clients.map((client) => ({
    label: `${client.name} - ${client.phoneNumber}`,
    description: client.address,
    value: client.id,
  }));

  const res = await sendDropdown({
    options: clientOptions,
    interaction,
    customId: "menu_custom_id",
  });

  if (!res) return;

  const selectedClient = clients.find((client) => client.id === res);

  if (!selectedClient) {
    await interaction.followUp({
      content: "❌ Cliente no encontrado.",
      ephemeral: true,
    });
    return;
  }

  await stateManager.updateChatData(interaction.channel!.id, {
    client: {
      clientId: selectedClient.id,
      name: selectedClient.name,
      phoneNumber: selectedClient.phoneNumber,
      email: selectedClient.email,
      address: selectedClient.address,
      addressNotes: selectedClient.addressNotes,
      salesmanId: selectedClient.salesmanId,
    },
  });

  const updatedChatData = (await stateManager.getChatData(
    interaction.channel!.id
  )) as ChatData;

  const { message } = await getMessageObject(interaction, chatApp);

  await displayClientData(message, updatedChatData);

  await interaction.followUp({
    content: "✅ Cliente seleccionado correctamente.",
    ephemeral: true,
  });
};

export const handleUpdateClient = async (
  interaction: ButtonInteraction,
  chatApp: ChatApp
) => {
  const { message, chatData } = await getMessageObject(interaction, chatApp);

  if (!chatData?.client) {
    await interaction.followUp({
      content: "❌ No hay cliente seleccionado.",
      ephemeral: true,
    });
    return;
  }

  const fields: ModalField[] = [
    {
      customId: "client_name",
      label: "Nombre completo del cliente",
      style: TextInputStyle.Short,
      placeholder: "Ej: Juan Pérez",
      value: chatData.client.name,
    },
    {
      customId: "client_phone",
      label: "Número de teléfono del cliente",
      style: TextInputStyle.Short,
      placeholder: "Ej: +541112345678",
      value: chatData.client.phoneNumber,
    },
    {
      customId: "client_email",
      label: "Email del cliente",
      style: TextInputStyle.Short,
      placeholder: "",
      value: chatData.client.email,
    },
    {
      customId: "client_address",
      label: "Dirección del cliente",
      style: TextInputStyle.Short,
      placeholder: "Ej: Av. Siempre Viva 123",
      value: chatData.client.address,
    },
    {
      customId: "client_notes",
      label: "Notas adicionales",
      style: TextInputStyle.Paragraph,
      placeholder: "Ej: Timbre, Piso 4",
      value: chatData.client.addressNotes,
      required: false,
    },
  ];

  const modalResult = await sendModal({
    interaction,
    customId: "update_client_modal",
    title: "Actualizar datos del cliente",
    fields,
  });

  if (!modalResult) {
    await interaction.followUp({
      content: "❌ Se canceló la operación de actualizar cliente.",
      ephemeral: true,
    });
    return;
  }

  const clientData: ClientData = {
    name: modalResult["client_name"],
    phoneNumber: modalResult["client_phone"],
    email: modalResult["client_email"],
    address: modalResult["client_address"],
    addressNotes: modalResult["client_notes"] || "",
    salesmanId: interaction.user.id,
    clientId: chatData.client.clientId,
  };

  const clientService = await getClientService();

  try {
    await clientService.updateClient(clientData.clientId, clientData);

    const stateManager = await chatApp.getStateManager()!;

    await stateManager.updateChatData(interaction.channel!.id, {
      client: clientData,
    });

    const updatedChatData = (await stateManager.getChatData(
      interaction.channel!.id
    )) as ChatData;

    await displayClientData(message, updatedChatData);

    await interaction.followUp({
      content: "✅ Cliente actualizado correctamente.",
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error updating client:", error);
    await interaction.followUp({
      content:
        "Hubo un error al actualizar los datos del cliente! Por favor intenta nuevamente más tarde.\nSi el problema persiste, contacta a un moderador.",
      ephemeral: true,
    });
  }
};
