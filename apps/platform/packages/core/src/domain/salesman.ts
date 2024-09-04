import { z } from "zod";

// Operation Schema
export const OperationSchema = z.object({
  id: z.string(),
  createDate: z.date(),
  type: z.string(),
  details: z.record(z.string()),
});

// Extracted Operation Interface
export type Operation = z.infer<typeof OperationSchema>;

export const SalesmanAccountStatusSchema = z.enum([
  "activated",
  "deactivated",
  "banned",
]);
export type SalesmanAccountStatus = z.infer<typeof SalesmanAccountStatusSchema>;

// Salesman Schema
export const SalesmanSchema = z.object({
  id: z.string(),
  createDate: z.date(),
  name: z.string(),
  surname: z.string(),
  address: z.string(),
  email: z.string(),
  age: z.number(),
  gender: z.string(),
  teamId: z.string().optional(),
  points: z.number(),
  accountStatus: SalesmanAccountStatusSchema,
  operations: z.array(OperationSchema),
});

// Extracted Salesman Interface
export type Salesman = z.infer<typeof SalesmanSchema>;
