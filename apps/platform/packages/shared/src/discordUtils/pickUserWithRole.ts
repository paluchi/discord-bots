import getDiscordRolesMap, { Member } from "./getDiscordRolesMap";
import { Request } from "../framework/types";
import { Role } from "@platform/core/src/services/types.services";
import { Client } from "discord.js";

const pickUserWithRole = async (props: {
  request?: Request;
  client?: Client;
  guildId?: string;
  roleName: Role;
}): Promise<Member | null> => {
  const rolesMap = await getDiscordRolesMap({
    request: props.request,
    client: props.client,
    guildId: props.guildId,
  });
  const roleInfo = rolesMap[props.roleName];

  if (!roleInfo || roleInfo.members.length === 0) {
    return null;
  }

  // Pick a random member from the role
  const randomIndex = Math.floor(Math.random() * roleInfo.members.length);
  return roleInfo.members[randomIndex];
};

export { getDiscordRolesMap, pickUserWithRole };
