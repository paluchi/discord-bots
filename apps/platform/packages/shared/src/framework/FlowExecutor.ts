import { v4 as uuidv4 } from "uuid";
import {
  ChatMiddleware,
  Request,
  RequestDataResponse,
  Response,
  Next,
} from "./types";
import { PromiseManager } from "./PromiseManager";
import {
  Client,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import envs from "../env";

export type MessageSend = (message: string) => Promise<void>;

export class FlowExecutor {
  private middlewares: ChatMiddleware[];
  private promiseManager: PromiseManager;
  private discordClient: Client;
  private timeoutCallback: (req: Request, sendMessage: MessageSend) => void;

  constructor(
    middlewares: ChatMiddleware[],
    promiseManager: PromiseManager,
    discordClient: Client,
    timeoutCallback: (req: Request, sendMessage: MessageSend) => void
  ) {
    this.middlewares = middlewares;
    this.promiseManager = promiseManager;
    this.discordClient = discordClient;
    this.timeoutCallback = timeoutCallback;
  }

  async execute(req: Request): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let isCompleted = false;
      let activeMiddlewares = 0;

      const response: Response = {
        send: (message: string) => this.send(req.originChannel.id, message),
        requestData: async (message?: string) => {
          if (message) {
            await this.send(req.originChannel.id, message);
          }
          return this.requestData(req);
        },
        askForInput: async (expectedInput: {
          text?: string;
          buttons?: { id: string; label: string }[][];
          type?: "string" | "number" | "boolean";
          checker?: (
            input: any
          ) => boolean | string | Promise<boolean | string>;
        }) => {
          let data;
          if (!expectedInput.buttons && expectedInput.text) {
            await this.send(req.originChannel.id, expectedInput.text);
          } else if (expectedInput.buttons) {
            data = await this.askWithButtons(
              req,
              expectedInput.text || "Selecciona una opción:",
              expectedInput.buttons
            );
          } else {
            throw new Error("Either 'text' or/and 'buttons' must be provided.");
          }

          while (true) {
            data = data || (await this.requestData(req));

            let isValid = false;
            let value;
            if (expectedInput.buttons) {
              return data;
            } else if (expectedInput.text && expectedInput.type) {
              switch (expectedInput.type) {
                case "string":
                  isValid =
                    typeof (data as RequestDataResponse).response === "string";
                  value = (data as RequestDataResponse).response;
                  break;
                case "number":
                  value = Number((data as RequestDataResponse).response);
                  isValid = !isNaN(value);
                  break;
                case "boolean":
                  value = (data as RequestDataResponse).response.toLowerCase();
                  isValid = value === "true" || value === "false";
                  value = value === "true";
                  break;
              }
            }

            if (expectedInput.checker) {
              (isValid as any) = await expectedInput.checker(value);
            }

            if (typeof isValid === "boolean" && isValid) {
              return value;
            } else {
              await this.send(
                req.originChannel.id,
                isValid ||
                  "El valor introducido no es válido! Por favor, inténtalo de nuevo."
              );
              await this.send(req.originChannel.id, expectedInput.text!);
            }
            data = null;
          }
        },
        booleanQuestion: async (question: string) => {
          const response = await this.askWithButtons(req, question, [
            [
              { id: "yes", label: "Sí" },
              { id: "no", label: "No" },
            ],
          ]);
          return response === "yes";
        },
      };

      const next: Next = async (
        nextMiddleware?: ChatMiddleware | ChatMiddleware[]
      ) => {
        if (isCompleted) return;

        activeMiddlewares++;

        try {
          await this.executeMiddlewares(
            [
              ...(nextMiddleware
                ? Array.isArray(nextMiddleware)
                  ? nextMiddleware
                  : [nextMiddleware]
                : this.middlewares),
            ],
            req,
            response,
            next
          );
        } catch (error) {
          isCompleted = true;
          reject(error);
          return;
        } finally {
          activeMiddlewares--;
        }

        if (activeMiddlewares === 0 && !isCompleted) {
          isCompleted = true;
          resolve("success");
        }
      };

      try {
        await next();
      } catch (error) {
        if (!isCompleted) {
          isCompleted = true;
          reject(error);
        }
      }
    });
  }

  private async executeMiddlewares(
    middlewares: ChatMiddleware[],
    req: Request,
    res: Response,
    next: Next
  ): Promise<void> {
    for (const middleware of middlewares) {
      await middleware(req, res, next);
    }
  }

  private async send(channelId: string, message: string): Promise<void> {
    const channel = await this.discordClient.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await (channel as TextChannel).send(message);
    } else {
      console.error(
        `Channel with ID ${channelId} not found or is not a text channel.`
      );
    }
  }

  private async askWithButtons(
    request: Request,
    message: string,
    buttons: { id: string; label: string }[][]
  ): Promise<string | null> {
    const channel = await this.discordClient.channels.fetch(
      request.originChannel.id
    );

    if (channel && channel.isTextBased()) {
      const buttonIdMap: { [key: string]: string } = {}; // Maps dynamic UUIDs to original button IDs

      await (channel as TextChannel).send(message);

      const batchSize = 5;

      for (let i = 0; i < buttons.length; i += batchSize) {
        const batch = buttons.slice(i, i + batchSize);

        const actionRows = batch.map((buttonRow) => {
          const actionRow = new ActionRowBuilder<ButtonBuilder>();

          for (const button of buttonRow) {
            const dynamicId = uuidv4(); // Generate a unique ID for each button
            buttonIdMap[dynamicId] = button.id; // Map the dynamic ID to the original button ID

            actionRow.addComponents(
              new ButtonBuilder()
                .setCustomId(dynamicId)
                .setLabel(button.label)
                .setStyle(ButtonStyle.Primary)
            );
          }

          return actionRow;
        });

        await (channel as TextChannel).send({
          components: actionRows,
        });
      }

      return new Promise((resolve, reject) => {
        const key = `${request.user.id}:${request.originChannel.id}`;

        const filter = (interaction: any) =>
          interaction.isButton() &&
          buttonIdMap.hasOwnProperty(interaction.customId);

        const collector = (
          channel as TextChannel
        ).createMessageComponentCollector({
          filter,
          max: 1, // Collect only one interaction
        });

        collector.on("collect", async (interaction) => {
          const selectedDynamicId = interaction.customId;
          const originalButtonId = buttonIdMap[selectedDynamicId]; // Get the original button ID

          await interaction.reply({
            content: `You selected: ${
              buttons.flat().find((button) => button.id === originalButtonId)
                ?.label
            }`,
            ephemeral: true,
          });
          this.promiseManager.discardPromise(key, "button-pressed-on-time"); // Discard the message listener
          resolve(originalButtonId); // Resolve with the original button ID

          // Stop the collector
          collector.stop();
        });

        collector.on("end", (collected) => {
          if (collected.size === 0) {
            reject("promise-timeout");
          }
        });

        const listenForMessage = async () => {
          try {
            while (true) {
              const data = await this.requestData(request);
              if (data) {
                await this.send(
                  request.originChannel.id,
                  "Por favor preciona un boton!"
                );
              }
            }
          } catch (error: any) {
            collector.stop();
            if (
              error !== "promise-timeout" &&
              error !== "button-pressed-on-time" &&
              error !== "promise-discarded"
            ) {
              console.log("Error", error);
            }
          }
        };

        listenForMessage();
      });
    } else {
      console.error(
        `Channel with ID ${request.originChannel.id} not found or is not a text channel.`
      );
      return null;
    }
  }

  private async requestData(
    req: Request,
    timeout: number = envs.REQUEST_TIMEOUT_MS
  ): Promise<RequestDataResponse> {
    const key = `${req.user.id}:${req.originChannel.id}`;
    return this.promiseManager.createPromise(key, timeout, () => {
      return this.timeoutCallback(req, async (message: string) => {
        await this.send(req.originChannel.id, message);
      });
    });
  }
}
