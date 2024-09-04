import { Collection, getRepository } from "fireorm";
import { firestore } from "firebase-admin";
import { Product } from "@platform/core/domain/catalogue";

// Firestore-specific interface for Product
export interface FirestoreProduct extends Omit<Product, "createDate"> {
  id: string;
  createDate: firestore.Timestamp;
}

// Product model
@Collection("products")
export class ProductModel implements FirestoreProduct {
  id!: string;
  backofficeId!: string;
  createDate!: firestore.Timestamp;
  categoryId!: string;
  name!: string;
  description!: string;
  price!: number;
  stock!: number;
  points!: number;
  display!: boolean;
  shippingCost!: number;
  salesmanComission!: number;
}

export default ProductModel;

// Function to get the Firebase repository for Product
export const getProductFirebaseRepository = () => getRepository(ProductModel);
