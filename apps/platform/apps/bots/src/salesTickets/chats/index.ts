import { Request, Response, Next } from "@platform/shared/framework/types";
import { getChatApp } from "../shared/chatApp";
import { startSalesTicketListener } from "./salesTicketListener";
import envs from "@platform/shared/env";
import { trackProgress } from "@/utils/trackProgress";
import {
  getCatalogueService,
  getClientService,
  getSalesService,
} from "@platform/shared-context/firebaseContext";
import { pickUserWithRole } from "@platform/shared/discordUtils/pickUserWithRole";
import { Catalogue, Category } from "@platform/core/domain/catalogue";
import { TextChannel } from "discord.js";
import { Client } from "@platform/core/domain/client";
import { Sale } from "@platform/core/domain/sale";
import {
  calculateFinalCost,
  calculateFinalShippingCost,
  calculateTotalCommission,
  calculateTotalPoints,
} from "@platform/shared/saleCalculations";

interface ClientData {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  addressNotes: string;
  clientId: string;
  salesmanId: string;
}
interface ChatData {
  client?: ClientData;
  products?: {
    [key: string]: {
      id: string;
      amount: number;
      name: string;
    };
  };
  catalogue?: Catalogue;
}

const channelTopicsMap = {
  initiated: "INITIATED",
  processing: "PROCESSING",
  closed: "CLOSED",
};

const askForClientDataValidation = async (
  req: Request,
  res: Response,
  clientData: Omit<ClientData, "clientId">
) => {
  // display client data and ask for confirmation
  const clientDataConfirmation = await res.booleanQuestion(
    `Son estos los datos correctos del cliente?
- Nombre: ${clientData.name}
- Telefono: ${clientData.phoneNumber}
- Email: ${clientData.email}
- Direccion: ${clientData.email}
- Notas: ${clientData.addressNotes || "No hay notas"}\n`
  );

  if (!clientDataConfirmation) {
    await req.updateChatData((data: ChatData) => ({ ...data, client: {} }));
    return false;
  }

  await req.updateChatData((data: ChatData) => ({
    ...data,
    client: clientData,
  }));
  return true;
};

async function main() {
  try {
    const chatStarterMiddleware = async (
      req: Request,
      res: Response,
      next: Next
    ) => {
      // Read current channel topic
      const channel = req.originChannel as TextChannel;
      const channelTopic = channel.topic;

      if (channelTopic === channelTopicsMap.processing) {
        return;
      }

      await res.send("Empecemos con el registro de tu venta!");

      await res.send(
        "Aguarda unos segundos mientras cargo el catalogo de productos..."
      );
      const catalogue: Category[] = await trackProgress(
        req,
        async () => {
          const catalogueService = await getCatalogueService();

          return catalogueService.getFullCatalogue();
        },
        "Cargando catalogo actualizado"
      );

      await req.updateChatData((chatData: ChatData) => ({
        ...chatData,
        catalogue,
      }));

      const chatData: ChatData = await req.getChatData();

      if (chatData?.client?.clientId) {
        await res.send(
          "Parece que ya tienes un cliente registrado en este ticket."
        );
        const clientDataConfirmation = await askForClientDataValidation(
          req,
          res,
          chatData.client
        );
        if (clientDataConfirmation) {
          await res.send(
            "Perfecto! Vamos a continuar con el registro de productos."
          );
          return next(productSelectorMiddleware);
        }
      }

      await req.updateChatData((chatData: ChatData) => ({
        ...chatData,
        client: {},
        products: {},
      }));

      return next(clientDataCollectorMiddleware);
    };

    const clientDataCollectorMiddleware = async (
      req: Request,
      res: Response,
      next: Next
    ) => {
      await res.send("Vamos a recolectar algunos datos del cliente.");
      const clientName = await res.askForInput({
        text: "Cual es el nombre completo del cliente?",
        type: "string",
      });

      const clientPhoneNumber = await res.askForInput({
        text: "Cual es el numero de telefono del cliente?",
        type: "string",
      });

      const clientEmail = await res.askForInput({
        text: "Cual es el email del cliente?",
        type: "string",
      });

      const clientAddress = await res.askForInput({
        text: "Cual es la direccion del cliente?",
        type: "string",
      });

      const addClietNotes = await res.booleanQuestion(
        "Deseas agregar alguna nota adicional? (timbre, piso, etc)"
      );

      let clientNotes = "";
      if (addClietNotes) {
        clientNotes = await res.askForInput({
          text: "Escribi a continuacion la nota adicional.",
          type: "string",
        });
      }

      const clientData: Omit<ClientData, "clientId"> = {
        name: clientName,
        phoneNumber: clientPhoneNumber,
        email: clientEmail,
        address: clientAddress,
        addressNotes: clientNotes,
        salesmanId: req.user.id,
      };
      const clientDataConfirmation = await askForClientDataValidation(
        req,
        res,
        clientData
      );

      if (!clientDataConfirmation) {
        await res.send("No hay problema! Vamos a intentarlo nuevamente.");
        return next(clientDataCollectorMiddleware);
      }

      const clientService = await getClientService();

      try {
        const newClient: Client = await trackProgress(
          req,
          async () => {
            return await clientService.createClient(clientData);
          },
          "Guardando datos del cliente"
        );

        const foramattedClient: ClientData = {
          ...clientData,
          clientId: newClient.id,
        };
        await req.updateChatData({
          client: foramattedClient,
        });

        next(productSelectorMiddleware);
      } catch (error) {
        console.log("error creating client", error);
        res.send(
          "Hubo un error al guardar los datos del cliente! Por favor intenta nuevamente mas tarde.\nSi el problema persiste, contacta a un moderador."
        );
      }
    };

    const productSelectorMiddleware = async (
      req: Request,
      res: Response,
      next: Next
    ) => {
      await res.send(
        "Que producto vendiste? Selecciona la categoria y luego el producto."
      );

      try {
        const { catalogue }: ChatData = await req.getChatData();
        // Filter out products with 0 stock or display false
        // Filter out categories with no products
        const filteredCategories = catalogue!.categories.reduce(
          (acc: Category[], category) => {
            const products = category.products.filter(
              (product) => product.stock > 0 && product.display
            );

            if (products.length > 0) {
              acc.push({ ...category, products });
            }

            return acc;
          },
          [] as Category[]
        );

        const categoriesButtons = filteredCategories.map(({ name }) => ({
          label: name,
          id: name.toLowerCase().replace(/ /g, "_"),
        }));

        const categoryId = await res.askForInput({
          text: "Que categoria de producto vendiste?",
          buttons: categoriesButtons.map((category) => [category]),
        });

        const selectedCategory = categoriesButtons.find(
          (category) => category.id === categoryId
        );
        const products = filteredCategories.find(
          (category) => category.name === selectedCategory?.label
        )?.products!;

        const productsButtons = products.map(({ name }) => ({
          label: name,
          id: name.replace(/ /g, "_").toLowerCase(),
        }));

        const productId = await res.askForInput({
          text: "Que producto vendiste?",
          buttons: productsButtons.map((product) => [product]),
        });

        const product = products.find(
          (product) =>
            product.name ===
            productsButtons.find((product) => product.id === productId)?.label
        );

        const { products: chatProducts }: ChatData = await req.getChatData();

        // Check if chatProducts already has the product
        // Send warning if product is already in the list
        if (chatProducts && chatProducts[product!.id]) {
          await res.send(
            "Ya registraste este producto. Si continuas vamos a sobreescribirlo."
          );
        }

        const correctProductRes = await res.booleanQuestion(
          `Es este el producto correcto?\n\nProducto: ${product?.name}\nDescripcion: ${product?.description}\nPrecio: $${product?.price}\nStock: ${product?.stock}\nComision para vendedor: $${product?.salesmanComission}\nPuntos para vendedor: ${product?.points}\nCosto de envio: $${product?.shippingCost}`
        );

        if (!correctProductRes) {
          await res.send("Por favor, selecciona el producto nuevamente.");
          return next(productSelectorMiddleware);
        }

        // Ask for amount of products
        const amount: number = await res.askForInput({
          text: "Cuantas unidades vendiste?",
          type: "number",
          checker: (input) => {
            const num = Number(input);
            const isNumber = !isNaN(num) && num > 0;
            if (!isNumber) return "Debes ingresar un numero valido.";
            if (num > product!.stock)
              return `No hay suficiente stock para esa cantidad. Solo quedan ${
                product!.stock
              } unidades.`;
            return true;
          },
        });

        await req.updateChatData((chatData: ChatData) => ({
          ...chatData,
          products: {
            ...chatData.products,
            [product!.id]: {
              id: product!.id,
              amount: amount,
              name: product!.name,
            },
          },
        }));

        // Ask if there are more products to add
        const moreProductsRes = await res.booleanQuestion(
          "Deseas agregar otro producto?"
        );
        if (moreProductsRes) {
          return next(productSelectorMiddleware);
        }

        await res.send("Perfecto! Falta muy poco para terminar.");

        next(lastStepsProcessingMiddleware);
      } catch (error) {
        if (error === "promise-timeout") return;

        console.log("Error loading catalogue:", error);
        await res.send(
          "Hubo un error al cargar el catalogo de productos! Por favor intenta nuevamente."
        );
        await res.send("Si el problema persiste, contacta a un moderador.");
      }
    };

    const lastStepsProcessingMiddleware = async (
      req: Request,
      res: Response,
      next: Next
    ) => {
      await res.send(
        "Gracias por la informacion! Estoy procesando tu venta..."
      );

      const ticketRes: {
        success: boolean;
        ticket?: Sale;
        error?: "NEGATIVE_STOCK" | "UNKNOWN";
      } = await trackProgress(
        req,
        async () => {
          try {
            // Store client
            // Process sale (store sale, update stock, update salesman points, send alert)
            const salesService = await getSalesService();
            const { products, client }: ChatData = await req.getChatData();

            const saleRes = await salesService.createSale({
              salesmanId: req.user.id,
              clientId: client!.clientId,
              details: {
                processVersion: 1,
                salesmanCommunicationGatewayId: req.originChannel.id,
              },
              products: Object.values(products!).map((product) => ({
                productId: product.id,
                amount: product.amount,
              })),
            });

            if (!saleRes.success) {
              await res.send("Hubo un error al procesar tu venta.");
              let negativeStockFound = false;
              for (const error of saleRes.errors!) {
                if (error.code === "NEGATIVE_STOCK") {
                  negativeStockFound = true;
                  // Get product name
                  const productName = products![error.productId].name;
                  await res.send(
                    `No hay suficiente stock para el producto '${productName}'. Parece que alguien se te adelanto!`
                  );
                }
              }
              if (negativeStockFound) {
                await res.send(
                  "Lamentamos el inconveniente, a veces pasa! Por favor intenta nuevamente."
                );
              }
              return {
                success: false,
                errorCode: "NEGATIVE_STOCK",
                markTrackerAsFailed: true,
              };
            }

            const idMsg = await res.send(`~ID:${saleRes.sale!.id}`);
            idMsg!.pin();

            const productNameByProductId = (id: string) => products![id].name;
            await res.send(`A continuación, el resumen de tu venta:

              **Código de seguimiento**: \`${saleRes.sale!.id}\`
              
              **Vendedor**: \`${req.user.tag}\`
              
              **Cliente**: \`${saleRes.sale!.client.id}\`
              
              **Productos**:${saleRes
                .sale!.products.map(
                  (product) =>
                    `  - ${product.amount} x **${productNameByProductId(product.productId)}**`
                )
                .join("\n")}
              
                
              **Estado**: \`${saleRes.sale!.status}\`
              
              **Fecha de creación**: \`${new Date(saleRes.sale!.createDate).toLocaleString()}\`
              
              **Puntos totales**: \`${calculateTotalPoints(saleRes.sale!)}\`
              
              **Comisión total**: \`${calculateTotalCommission(saleRes.sale!)}\`
              
              **Costo de envío final**: \`${calculateFinalShippingCost(saleRes.sale!)}\`
              
              **Costo final**: \`${calculateFinalCost(saleRes.sale!)}\``);

            return { success: true, ticket: saleRes.sale };
          } catch (error) {
            console.log("error processing sale:", error);
            res.send(
              "Ocurrio un error al procesar tu venta. Por favor intenta nuevamente mas tarde. Si el problema persiste, contacta a un moderador."
            );
            return {
              success: false,
              errorCode: "UNKNOWN",
              markTrackerAsFailed: true,
            };
          }
        },
        "Procesando venta",
        5000
      );

      if (!ticketRes.success) {
        return next(chatStarterMiddleware);
      }

      (req.originChannel as TextChannel).setTopic(channelTopicsMap.processing);
      await res.send("Ya estamos trabajando para procesar tu venta!\n");
      const pickedManager = await pickUserWithRole({
        request: req,
        roleName: "Sales-Manager",
      });
      if (pickedManager)
        await res.send(
          `${pickedManager.tag} es el manager de ventas asignado a tu ticket y estará disponible para responder a todas tus dudas. Pueden utilizar este canal para comunicarse directamente.`
        );
      await res.send(
        "Cuando haya una actualizacion en el estado de tu venta te avisaré por este canal! Hasta luego!"
      );
    };

    const chatApp = await getChatApp();

    // Add middleware to the chat app
    chatApp.addListener({
      categoryId: envs.OPEN_SALES_CATEGORY_ID,
      startPoint: chatStarterMiddleware,
      channelCreateCallback: async (channel) => {
        // Set the channel topic to initiated
        await channel.setTopic(channelTopicsMap.initiated);

        // Send Welcome message to the channel
        channel.send(
          "Parece que hiciste una venta! Envia un mensaje para registrarla."
        );
      },
      timeoutCallback: async (req, sendMessage) => {
        await sendMessage(
          "Parece que has tardado demasiado en responder. Envia un mensaje para iniciar nuevamente."
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
