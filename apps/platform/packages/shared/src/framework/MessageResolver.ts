import { Message } from "discord.js";
import StateManager from "./StateManager";

export class MessageResolver {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async resolveMessage(message: Message): Promise<boolean> {
    try {
      const openRequestKey = await this.stateManager.getOpenRequestKey(
        message.author.id,
        message.channel.id
      );
      // if key exsits get data from request
      if (openRequestKey) {
        const data = (await this.stateManager.getRequestData(
          openRequestKey
        )) as any;
        if (!data!.status || data!.status !== "awaiting") {
          // Delete the request data if it's not in the awaiting state
          await this.stateManager.deleteRequestData(openRequestKey);
          return false;
        }
        const requestData = {
          status: "resolved",
          response: message.content,
        };
        await this.stateManager.setRequestData(openRequestKey, requestData);
        console.info(`Resolved message for request: ${openRequestKey}`);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Error resolving message", error);
      return false;
    }
  }
}
