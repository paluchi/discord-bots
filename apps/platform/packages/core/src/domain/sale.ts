import { z } from "zod";
import { SalesmanSchema } from "./salesman";
import { ClientSchema } from "./client";
import { ProductSchema } from "./catalogue";

const SaleProductSchema = z.object({
  id: z.string(),
  productId: z.string(),
  amount: z.number(),
  productDetails: ProductSchema,
});

export const salesStatuses = {
  processing: "processing",
  completed: "completed",
  canceled: "canceled",
  backofficeUpdateRequest: "backoffice-update-request",
  salesmanUpdateRequest: "salesman-update-request",
} as const;
export type SaleStatus = (typeof salesStatuses)[keyof typeof salesStatuses];
const SaleStatusSchema = z.enum(Object.values(salesStatuses) as [SaleStatus]);

export const salesTransactionalStatuses = {
  sendBackofficeMessage: "send-backoffice-message",
  awaitingRequestFeedback: "awaiting-request-feedback",
  sendSalesmanMessage: "send-salesman-message",
  awaitingTicketArchivation: "awaiting-ticket-archivation",
  ticketArchived: "ticket-archived",
} as const;
export type SaleTransactionalStatus =
  (typeof salesTransactionalStatuses)[keyof typeof salesTransactionalStatuses];
const SaleTransactionalStatusSchema = z.enum(
  Object.values(salesTransactionalStatuses) as [SaleTransactionalStatus]
);

export const SaleDetailsSchema = z.object({
  salesmanCommunicationGatewayId: z.string().optional(), // communication channel id used by the salesman
  backofficeCommunicationMethod: z.enum(["discord-thread"]).optional(), // communication method used by the backoffice
  backofficeCommunicationGatewayId: z.string().optional(), // discord thread id used by the backoffice
  processVersion: z.number().optional(), // version of the process
  backofficeCancelReason: z.string().optional(), // reason for the cancellation from the backoffice
  backofficeUpdateRequest: z.string().optional(), // backoffice update request
  salesmanUpdateRequest: z.string().optional(), // salesman update request
});
export type SaleDetails = z.infer<typeof SaleDetailsSchema>;

const SaleSchema = z.object({
  id: z.string(),
  createDate: z.instanceof(Date),
  salesman: SalesmanSchema,
  status: SaleStatusSchema,
  transactionalStatus: SaleTransactionalStatusSchema,
  resolutionDate: z.string().optional(), // optional if not always present
  details: SaleDetailsSchema,
  client: ClientSchema,
  products: z.array(SaleProductSchema), // products is a subdocument array
});

export type Sale = z.infer<typeof SaleSchema>;
export type SaleProduct = z.infer<typeof SaleProductSchema>;
