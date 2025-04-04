import { Request, Response, Next } from "@platform/shared/framework/types";
import { getChatApp } from "./shared/chatApp";
import { startSalesTicketListener } from "./salesTicketListener";
import envs from "@platform/shared/env";
import { trackProgress } from "@/utils/trackProgress";

async function main() {
  try {
    // Test middleware functions
    const welcomeMiddleware = async (
      req: Request,
      res: Response,
      next: Next
    ) => {
      const data = await res.requestData(
        "Welcome to Pizza Bot! Would you like to order a pizza? (yes/no)"
      );

      await trackProgress(
        req,
        async () => {
          await new Promise((resolve: any) => {
            setTimeout(() => {
              resolve();
            }, 10000);
          });
        },
        "Order Progress",
        5000
      );

      await res.send("Order complete!");

      if (data.response.toLowerCase() === "yes") {
        next(sizeMiddleware);
      } else {
        await res.send("Okay, have a great day!");
      }
    };

    const sizeMiddleware = async (req: Request, res: Response, next: Next) => {
      await res.send("What size pizza would you like? (small/medium/large)");
      const data = await res.requestData();
      await chatApp
        .getStateManager()
        .updateChatData(req.originChannel.id, { size: data.response });
      next(toppingMiddleware);
    };

    const toppingMiddleware = async (
      req: Request,
      res: Response,
      next: Next
    ) => {
      await res.send(
        "What topping would you like? (cheese/pepperoni/vegetarian)"
      );
      const data = await res.requestData();
      await chatApp
        .getStateManager()
        .updateChatData(req.originChannel.id, { topping: data.response });

      next(confirmationMiddleware);
    };

    const confirmationMiddleware = async (
      req: Request,
      res: Response,
      next: Next
    ) => {
      const chatData = await chatApp
        .getStateManager()
        .getChatData(req.originChannel.id);

      await res.send(
        `You've ordered a ${chatData!.size} ${
          chatData!.topping
        } pizza. Is this correct? (yes/no)`
      );
      const data = await res.requestData();
      if (data.response.toLowerCase() === "yes") {
        await res.send("Great! Your pizza is on its way. Enjoy!");
      } else {
        await res.send("I'm sorry for the confusion. Let's start over.");
        next(welcomeMiddleware);
      }
    };

    const chatApp = await getChatApp();

    // Add middleware to the chat app
    chatApp.addListener({
      categoryId: envs.OPEN_SALES_CATEGORY_ID,
      startPoint: welcomeMiddleware,
      channelCreateCallback: (channel) => {
        // Send Welcome message to the channel
        channel.send("Welcome to Pizza Bot! How can I help you today?");
      },
      timeoutCallback: async (req, sendMessage) => {
        await sendMessage(
          "Sorry, I didn't get a response. Please try again by sending a message."
        );
      },
    });

    startSalesTicketListener();
  } catch (error) {
    console.error("Failed to start the application:", error);
    process.exit(1);
  }
}

main();
