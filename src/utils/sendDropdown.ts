import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  Interaction,
  ButtonStyle,
} from "discord.js";

interface Option {
  label: string;
  description: string;
  value: string;
}

interface DropdownParams {
  options: Option[];
  interaction: Interaction;
  customId: string;
  placeholder?: string;
  timeout?: number;
  itemsPerPage?: number;
}

export const sendDropdown = async ({
  options,
  interaction,
  customId,
  placeholder = "Selecciona una opción",
  timeout = 60000, // Default timeout: 1 minute
  itemsPerPage = 25, // Default items per page
}: DropdownParams): Promise<string | null> => {
  let currentPage = 0;
  const totalPages = Math.ceil(options.length / itemsPerPage);

  const generateSelectMenu = (page: number) => {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedOptions = options.slice(start, end);

    return new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(paginatedOptions);
  };

  const generatePaginationButtons = (page: number) => {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("previous_page")
        .setLabel("Anterior")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId("next_page")
        .setLabel("Siguiente")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages - 1)
    );
  };

  const generateMessage = (page: number) => {
    const selectMenuRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        generateSelectMenu(page)
      );
    const buttonRow = generatePaginationButtons(page);

    return {
      content: `Página ${page + 1} de ${totalPages}`,
      components: [selectMenuRow, buttonRow],
      ephemeral: true,
    };
  };

  if (!(interaction as any).replied && !(interaction as any).deferred)
    await (interaction as any).reply(generateMessage(currentPage));
  else await (interaction as any).editReply(generateMessage(currentPage));

  while (true) {
    try {
      const response = await (
        interaction.channel! as any
      ).awaitMessageComponent({
        filter: (i: any) =>
          i.user.id === interaction.user.id &&
          (i.customId === customId ||
            i.customId === "next_page" ||
            i.customId === "previous_page"),
        time: timeout,
      });

      if (response.customId === "next_page") {
        currentPage = Math.min(currentPage + 1, totalPages - 1);
        await response.update(generateMessage(currentPage));
      } else if (response.customId === "previous_page") {
        currentPage = Math.max(currentPage - 1, 0);
        await response.update(generateMessage(currentPage));
      } else if (response.customId === customId) {
        // Selection made
        if (response.isStringSelectMenu()) {
          await response.update({
            content: "Selección realizada",
            components: [],
          });
          return response.values[0];
        }
      }
    } catch (error) {
      // Timeout or other error
      await (interaction as any).editReply({
        content: "El tiempo de selección ha expirado.",
        components: [],
      });
      return null;
    }
  }
};
