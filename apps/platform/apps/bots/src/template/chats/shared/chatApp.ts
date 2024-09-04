import getDiscordChatApp from "@platform/shared-context/bots/getChatApp";

let chatApp: any;

export const getChatApp = async () => {
  if (chatApp) return chatApp;

  chatApp = await getDiscordChatApp("TICKETS_BOT");
  await chatApp.init();
  return chatApp;
};
