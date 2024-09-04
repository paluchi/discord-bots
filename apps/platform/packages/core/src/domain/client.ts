import { z } from "zod";

export const ClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneNumber: z.string(),
  email: z.string(),
  address: z.string(),
  addressNotes: z.string(),
  createDate: z.date(),
  details: z.record(z.string(), z.string()).optional(),
  salesmanId: z.string(),
});

export type Client = z.infer<typeof ClientSchema>;
