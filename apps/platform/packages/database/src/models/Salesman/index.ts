import {
  Collection,
  SubCollection,
  ISubCollection,
  getRepository,
} from "fireorm";
import { firestore } from "firebase-admin";
import {
  SalesmanAccountStatus,
  Operation as SalesmanOperationInterface,
  Salesman as SalesmanInterface,
} from "@platform/core/domain/salesman";

export interface FirestoreSalesmanOperation
  extends Omit<SalesmanOperationInterface, "createDate"> {
  createDate: firestore.Timestamp;
}

class SalesmanOperation implements FirestoreSalesmanOperation {
  id!: string;
  type!: string;
  details!: Record<string, any>;
  createDate!: firestore.Timestamp;
}

export interface FirestoreSalesman
  extends Omit<SalesmanInterface, "createDate" | "operations"> {
  createDate: firestore.Timestamp;
  operations?: ISubCollection<SalesmanOperation>;
}

@Collection("salesmen")
export class SalesmanModel implements FirestoreSalesman {
  id!: string;
  createDate!: firestore.Timestamp;
  name!: string;
  surname!: string;
  address!: string;
  email!: string;
  age!: number;
  gender!: string;
  teamId?: string;
  points!: number;
  accountStatus!: SalesmanAccountStatus;

  @SubCollection(SalesmanOperation, "operations")
  operations?: ISubCollection<SalesmanOperation>;
}

export default SalesmanModel;

export const getSalesmanFirebaseReposository = () =>
  getRepository(SalesmanModel);
