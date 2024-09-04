import getDiscordChatApp from "@platform/shared-context/bots/getChatApp";
import { ChatApp } from "@platform/shared/framework/ChatApp";

let chatApp: ChatApp;

export const getChatApp = async () => {
  if (chatApp) return chatApp;

  chatApp = await getDiscordChatApp("TICKETS_BOT");
  await chatApp.init();
  return chatApp;
};
