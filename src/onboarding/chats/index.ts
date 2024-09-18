import { newMembersListener } from "./newMembersListener";
import { newUsersListener } from "./newUserListener";
import { onboardingFormListener } from "./onboardingFormListener";

async function main() {
  try {
    newUsersListener();
    newMembersListener();
    onboardingFormListener();
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}

main();
