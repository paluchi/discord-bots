import { Request } from "@platform/shared/framework/types";
import { GuildMember } from "discord.js";
import { Role } from "@platform/core/services/types.services";

export async function addUserRole(
  req: Request,
  roleName: Role
): Promise<boolean> {
  try {
    const guild = req.guild;

    const member: GuildMember | undefined = await guild.members.fetch(
      req.user.id
    );

    if (!member) return false;

    const role = guild.roles.cache.find((role) => role.name === roleName);

    if (!role) return false;

    await member.roles.add(role);
    return true;
  } catch (error) {
    console.error("Failed to add role:", error);
    return false;
  }
}

export async function removeUserRole(
  req: Request,
  roleName: Role
): Promise<boolean> {
  try {
    const guild = req.guild;

    const member: GuildMember | undefined = await guild.members.fetch(
      req.user.id
    );

    if (!member) return false;

    const role = guild.roles.cache.find((role) => role.name === roleName);

    if (!role) return false;

    await member.roles.remove(role);
    return true;
  } catch (error) {
    console.error("Failed to remove role:", error);
    return false;
  }
}

export async function checkIfHasRole(
  req: Request,
  roleName: Role
): Promise<boolean> {
  try {
    const guild = req.guild;

    const member: GuildMember | undefined = await guild.members.fetch(
      req.user.id
    );

    if (!member) return false;

    const role = guild.roles.cache.find((role) => role.name === roleName);

    if (!role) return false;

    return member.roles.cache.has(role.id);
  } catch (error) {
    console.error("Failed to check role:", error);
    return false;
  }
}
