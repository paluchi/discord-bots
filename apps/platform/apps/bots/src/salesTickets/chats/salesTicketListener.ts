import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Events,
  GuildChannel,
  Interaction,
  PermissionsBitField,
  TextChannel,
} from "discord.js";
import { getChatApp } from "../shared/chatApp";
import envs from "@platform/shared/env";

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

export async function startSalesTicketListener() {
  try {
    const chatApp = await getChatApp();

    const client = chatApp.getClient();

    client.once(Events.ClientReady, async () => {
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
              message.author.id === client.user!.id &&
              message.components.length > 0
          );

          if (buttonMessage) {
            console.log("Open new sale ticket button already exists");
            return;
          }

          const button = new ButtonBuilder()
            .setCustomId("create_ticket_button")
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
    });

    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
      if (!interaction.isButton()) return;

      // Check if custom ID is the one we're expecting
      if (interaction.customId !== "create_ticket_button") return;

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

      const { customId } = interaction;

      if (customId === "create_ticket_button") {
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
      }
    });
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}
