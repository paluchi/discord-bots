import { Events } from "discord.js";
import { getChatApp } from "./shared/chatApp";
import envs from "@platform/shared/env";
import { TextChannel } from "discord.js";

export async function newMembersListener() {
  try {
    const chatApp = await getChatApp();
    const client = chatApp.getClient();

    // Listen for role updates (when a member gains the "Member" role)
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
      if (oldMember.guild.id !== process.env.SERVER_ID) return;

      // Check if the "Member" role was added
      const memberRole = newMember.guild.roles.cache.find(
        (role) => role.name === "Member"
      );

      if (
        memberRole &&
        !oldMember.roles.cache.has(memberRole.id) &&
        newMember.roles.cache.has(memberRole.id)
      ) {
        // Send a welcome message in the welcome channel
        const welcomeChannel = (await newMember.guild.channels.cache.get(
          envs.WELCOME_CHANNEL_ID
        )) as TextChannel;

        if (welcomeChannel) {
          const welcomeMessages = [
            "¡Bienvenidx a la comunidad, ${newMember.user}! La comunidad está emocionada de que te unas.",
            "¡Hola, ${newMember.user}! La comunidad se alegra de que formes parte de ella.",
            "¡Hey, ${newMember.user}! La comunidad está feliz de tenerte aquí.",
            "¡Bienvenidx, ${newMember.user}! La comunidad está ansiosa por compartir grandes momentos contigo.",
            "¡Saludos, ${newMember.user}! Juntos haremos de esta comunidad algo especial.",
            "¡Hola, ${newMember.user}! Esperamos que disfrutes junto a la comunidad.",
            "¡Bienvenidx, ${newMember.user}! Que tengas una estancia maravillosa en la comunidad.",
            "¡Hey, ${newMember.user}! La comunidad se alegra mucho de que te unas.",
            "¡Hola, ${newMember.user}! La comunidad está feliz de que te unas.",
            "¡Bienvenido a la comunidad, ${newMember.user}! Esperamos que disfrutes siendo parte de la comunidad.",
          ];

          const randomIndex = Math.floor(
            Math.random() * welcomeMessages.length
          );
          const welcomeMessage = welcomeMessages[randomIndex];

          await welcomeChannel.send(
            welcomeMessage.replace(
              "${newMember.user}",
              newMember.user.toString()
            )
          );
        }
      }
    });
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}
