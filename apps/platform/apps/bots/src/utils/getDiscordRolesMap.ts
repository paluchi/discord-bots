import { Role } from "@platform/core/services/types.services";
import { Request } from "@platform/shared/framework/types";
import { GuildMember } from "discord.js";

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

const getDiscordRolesMap = async (request: Request) => {
  // Ensure all members are fetched
  await request.guild.members.fetch();

  // Get the roles cache
  const roles = request.guild.roles.cache;

  // Reduce the roles cache to an object mapping role names to role information
  const roleMap = roles.reduce(
    (acc, role) => {
      acc[role.name as Role] = {
        id: role.id,
        tag: `<@&${role.id}>`,
        members: Array.from(role.members.values()).map((member) => ({
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

export default getDiscordRolesMap;
