import { getChatApp } from "./shared/chatApp";
import envs from "@platform/shared/env";
import { Next, Request, Response } from "@platform/shared/framework/types";
import { trackProgress } from "@/utils/trackProgress";
import { getSalesmanService } from "@/utils/firebaseContext";
import { Salesman } from "@platform/core/domain/salesman";

export async function onboardingFormListener() {
  const welcomeMiddleware = async (req: Request, res: Response, next: Next) => {
    const ready = await res.askForInput({
      text: "¡Hola! ¿Estás listo para comenzar el proceso de onboarding?",
      buttons: [
        [
          { id: "yes", label: "Sí" },
          { id: "no", label: "No" },
        ],
      ],
    });

    if (ready === "yes") {
      next(checkIfUserIsOnboardedMiddleware);
    } else {
      await res.send(
        "¡Está bien, cuando estés listo, vuelve a iniciar el proceso!"
      );
    }
  };

  const checkIfUserIsOnboardedMiddleware = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    await res.send(
      "¡Hola! Estoy aquí para ayudarte a completar el proceso de onboarding! Vamos a cargar tus datos."
    );

    // Get the user
    const user = req.user;
    try {
      const userData: Salesman | null = await trackProgress(
        req,
        async () => {
          // Onboard the user
          const salesmanService = await getSalesmanService();
          const userData = await salesmanService.getUserDetails(user.id);

          return userData;
        },
        "Preparando todo para comenzar",
        10000
      );

      if (userData) {
        await res.send(
          "Te encotramos en el registro! No es necesario completar el proceso de onboarding nuevamente."
        );
        next(finishProcessMiddleware);
        return;
      }

      next(nameMiddleware);
    } catch (error) {
      await res.send(
        "¡Hubo un error al buscar tus datos! Volve a intentar en un momento."
      );
    }
  };

  const nameMiddleware = async (req: Request, res: Response, next: Next) => {
    const name = await res.askForInput({
      text: "¿Cuál es tu nombre?",
      type: "string",
    });

    await req.updateChatData({ name });
    next(surnameMiddleware);
  };

  const surnameMiddleware = async (req: Request, res: Response, next: Next) => {
    const surname = await res.askForInput({
      text: "¿Cuál es tu apellido?",
      type: "string",
    });

    await req.updateChatData({ surname });
    next(emailMiddleware);
  };

  const emailMiddleware = async (req: Request, res: Response, next: Next) => {
    const email = await res.askForInput({
      text: "¿Cuál es tu email?",
      type: "string",
    });

    await req.updateChatData({ email });
    next(addressMiddleware);
  };

  const addressMiddleware = async (req: Request, res: Response, next: Next) => {
    const address = await res.askForInput({
      text: "¿Cuál es tu dirección?",
      type: "string",
    });

    await req.updateChatData({ address });
    next(ageMiddleware);
  };

  const ageMiddleware = async (req: Request, res: Response, next: Next) => {
    const age = await res.askForInput({
      text: "¿Cuál es tu edad?",
      type: "number",
      checker: (input) => input > 0 && input < 120, // Simple age validation
    });

    await req.updateChatData({ age });
    next(genderMiddleware);
  };

  const genderMiddleware = async (req: Request, res: Response, next: Next) => {
    const gender = await res.askForInput({
      buttons: [
        [
          { id: "male", label: "Masculino" },
          { id: "female", label: "Femenino" },
          { id: "other", label: "Otro" },
        ],
      ],
    });

    await req.updateChatData({ gender });

    next(processLastStepsMiddleware);
  };

  const processLastStepsMiddleware = async (
    req: Request,
    res: Response,
    next: Next
  ) => {
    try {
      // Load the user data into the database
      const formData = await req.getChatData();

      // Send data to check the user
      let message = `Indique si los si los siguientes datos son correctos:`;
      for (const key in formData) {
        message += `\n${key}: ${formData[key]}`;
      }

      const formOk = await res.askForInput({
        text: message,
        buttons: [
          [
            { id: "yes", label: "Sí" },
            { id: "no", label: "No" },
          ],
        ],
      });

      if (!formOk || formOk === "no") {
        await res.send("¡Intentemos nuevamente!");
        next(nameMiddleware);
        return;
      }

      // End of the onboarding process
      await res.send(
        "¡Gracias por proporcionar tu información! El proceso de onboarding ha terminado."
      );
      await res.send(
        "¡En los proximos segundos vas a obtener acceso a los canales de la comunidad!"
      );

      // Get the user
      const user = req.user;

      await trackProgress(
        req,
        async () => {
          // Onboard the user
          const salesmanService = await getSalesmanService();
          salesmanService.onboard(user.id, formData);
        },
        "Cargando tus datos",
        10000
      );

      next(finishProcessMiddleware);
    } catch (error) {
      console.log("error", error);

      res.send(
        "¡Hubo un error al procesar tu solicitud! Volve a intentar en un momento."
      );
    }
  };

  const finishProcessMiddleware = async (req: Request) => {
    // Get the user
    const user = req.user;

    // Delete the channel
    const channel = req.originChannel;
    if (channel && channel.isTextBased()) {
      const guild = req.guild;

      const member = await guild.members.fetch(user.id); // Fetch the guild member

      // Delete the channel
      await channel.delete();

      // Find the "Member" role
      const memberRole = guild.roles.cache.find(
        (role: any) => role.name === "Member"
      );

      if (memberRole) {
        // Add the "Member" role to the user
        await member.roles.add(memberRole);
      }
    }
  };

  const chatApp = await getChatApp();

  // Add middleware to the chat app
  chatApp.addListener({
    categoryId: envs.ONBOARDING_CATEGORY_ID,
    startPoint: welcomeMiddleware,
    channelCreateCallback: async (channel, client) => {
      // Send a welcome message in the new channel

      const members = channel.members;

      // Select first member that has only the role @everyone
      const member = members.find(
        (member: any) => member.roles.cache.size === 1
      );

      await channel.send(
        `¡Bienvenidx al servidor, ${
          member!.user
        }! Este es tu canal de onboarding.`
      );
      await channel.send(`¡Envia un mensaje para iniciar tu onboarding!`);
    },
    timeoutCallback: async (req, sendMessage) => {
      await sendMessage(
        "No puedo esperar tanto! Por favor envia mensaje nuevamente para iniciar el onboarding."
      );
    },
  });
}
