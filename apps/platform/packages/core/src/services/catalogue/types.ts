import { Catalogue, Category, Product } from "../../domain/catalogue";

export interface CatalogueService {
  getFullCatalogue(): Promise<Catalogue>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  checkProductStock(productId: string): Promise<number>;
  getCategoryDetails(categoryId: string): Promise<Category>;
  getProductDetails(productId: string): Promise<Product>;
}
