import {
  CategoryChannel,
  ColorResolvable,
  PermissionsBitField,
  ChannelType,
} from "discord.js";
import { getChatApp } from "./utils/chatApp";
import { getBackofficeCatalogueService } from "@platform/shared-context/firebaseContext";
import {
  roles as domainRoles,
  Role,
} from "@platform/core/services/types.services";
import envs from "@platform/shared/env";

interface Channel {
  name: string;
  type: ChannelType;
  role?: Role[];
}

interface Category {
  name: string;
  type: ChannelType.GuildCategory;
  role: Role | Role[];
  channels?: Channel[];
}

async function main() {
  try {
    const backofficeCatalogueService = await getBackofficeCatalogueService();
    await backofficeCatalogueService.syncCatalogue();

    const chatApp = await getChatApp();

    const guild = chatApp.getGuild(envs.SERVER_ID);

    if (!guild) throw new Error("Guild not found");

    // Define roles and categories
    const roles = [
      {
        name: domainRoles.Admin,
        color: "#ff0000",

        permissions: [PermissionsBitField.Flags.Administrator],
      },
      {
        name: domainRoles.Moderator,
        color: "#0000ff",
        permissions: [
          PermissionsBitField.Flags.BanMembers,
          PermissionsBitField.Flags.KickMembers,
          PermissionsBitField.Flags.ManageMessages,
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.MuteMembers,
          PermissionsBitField.Flags.ManageEvents,
          PermissionsBitField.Flags.CreateEvents,
          PermissionsBitField.Flags.SendVoiceMessages,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageThreads,
          PermissionsBitField.Flags.MentionEveryone,
          PermissionsBitField.Flags.AddReactions,
          PermissionsBitField.Flags.EmbedLinks,
          PermissionsBitField.Flags.CreatePublicThreads,
          PermissionsBitField.Flags.SendMessages,
        ],
      },
      { name: domainRoles["Sales-Manager"], color: "#ffff00" },
      { name: domainRoles["Shipping-Manager"], color: "#DDDB66" }, // LUMINOUS_VIVID_PINK
      { name: domainRoles.Salesman, color: "#bada55" },
      { name: domainRoles.Member, color: "#c0c0c0" },
    ] as {
      name: Role;
      color: ColorResolvable;
      permissions?: PermissionsBitField;
    }[];

    const categories: Category[] = [
      {
        name: "Backoffice",
        type: ChannelType.GuildCategory,
        role: [domainRoles.Moderator, domainRoles.Admin],
        channels: [
          {
            name: "sale-tickets",
            type: ChannelType.GuildText,
            role: [
              domainRoles["Sales-Manager"],
              domainRoles["Shipping-Manager"],
            ],
          },
          {
            name: "backoffice-test",
            type: ChannelType.GuildText,
          },
        ],
      },
      {
        name: "Onboarding",
        type: ChannelType.GuildCategory,
        role: [domainRoles.Moderator, domainRoles.Admin],
      },
      {
        name: "Ventas",
        type: ChannelType.GuildCategory,
        role: [domainRoles["Sales-Manager"]],
      },
      {
        name: "Salesman",
        type: ChannelType.GuildCategory,
        role: [domainRoles.Salesman, domainRoles["Sales-Manager"]],
        channels: [{ name: "registrar-venta-📥", type: ChannelType.GuildText }],
      },
      {
        name: "General",
        type: ChannelType.GuildCategory,
        role: domainRoles.Member,
        channels: [
          { name: "discusiones", type: ChannelType.GuildText },
          { name: "preguntas-frecuentes", type: ChannelType.GuildText },
          { name: "bienvenida", type: ChannelType.GuildText },
        ],
      },
    ];

    // Create roles if they don't already exist
    const createdRoles = await Promise.all(
      roles.map(async (role) => {
        // Fetch all roles to ensure we have the most up-to-date information
        await guild.roles.fetch();
        let existingRole = guild.roles.cache.find((r) => r.name === role.name);

        if (!existingRole) {
          try {
            existingRole = await guild.roles.create({
              name: role.name,
              color: role.color,
              permissions: role.permissions,
            });
            console.log(`Role created: ${existingRole.name}`);
          } catch (error) {
            console.error(`Failed to create role ${role.name}:`, error);
            throw error;
          }
        } else {
          console.log(`Role already exists: ${existingRole.name}`);
          if (existingRole.color !== role.color) {
            await existingRole.setColor(role.color);
            console.log(`Updated color for role: ${existingRole.name}`);
          }
          if (role.permissions) {
            await existingRole.setPermissions(role.permissions);
            console.log(`Updated permissions for role: ${existingRole.name}`);
          }
        }

        return existingRole;
      })
    );

    // Find the roles we want to grant permissions to
    const memberRole = createdRoles.find(
      (role) => role.name === domainRoles.Member
    );
    const moderatorRole = createdRoles.find(
      (role) => role.name === "Moderator"
    );
    const adminRole = createdRoles.find((role) => role.name === "Admin");

    if (!memberRole || !moderatorRole || !adminRole) {
      throw new Error("Required roles not found");
    }

    // Create categories and channels if they don't already exist
    const createdCategories = await Promise.all(
      categories.map(async (category) => {
        let existingCategory = guild.channels.cache.find(
          (c) =>
            c.name === category.name && c.type === ChannelType.GuildCategory
        ) as CategoryChannel | undefined;

        const permissionOverwrites = [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: adminRole.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
        ];

        if (category.role) {
          const rolesToAdd = Array.isArray(category.role)
            ? category.role
            : [category.role];
          rolesToAdd.forEach((roleName) => {
            const roleForCategory = createdRoles.find(
              (r) => r.name === roleName
            );
            if (roleForCategory) {
              permissionOverwrites.push({
                id: roleForCategory.id,
                allow: [PermissionsBitField.Flags.ViewChannel],
              });
            }
          });
        }

        if (!existingCategory) {
          existingCategory = await guild.channels.create({
            name: category.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: permissionOverwrites,
          });
          console.log(`Category created: ${existingCategory.name}`);
        } else {
          console.log(`Category already exists: ${existingCategory.name}`);
          await existingCategory.permissionOverwrites.set(permissionOverwrites);
          console.log(
            `Updated permissions for category: ${existingCategory.name}`
          );
        }

        if (category.channels) {
          await Promise.all(
            category.channels.map(async (channel) => {
              let existingChannel = existingCategory!.children.cache.find(
                (c) => c.name === channel.name
              );

              // Create channel-specific permission overwrites
              let channelPermissionOverwrites = [...permissionOverwrites];

              // Add channel-specific role permissions if defined
              if (channel.role) {
                const rolesToAdd = Array.isArray(channel.role)
                  ? channel.role
                  : [channel.role];
                rolesToAdd.forEach((roleName) => {
                  const roleForChannel = createdRoles.find(
                    (r) => r.name === roleName
                  );
                  if (roleForChannel) {
                    channelPermissionOverwrites.push({
                      id: roleForChannel.id,
                      allow: [PermissionsBitField.Flags.ViewChannel],
                    });
                  }
                });
              }

              if (!existingChannel) {
                existingChannel = (await guild.channels.create({
                  name: channel.name,
                  type: channel.type as any,
                  parent: existingCategory!.id,
                  permissionOverwrites: channelPermissionOverwrites, // Use channel-specific permissions
                })) as any;
                console.log(`Channel created: ${existingChannel!.name}`);
              } else {
                console.log(`Channel already exists: ${existingChannel.name}`);
                await existingChannel.permissionOverwrites.set(
                  channelPermissionOverwrites // Use channel-specific permissions
                );
                console.log(
                  `Updated permissions for channel: ${existingChannel.name}`
                );
              }
            })
          );
        }

        return existingCategory;
      })
    );

    console.log(
      "Setup complete. Processed roles:",
      createdRoles.map((role) => role.name).join(", ")
    );

    console.log(
      "Processed categories:",
      createdCategories.map((category) => category!.name).join(", ")
    );
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}

main();
