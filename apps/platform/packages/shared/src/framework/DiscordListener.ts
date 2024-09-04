import {
  Client,
  Message,
  GuildChannel,
  NewsChannel,
  TextChannel,
} from "discord.js";
import { MessageResolver } from "./MessageResolver";
import { FlowExecutor } from "./FlowExecutor";
import { Request } from "./types";
import StateManager from "./StateManager";

export type CustomChannel = TextChannel | NewsChannel;

interface DiscordListenerOptions {
  client: Client;
  flowExecutor: FlowExecutor;
  stateManager: StateManager;
  channelId?: string | null;
  categoryId?: string | null;
  channelCreateCallback?: (channel: CustomChannel, client: Client) => void;
}

export class DiscordListener {
  private client: Client;
  private messageResolver: MessageResolver;
  private flowExecutor: FlowExecutor;
  private channelId: string | null;
  private categoryId: string | null;
  private stateManager: StateManager;
  private channelCreateCallback: (
    channel: TextChannel | NewsChannel,
    client: Client
  ) => void;

  constructor({
    client,
    flowExecutor,
    stateManager,
    channelId = null,
    categoryId = null,
    channelCreateCallback = () => {},
  }: DiscordListenerOptions) {
    this.client = client;
    this.flowExecutor = flowExecutor;
    this.channelId = channelId;
    this.categoryId = categoryId;
    this.channelCreateCallback = channelCreateCallback;
    this.stateManager = stateManager;

    this.messageResolver = new MessageResolver(stateManager);
  }

  start(): void {
    this.client.on("messageCreate", this.handleMessage.bind(this));

    if (this.categoryId) {
      this.client.on("channelCreate", this.handleChannelCreate.bind(this));
    }

    console.info("DiscordListener started");
  }

  private async handleMessage(message: Message): Promise<void> {
    if (message.author.bot) return;

    const channel = message.channel;

    // If it's a category listener and a message is sent in to a channel NOT in the category then ignore
    if (
      this.categoryId &&
      channel instanceof GuildChannel &&
      channel.parentId !== this.categoryId
    )
      return;

    // Only process messages in the specified channel
    if (this.channelId && channel.id !== this.channelId) return;

    try {
      const resolved = await this.messageResolver.resolveMessage(message);
      if (!resolved) {
        // Start a new flow execution
        const request: Request = {
          message: message,
          user: message.author,
          originChannel: channel,
          client: this.client,
          guild: message.guild!,
          stateManager: this.stateManager,
          getChatData: () => this.stateManager.getChatData(channel.id),
          updateChatData: async (data, options) => {
            let newData = data;
            if (typeof data === "function") {
              const retrievedData = await this.stateManager.getChatData(
                channel.id
              );
              newData = await data(retrievedData);
            }
            this.stateManager.updateChatData(channel.id, newData, options);
          },
        };

        await this.flowExecutor.execute(request);
      }
    } catch (error: any) {
      if (error === "promise-timeout") {
        // Expected error
      } else console.error("Unhandled Error", error);
    }
  }

  private async handleChannelCreate(channel: GuildChannel): Promise<void> {
    // Only process channels created in the specified category
    if (this.categoryId && channel.parentId !== this.categoryId) return;

    // Check if the channel is a TextChannel or NewsChannel
    if (channel.isTextBased()) {
      // Execute the callback passing the client
      this.channelCreateCallback(channel as CustomChannel, this.client);
    } else {
      console.warn("Channel is not a TextChannel or NewsChannel");
    }
  }
}
