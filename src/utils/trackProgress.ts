import { Request } from "@platform/shared/framework/types";
import { TextChannel } from "discord.js";

export async function trackProgress(
  req: Request,
  runner: (updateProgress: (percent: number) => void) => Promise<any>,
  label: string = "Progreso",
  ms: number = 5000
): Promise<any> {
  const channel = req.originChannel as TextChannel;
  if (!channel.isTextBased()) return;

  let progress = 0;
  const progressBarLength = 5;

  // Initial progress message
  const message = await channel.send(
    `${label}: [${"░".repeat(progressBarLength)}] 0%`
  );

  const updateProgress = (percent: number) => {
    progress = Math.min(percent, 90);
    updateProgressBar();
  };

  const updateProgressBar = () => {
    const filledBlocks = Math.floor((progress / 100) * progressBarLength);
    const emptyBlocks = progressBarLength - filledBlocks;
    const progressBar = "█".repeat(filledBlocks) + "░".repeat(emptyBlocks);
    message.edit(`${label}: [${progressBar}] ${progress}%`);
  };

  const interval = setInterval(() => {
    if (progress < 90) {
      progress = Math.min(progress + 10, 90);
      updateProgressBar();
    }
  }, ms / progressBarLength);

  try {
    const data = await runner(updateProgress);

    // Success case
    clearInterval(interval);
    progress = 100;
    updateProgressBar();
    if (data?.markTrackerAsFailed) await message.react("❌");
    else await message.react("✅");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    delete data?.markTrackerAsFailed;

    return data;
  } catch (error) {
    // Error case
    clearInterval(interval);
    console.error("An error occurred while running the task:", error);
    progress = 0;
    updateProgressBar();
    await message.react("❌");

    throw error; // Rethrow the error immediately
  }
}
