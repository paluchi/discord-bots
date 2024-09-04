import { Catalogue, Category } from "@platform/core/domain/catalogue";
import { firestore } from "firebase-admin";
import {
  Collection,
  getRepository,
  ISubCollection,
  SubCollection,
} from "fireorm";

// Firestore-specific interfaces
export interface FirestoreCategory extends Omit<Category, "createDate" | "products"> {
  createDate: firestore.Timestamp;
}

export interface FirestoreCatalogue
  extends Omit<Catalogue, "createDate" | "categories"> {
  id: string;
  createDate: firestore.Timestamp;
  categories?: ISubCollection<FirestoreCategory>;
}

// Category model
export class CategoryModel implements FirestoreCategory {
  id!: string;
  backofficeId!: string;
  createDate!: firestore.Timestamp;
  name!: string;
  description!: string;
}

// Main Catalogue model
@Collection("catalogues")
export class CatalogueModel implements FirestoreCatalogue {
  id!: string;
  createDate!: firestore.Timestamp;
  name!: string;
  description!: string;

  @SubCollection(CategoryModel, "categories")
  categories!: ISubCollection<CategoryModel>;
}

export default CatalogueModel;

// Function to get the Firebase repository for Catalogue
export const getCatalogueFirebaseRepository = () =>
  getRepository(CatalogueModel);
