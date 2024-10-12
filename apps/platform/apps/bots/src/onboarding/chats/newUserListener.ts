import { ChannelType, Events } from "discord.js";
import { getChatApp } from "./shared/chatApp";
import envs from "@platform/shared/env";
import { TextChannel, CategoryChannel, PermissionFlagsBits } from "discord.js";

export async function newUsersListener() {
  try {
    const chatApp = await getChatApp();

    const client = chatApp.getClient();

    // Listen for new members joining the server
    client.on(Events.GuildMemberAdd, async (member) => {
      if (member.guild.id !== process.env.SERVER_ID) return;

      console.log(`New user joined: ${member.user.tag}`);

      try {
        // Get the onboarding category
        const onboardingCategory = (await member.guild.channels.cache.get(
          envs.ONBOARDING_CATEGORY_ID
        )) as CategoryChannel;

        // Create a new channel in the onboarding category
        await member.guild.channels.create({
          name: `welcome-${member.user.username}`,
          type: ChannelType.GuildText,
          parent: onboardingCategory,
          permissionOverwrites: [
            {
              id: member.user.id,
              allow: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: client.user!.id,
              allow: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: member.guild.roles.cache.find(
                (role) => role.name === "Moderator"
              )!.id,
              allow: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: member.guild.roles.cache.find(
                (role) => role.name === "Admin"
              )!.id,
              allow: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: member.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
          ],
        });
      } catch (error) {
        console.error(
          `Error creating onboarding channel for ${member.user.tag}: ${error}`
        );
      }
    });

    // Listen for role updates (when a member gains the "Member" role)
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
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

        const onboardingChannel = newMember.guild.channels.cache.find(
          (channel) =>
            channel.name === `welcome-${newMember.user.username}` &&
            channel.type === ChannelType.GuildText
        ) as TextChannel;

        if (welcomeChannel && onboardingChannel) {
          await welcomeChannel.send(
            `Bienvenido a la comunidad, ${newMember.user}! Para continuar, por favor dirígete a ${onboardingChannel}.`
          );
        }
      }
    });
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}
