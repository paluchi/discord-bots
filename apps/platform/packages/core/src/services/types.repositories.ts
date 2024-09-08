import { BackofficeCatalogue } from "../domain/backofficeCatalogue";
import { Catalogue, Category, Product } from "../domain/catalogue";
import { Sale } from "../domain/sale";
import { Salesman } from "../domain/salesman";
import { UserDetails } from "./types.services";
import { Client } from "../domain/client";

// REPOSITORIES
export interface AddCategoryInput extends Omit<Category, "products" | "id"> {
  products: Omit<Product, "id">[];
}

export interface AddStockError {
  productId: string;
  code: "NOT_FOUND" | "NEGATIVE_STOCK";
  details: Record<string, any>;
}
export interface CatalogueRepository {
  getFullCatalogue(): Promise<Catalogue>;
  getCategoriesNames(catalogueId: string): Promise<{ name: string }[]>;
  getProductById(
    categoryId: string,
    productId: string
  ): Promise<Product | undefined>;
  getCategoryById(id: string): Promise<Category | undefined>;
  updateCatalogue(catalogue: Partial<Catalogue>): Promise<void>;
  getCategoryProducts(categoryId: string): Promise<Product[] | undefined>;
  addStock(
    products: {
      productId: string;
      amount: number;
    }[]
  ): Promise<{
    success: boolean;
    errors?: AddStockError[];
  }>;
  addCategory(category: AddCategoryInput): Promise<Category>;
  addProductToCategory(product: Omit<Product, "id">): Promise<Product>;
  updateProduct(
    productId: string,
    productData: Partial<Omit<Product, "createDate">>
  ): Promise<void>;
}

export interface BackofficeCatalogueRepository {
  getCatalogueData(): Promise<BackofficeCatalogue>;
  generateNewCatalogue(): Promise<boolean>;
  updateProductId(backofficeId: string, id: string): Promise<void>;
  updateCategoryId(backofficeId: string, id: string): Promise<void>;
  restartStockToPush(backofficeId: string): Promise<void>;
  updateDisplayedProductStock(
    backofficeId: string,
    stock: number
  ): Promise<void>;
}

export type RepositoryOnboardingUserDetails = Omit<
  Salesman,
  "teamId" | "operations"
>;
export interface SalesmanRepository {
  onboard(userDetails: RepositoryOnboardingUserDetails): Promise<void>;
  offboard(userId: string): Promise<void>;
  sumPoints(userId: string, points: number): Promise<void>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  getUserDetails(userId: string): Promise<Salesman | null>;
  updateUserDetails(userId: string, userDetails: UserDetails): Promise<void>;
  listSalesmen(): Promise<Salesman[]>;
  isBlocked(userId: string): Promise<boolean>;
  findById(id: string): Promise<Salesman>;
}

export interface SaleInput extends Omit<Sale, "id" | "client" | "salesman"> {
  clientId: string;
  salesmanId: string;
}
// Interface for SaleRepository
export interface SalesRepository {
  getSaleById(id: string): Promise<Sale>;
  storeSale(saleData: SaleInput): Promise<Sale>;
  updateSale(saleId: string, saleData: Partial<SaleInput>): Promise<Sale>;
}

// Interface for ClientRepository
export interface ClientRepository {
  createClient(clientData: Omit<Client, "id">): Promise<Client>;
  findById(id: string): Promise<Client>;
}
