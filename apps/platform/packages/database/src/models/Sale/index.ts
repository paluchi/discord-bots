import {
  Collection,
  SubCollection,
  ISubCollection,
  getRepository,
} from "fireorm";
import { firestore } from "firebase-admin";
import { Sale, SaleProduct, SaleStatus } from "@platform/core/domain/sale";

class SaleProductModel implements SaleProduct {
  id!: string;
  productId!: string;
  amount!: number;
}

// Modify the FirestoreSale interface
export interface FirestoreSale
  extends Omit<Sale, "createDate" | "products" | "salesman" | "client"> {
  id: string;
  createDate: firestore.Timestamp;
  products?: ISubCollection<SaleProductModel>;
  salesmanId: string;
  clientId: string;
}

@Collection("sales")
export class SaleModel implements FirestoreSale {
  id!: string;
  createDate!: firestore.Timestamp;
  salesmanId!: string;
  status!: SaleStatus;
  resolutionDate?: string;
  details!: Record<string, any>;
  clientId!: string;

  @SubCollection(SaleProductModel, "products")
  products?: ISubCollection<SaleProductModel>;
}

export default SaleModel;

export const getSalesFirebaseRepository = () => getRepository(SaleModel);
