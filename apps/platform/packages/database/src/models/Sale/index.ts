import {
  Collection,
  SubCollection,
  ISubCollection,
  getRepository,
} from "fireorm";
import { firestore } from "firebase-admin";
import {
  Sale,
  SaleDetails,
  SaleProduct,
  SaleStatus,
  SaleTransactionalStatus,
} from "@platform/core/domain/sale";

class SaleProductModel implements Omit<SaleProduct, "productDetails"> {
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

class FirebaseSaleDetails implements SaleDetails {
  salesmanCommunicationGatewayId?: string;
  backofficeCommunicationMethod?: "discord-thread";
  backofficeCommunicationGatewayId?: string;
  processVersion?: number;
  backofficeCancelReason?: string;
  backofficeUpdateRequest?: string;
  salesmanUpdateRequest?: string;
}

@Collection("sales")
export class SaleModel implements FirestoreSale {
  id!: string;
  createDate!: firestore.Timestamp;
  salesmanId!: string;
  status!: SaleStatus;
  transactionalStatus!: SaleTransactionalStatus;
  resolutionDate?: string;
  details!: FirebaseSaleDetails;
  clientId!: string;

  @SubCollection(SaleProductModel, "products")
  products?: ISubCollection<SaleProductModel>;
}

export default SaleModel;

export const getSalesFirebaseRepository = () => getRepository(SaleModel);
