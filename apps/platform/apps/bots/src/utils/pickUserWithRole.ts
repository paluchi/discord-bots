import getDiscordRolesMap, { Member } from "./getDiscordRolesMap";
import { Request } from "@platform/shared/framework/types";
import { Role } from "@platform/core/services/types.services";

const pickUserWithRole = async (
  request: Request,
  roleName: Role
): Promise<Member | null> => {
  const rolesMap = await getDiscordRolesMap(request);
  const roleInfo = rolesMap[roleName];

  if (!roleInfo || roleInfo.members.length === 0) {
    return null;
  }

  // Pick a random member from the role
  const randomIndex = Math.floor(Math.random() * roleInfo.members.length);
  return roleInfo.members[randomIndex];
};

export { getDiscordRolesMap, pickUserWithRole };
