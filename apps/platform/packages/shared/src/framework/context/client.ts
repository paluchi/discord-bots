import { Client, GatewayIntentBits } from "discord.js";

class DiscordClient {
  private client: Client;

  constructor(discordToken: string) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.client.login(discordToken);

    this.client.once("ready", () => {
      console.log(`Logged in as ${this.client.user?.tag}!`);
    });
  }

  getClient(): Client {
    return this.client;
  }
}

export default DiscordClient;
