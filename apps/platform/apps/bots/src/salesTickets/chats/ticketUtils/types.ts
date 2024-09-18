import { Catalogue } from "@platform/core/domain/catalogue";

export interface ClientData {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  addressNotes: string;
  clientId: string;
  salesmanId: string;
}
export interface ChatData {
  client?: ClientData;
  products?: {
    [key: string]: {
      id: string;
      amount: number;
      name: string;
    };
  };
  catalogue?: Catalogue;
  setClientMessageId?: string;
  addProductMessageId?: string;
  productsDataMessageId?: string;
  finishMessageId?: string;
  saleSummaryMessageId?: string;
}

export type TicketButton =
  | "add_client"
  | "select_client"
  | "unselect_client"
  | "update_client"
  | "add_product"
  | "confirm_sale"
  | "discard_ticket";

export const ticketButtons: { [key in TicketButton]: string } = {
  add_client: "add_client",
  select_client: "select_client",
  unselect_client: "unselect_client",
  update_client: "update_client",
  add_product: "add_product",
  confirm_sale: "confirm_sale",
  discard_ticket: "discard_ticket",
};

type interactionButton = "create-ticket-button" | "close-salesman-ticket";

export const interactionButtons: Record<interactionButton, string> = {
  "create-ticket-button": "create-ticket-button",
  "close-salesman-ticket": "close-salesman-ticket",
};
export const interactionButtonsList = Object.values(interactionButtons);
export const ticketButtonsList = Object.values(ticketButtons);

export type InteractionId = interactionButton | TicketButton;

export const channelTopicsMap = {
  initiated: "INITIATED",
  processing: "PROCESSING",
  closed: "CLOSED",
};
