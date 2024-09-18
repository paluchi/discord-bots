import {
  ButtonInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  ModalSubmitInteraction,
  TextInputStyle,
} from "discord.js";

export interface ModalField {
  customId: string;
  label: string;
  style: TextInputStyle;
  required?: boolean;
  placeholder?: string;
  value?: string;
  minLength?: number;
  maxLength?: number;
  checker?: (input: string) => boolean | string;
}

interface SendModalConfig {
  interaction: ButtonInteraction;
  customId: string;
  title: string;
  fields?: ModalField[];
  confirmText?: string;
  timeout?: number;
}

interface ModalResult {
  [key: string]: string;
}

export function sendModal(
  config: SendModalConfig
): Promise<ModalResult | null> {
  return new Promise((resolve, reject) => {
    const {
      interaction,
      customId,
      title,
      fields,
      confirmText,
      timeout = 5 * 60 * 1000,
    } = config;

    try {
      const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

      if (fields && fields.length > 0) {
        fields.forEach((field, index) => {
          if (field.label.length > 45) {
            throw new Error(
              `Label for field ${index + 1} exceeds 45 characters: "${field.label}"`
            );
          }
          const textInput = new TextInputBuilder()
            .setCustomId(field.customId)
            .setLabel(field.label)
            .setStyle(field.style)
            .setRequired(field.required ?? true);
          if (field.placeholder) textInput.setPlaceholder(field.placeholder);
          if (field.value) textInput.setValue(field.value);
          if (field.minLength !== undefined)
            textInput.setMinLength(field.minLength);
          if (field.maxLength !== undefined)
            textInput.setMaxLength(field.maxLength);
          const actionRow =
            new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
          modal.addComponents(actionRow);
        });
      } else {
        const confirmField = new TextInputBuilder()
          .setCustomId("confirm")
          .setLabel(confirmText || "Confirm this action?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue("confirm")
          .setMaxLength(7)
          .setMinLength(7);
        const actionRow =
          new ActionRowBuilder<TextInputBuilder>().addComponents(confirmField);
        modal.addComponents(actionRow);
      }

      interaction
        .showModal(modal)
        .then(() => {
          const filter = (modalInteraction: ModalSubmitInteraction) =>
            modalInteraction.customId === customId;

          interaction
            .awaitModalSubmit({ filter, time: timeout })
            .then(async (modalInteraction) => {
              const result: ModalResult = {};
              const inputs = modalInteraction.fields;

              if (fields && fields.length > 0) {
                for (const field of fields) {
                  const input = inputs.getTextInputValue(field.customId);
                  if (field.checker) {
                    const checkRes = field.checker(input);
                    if (!checkRes || typeof checkRes === "string") {
                      const errorText =
                        typeof checkRes === "string" ? checkRes : "";
                      await modalInteraction.reply({
                        content: `❌ El campo '${field.label}' es inválido.\n${errorText}`,
                        ephemeral: true,
                      });
                      return resolve(null);
                    }
                  }
                  result[field.customId] = input;
                }
              } else {
                result.confirm = inputs.getTextInputValue("confirm");
              }

              // Step 1: Acknowledge the interaction first
              await modalInteraction.deferUpdate(); // Acknowledge the modal submission

              // Step 2: Reply after acknowledgment
              await modalInteraction.followUp({
                content: "✅️ Formulario enviado con éxito!",
                ephemeral: true,
              });

              resolve(result);
            })
            .catch((error) => {
              console.log("error", error);
              if (
                error.message ===
                  "Collector ended without receiving any items" ||
                error.code === "INTERACTION_COLLECTOR_ERROR"
              ) {
                console.log("Modal was canceled or closed");
                resolve(null);
              } else if (error.message === "Modal timed out") {
                interaction
                  .followUp({
                    content:
                      "El formulario ha expirado. Por favor, intenta nuevamente.",
                    ephemeral: true,
                  })
                  .catch(console.error);
                resolve(null);
              } else {
                console.error("Error handling modal submission:", error);
                reject(error);
              }
            });
        })
        .catch((error) => {
          console.error("Error showing modal:", error);
          reject(error);
        });
    } catch (error) {
      console.error("Error creating modal:", error);
      reject(error);
    }
  });
}
