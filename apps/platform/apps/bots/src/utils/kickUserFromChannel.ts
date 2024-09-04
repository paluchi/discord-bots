import { Request } from "@platform/shared/framework/types";

const kickUserFromChannel = async (request: Request) => {
  const { originChannel, user } = request;
  await (originChannel as any).permissionOverwrites.delete(user.id);
};

export default kickUserFromChannel;
