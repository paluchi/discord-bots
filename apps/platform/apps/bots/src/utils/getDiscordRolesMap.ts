import { Role } from "@platform/core/services/types.services";
import { Request } from "@platform/shared/framework/types";
import { Client, Guild, GuildMember } from "discord.js";

export interface Member {
  guild: GuildMember;
  tag: string;
  id: string;
}

interface RoleInfo {
  id: string;
  tag: string;
  members: Member[];
}

const getRolesMap = (roles: any) => {
  // Reduce the roles cache to an object mapping role names to role information
  const roleMap = roles.reduce(
    (acc: any, role: any) => {
      acc[role.name as Role] = {
        id: role.id,
        tag: `<@&${role.id}>`,
        members: Array.from(role.members.values()).map((member: any) => ({
          guild: member,
          tag: `<@${member.id}>`,
          id: member.id,
        })),
      };
      return acc;
    },
    {} as { [key in Role]: RoleInfo }
  );

  return roleMap;
};

const getDiscordRolesMap = async (props: {
  request?: Request;
  client?: Client;
  guildId?: string;
}) => {
  if (!props.request && !props.client) {
    throw new Error("Either request or client must be provided");
  }

  if (props.client && !props.guildId) {
    throw new Error("Guild ID must be provided when using client");
  }

  let guild: Guild | undefined;

  if (props.request) {
    guild = props.request.guild;
  } else if (props.client && props.guildId) {
    guild = props.client.guilds.cache.get(props.guildId);
    if (!guild) {
      console.error(`Guild with ID ${props.guildId} not found`);
      throw new Error(`Guild with ID ${props.guildId} not found`);
    }
  } else {
    throw new Error("Guild ID must be provided when using client");
  }

  if (!guild) {
    console.error("Guild is undefined");
    throw new Error("Guild is undefined");
  }

  try {
    // Ensure all members are fetched
    await guild.members.fetch();

    // Get the roles cache
    const roles = guild.roles.cache;

    return getRolesMap(roles);
  } catch (error) {
    console.error("Error fetching guild members:", error);
    throw error;
  }
};

export default getDiscordRolesMap;
