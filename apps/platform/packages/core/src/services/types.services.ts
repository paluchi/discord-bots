import { Product } from "../domain/catalogue";
import { Client } from "../domain/client";
import { Sale, SaleProduct } from "../domain/sale";
import { Salesman } from "../domain/salesman";
import { AddStockError, SaleInput } from "./types.repositories";

export type Role =
  | "Member"
  | "Salesman"
  | "Moderator"
  | "Admin"
  | "Sales-Manager"
  | "Shipping-Manager";
export const roles: { [key in Role]: Role } = {
  Member: "Member",
  Salesman: "Salesman",
  Moderator: "Moderator",
  Admin: "Admin",
  "Sales-Manager": "Sales-Manager",
  "Shipping-Manager": "Shipping-Manager",
};

// SERVICES
export interface CatalogueService {
  getCategories(): { name: string }[];
  getProductsByCategory(categoryName: string): Product[];
  checkStock(productName: string, amount: number): boolean;
}

export type UserDetails = Omit<
  Salesman,
  "id" | "teamId" | "points" | "accountStatus" | "operations" | "createDate"
>;
export interface SalesmanService {
  onboard(userId: string, userDetails: UserDetails): Promise<void>;
  offboard(userId: string): Promise<void>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  getUserDetails(userId: string): Promise<Salesman | null>;
  updateUserDetails(userId: string, userDetails: UserDetails): Promise<void>;
  listSalesmen(): Promise<Salesman[]>;
  isBlocked(userId: string): Promise<boolean>;
}

export interface SaleData
  extends Omit<
    Sale,
    "id" | "createDate" | "status" | "products" | "salesman" | "client"
  > {
  products: Omit<SaleProduct, "id" | "productDetails">[];
  salesmanId: string;
  clientId: string;
}
export interface SalesService {
  getSaleById(id: string): Promise<Sale | null>;
  createSale(
    saleData: SaleData
  ): Promise<{ success: boolean; sale?: Sale; errors?: AddStockError[] }>;
  updateSale(id: string, saleData: Partial<SaleInput>): Promise<Sale | null>;
}

// Interface for ClientService
export interface ClientService {
  createClient(clientData: Omit<Client, "id" | "createDate">): Promise<Client>;
}
