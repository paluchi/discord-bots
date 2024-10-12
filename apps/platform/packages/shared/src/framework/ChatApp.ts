import { Client, IntentsBitField } from "discord.js";
import StateManager from "./StateManager";
import { PromiseManager } from "./PromiseManager";
import { ChatRouter } from "./ChatRoutes";
import { FlowExecutor, MessageSend } from "./FlowExecutor";
import { CustomChannel, DiscordListener } from "./DiscordListener";
import { ChatMiddleware, Request } from "./types";

interface ListenerProps {
  channelId?: string | null;
  categoryId?: string | null;
  channelCreateCallback?: (channel: CustomChannel, client: Client) => void;
  threadCreateCallback?: (channel: CustomChannel, client: Client) => void;
  timeoutCallback: (req: Request, sendMessage: MessageSend) => void;
  startPoint: ChatMiddleware;
}

export class ChatApp {
  private client: Client;
  private stateManager: StateManager | null = null;
  private listeners: DiscordListener[] = [];
  private discordToken: string;

  constructor(discordToken: string, omitStateManager: boolean = false) {
    if (!omitStateManager) this.stateManager = new StateManager();
    this.discordToken = discordToken;

    this.client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessageReactions,
      ],
    });

    this.client.once("ready", () => {
      console.info("Discord bot is ready!");
      this.startListeners();
    });
  }

  async init() {
    await this.stateManager?.init();
    await this.client.login(this.discordToken);
  }

  getClient() {
    return this.client;
  }

  getGuild(serverId: string) {
    return this.client.guilds.cache.get(serverId);
  }

  getStateManager() {
    return this.stateManager;
  }

  addListener(props: ListenerProps) {
    if (!this.stateManager) throw new Error("StateManager is not initialized");

    if (!props.channelId && !props.categoryId) {
      throw new Error(
        "Invalid listener arguments: channelId or categoryId must be provided"
      );
    }
    if (props.categoryId && !props.channelCreateCallback) {
      throw new Error(
        "Invalid listener arguments: channelCreateCallback must be provided for categoryId"
      );
    }

    const router = new ChatRouter();
    router.use(props.startPoint);

    const promiseManager = new PromiseManager(this.stateManager);

    const flowExecutor = new FlowExecutor(
      router.getMiddlewares(),
      promiseManager,
      this.client,
      props.timeoutCallback
    );

    const discordListener = new DiscordListener({
      client: this.client,
      flowExecutor,
      stateManager: this.stateManager,
      channelId: props.channelId,
      categoryId: props.categoryId,
      channelCreateCallback: props.channelCreateCallback as any,
      threadCreateCallback: props.threadCreateCallback as any,
    });

    this.listeners.push(discordListener);

    return discordListener;
  }

  private startListeners() {
    this.listeners.forEach((listener) => listener.start());
  }
}
