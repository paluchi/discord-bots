import { z } from "zod";
import { CatalogueSchema, CategorySchema, ProductSchema } from "./catalogue";

export const BackofficeProductSchema = ProductSchema.omit({
  createDate: true,
  id: true,
}).merge(
  z.object({
    pushStock: z.number(),
    backofficeId: z.string(),
    id: z.string().optional(),
  })
);
export type BackofficeProduct = z.infer<typeof BackofficeProductSchema>;

export const BackofficeCategorySchema = CategorySchema.omit({
  products: true,
  createDate: true,
  id: true,
}).merge(
  z.object({
    products: z.array(BackofficeProductSchema),
    backofficeId: z.string(),
    id: z.string().optional(),
  })
);
export type BackofficeCategory = z.infer<typeof BackofficeCategorySchema>;

export const BackofficeCatalogueSchema = CatalogueSchema.omit({
  categories: true,
  createDate: true,
  id: true,
}).merge(
  z.object({
    categories: z.array(BackofficeCategorySchema),
  })
);

export type BackofficeCatalogue = z.infer<typeof BackofficeCatalogueSchema>;
