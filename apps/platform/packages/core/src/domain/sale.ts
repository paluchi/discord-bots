import { z } from "zod";
import { SalesmanSchema } from "./salesman";
import { ClientSchema } from "./client";

const SaleProductSchema = z.object({
  id: z.string(),
  productId: z.string(),
  amount: z.number(),
});

const SaleStatusSchema = z.enum(["pending", "completed", "cancelled"]);
export type SaleStatus = z.infer<typeof SaleStatusSchema>;

const SaleSchema = z.object({
  id: z.string(),
  createDate: z.instanceof(Date),
  salesman: SalesmanSchema,
  status: SaleStatusSchema,
  resolutionDate: z.string().optional(), // optional if not always present
  details: z.record(z.string(), z.any()), // details is a Map, hence using z.record
  client: ClientSchema,
  products: z.array(SaleProductSchema), // products is a subdocument array
});

export type Sale = z.infer<typeof SaleSchema>;
export type SaleProduct = z.infer<typeof SaleProductSchema>;
