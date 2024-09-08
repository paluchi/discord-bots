import { Operation, Salesman } from "@platform/core/domain/salesman";
import {
  SalesmanRepository as ISalesmanRepository,
  RepositoryOnboardingUserDetails,
} from "@platform/core/services/types.repositories";
import { UserDetails } from "@platform/core/services/types.services";
import { parseToDate, parseToFirestoreTimestamp } from "./utils";
import SalesmanModel, {
  FirestoreSalesman,
  FirestoreSalesmanOperation,
} from "@platform/database/models/Salesman";
import { BaseFirestoreRepository } from "fireorm";

export class SalesmanRepository implements ISalesmanRepository {
  private salesmanRepository;

  constructor(salesmanRepository: BaseFirestoreRepository<SalesmanModel>) {
    this.salesmanRepository = salesmanRepository;
  }

  public async onboard(
    userDetails: RepositoryOnboardingUserDetails
  ): Promise<void> {
    await this.salesmanRepository.create({
      ...userDetails,
      createDate: parseToFirestoreTimestamp(userDetails.createDate),
    });
  }

  public async offboard(userId: string): Promise<void> {
    throw new Error("Not implemented");
  }

  public async sumPoints(userId: string, points: number): Promise<void> {
    // Run transaction to sum points
    await this.salesmanRepository.runTransaction(async (transaction) => {
      const salesman = await transaction.findById(userId);
      if (!salesman) throw new Error(`Salesman with id ${userId} not found`);

      await transaction.update({
        points: salesman.points + points,
        id: userId,
      });
    });
  }

  public async block(userId: string): Promise<void> {
    throw new Error("Not implemented");
  }

  public async unblock(userId: string): Promise<void> {
    throw new Error("Not implemented");
  }

  public async getUserDetails(userId: string): Promise<Salesman | null> {
    const data = await this.salesmanRepository.findById(userId);
    if (!data) {
      return null;
    }

    return this.mapToDomain(data);
  }

  public async updateUserDetails(
    userId: string,
    userDetails: UserDetails
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  public async listSalesmen(): Promise<Salesman[]> {
    throw new Error("Not implemented");
  }

  public async isBlocked(userId: string): Promise<boolean> {
    throw new Error("Not implemented");
  }

  public async findById(id: string): Promise<Salesman> {
    const data = await this.salesmanRepository.findById(id);
    if (!data) throw new Error(`Salesman with id ${id} not found`);

    return this.mapToDomain(data);
  }

  private mapOperationToDomain(doc: FirestoreSalesmanOperation): Operation {
    return {
      ...doc,
      createDate: parseToDate(doc.createDate)!,
    };
  }

  private async mapToDomain(doc: FirestoreSalesman): Promise<Salesman> {
    const last100Operations = doc.operations
      ? await doc.operations.limit(100).orderByDescending("createDate").find()
      : [];

    return {
      ...doc,
      createDate: parseToDate(doc.createDate)!,
      operations: last100Operations.map(this.mapOperationToDomain),
    };
  }
}

export default SalesmanRepository;
