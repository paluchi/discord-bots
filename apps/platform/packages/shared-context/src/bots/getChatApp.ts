import { ChatApp } from "@platform/shared/framework/ChatApp";
import envs from "@platform/shared/env";

export const bots = {
  BACKOFFICE_SALES_TICKETS_BOT: envs.BACKOFFICE_SALES_TICKETS_DISCORD_TOKEN,
  TICKETS_BOT: envs.TICKETS_DISCORD_TOKEN,
  ONBOARDING_BOT: envs.ONBOARDING_DISCORD_TOKEN,
};
export type Bot = keyof typeof bots;

let chatApp: ChatApp;

const getChatApp = async (bot: Bot): Promise<ChatApp> => {
  if (chatApp) return chatApp;

  chatApp = new ChatApp(bots[bot]);
  await chatApp.init();
  return chatApp;
};

export default getChatApp;
