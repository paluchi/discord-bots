import {
  ButtonInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  InteractionReplyOptions,
  MessageComponentInteraction,
  EmbedBuilder,
  ButtonStyle,
} from "discord.js";

interface ButtonConfig {
  label: string;
  customId: string;
  style: ButtonStyle;
  emoji?: string;
}

interface DisplayButtonsConfig {
  interaction: ButtonInteraction;
  buttons: ButtonConfig[];
  embeds?: EmbedBuilder[];
  content?: string;
  timeout?: number; // Timeout in ms, default 60 seconds
  ephemeral?: boolean;
}

export async function sendButtons({
  interaction,
  buttons,
  embeds = [],
  content = "",
  timeout = 60000, // default to 60s
  ephemeral = true,
}: DisplayButtonsConfig): Promise<{
  customId: string;
  interaction: ButtonInteraction;
} | null> {
  // Step 1: Create button components
  const buttonComponents = buttons.map((btn) =>
    new ButtonBuilder()
      .setCustomId(btn.customId)
      .setLabel(btn.label)
      .setStyle(btn.style)
      .setEmoji(btn.emoji || "")
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buttonComponents
  );

  // Step 2: Reply or edit the reply with buttons and optional embeds
  const replyOptions: InteractionReplyOptions = {
    content,
    embeds,
    components: [row],
    ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply(replyOptions);
  } else {
    await interaction.reply(replyOptions);
  }

  // Step 3: Set up a collector to handle button presses
  try {
    const filter = (i: MessageComponentInteraction) =>
      i.user.id === interaction.user.id &&
      buttons.map((b) => b.customId).includes(i.customId);

    const collectedInteraction = await (
      interaction.channel as any
    ).awaitMessageComponent({
      filter,
      time: timeout,
    });

    // Step 4: If a button was pressed, return the customId and interaction
    if (collectedInteraction && collectedInteraction.isButton()) {
      await interaction.editReply({
        content: "✅ Respuesta Registrada",
        embeds: [], // Remove embeds
        components: [], // Remove buttons
      });

      return {
        customId: collectedInteraction.customId,
        interaction: collectedInteraction as ButtonInteraction,
      };
    }
  } catch (error) {
    // Timeout, no button was pressed
  }

  // Step 5: Remove the buttons and return null after timeout
  await interaction.editReply({
    content,
    embeds,
    components: [],
  });

  return null;
}
