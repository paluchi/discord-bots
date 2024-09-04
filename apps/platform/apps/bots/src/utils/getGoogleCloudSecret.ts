import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import * as functions from "firebase-functions";

const getGoogleClouldSecret = async (
  secretName: string,
  version: string = "latest"
) => {
  const client = new SecretManagerServiceClient();
  const projectId = functions.config().project.id;
  const [versionData] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${secretName}/versions/${version}`,
  });

  return versionData.payload?.data?.toString();
};

export default getGoogleClouldSecret;
