import { z } from "zod";

// Product Schema
export const ProductSchema = z.object({
  id: z.string(),
  backofficeId: z.string(),
  createDate: z.date(),
  categoryId: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  stock: z.number(),
  points: z.number(),
  display: z.boolean(),
  shippingCost: z.number(),
  salesmanComission: z.number(),
});

// Extracted Product Interface
export type Product = z.infer<typeof ProductSchema>;

// Category Schema
export const CategorySchema = z.object({
  id: z.string(),
  backofficeId: z.string(),
  createDate: z.date(),
  name: z.string(),
  description: z.string(),
  products: z.array(ProductSchema),
});

// Extracted Category Interface
export type Category = z.infer<typeof CategorySchema>;

// Catalogue Schema
export const CatalogueSchema = z.object({
  id: z.string(),
  createDate: z.date(),
  name: z.string(),
  description: z.string(),
  categories: z.array(CategorySchema),
});

// Extracted Catalogue Interface
export type Catalogue = z.infer<typeof CatalogueSchema>;
