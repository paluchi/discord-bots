import { Salesman, SalesmanSchema } from "../../domain/salesman";
import { SalesmanRepository as ISalesmanRepository } from "../types.repositories";
import {
  SalesmanService as ISalesmanService,
  UserDetails,
} from "../types.services";

class SalesmanService implements ISalesmanService {
  private salesmanRepository: ISalesmanRepository;

  constructor(salesmanRepository: ISalesmanRepository) {
    this.salesmanRepository = salesmanRepository;
  }

  async onboard(userId: string, userDetails: UserDetails): Promise<void> {
    const user = {
      ...userDetails,
      id: userId,
      points: 0,
      accountStatus: "activated" as any,
      createDate: new Date(),
    };

    SalesmanSchema.omit({
      operations: true,
    }).parse(user);

    await this.salesmanRepository.onboard(user);
  }

  async offboard(userId: string): Promise<void> {
    throw new Error("Not implemented");
  }

  async block(userId: string): Promise<void> {
    throw new Error("Not implemented");
  }

  async unblock(userId: string): Promise<void> {
    throw new Error("Not implemented");
  }

  async getUserDetails(userId: string): Promise<Salesman | null> {
    return this.salesmanRepository.getUserDetails(userId);
  }

  async updateUserDetails(
    userId: string,
    userDetails: UserDetails
  ): Promise<void> {
    throw new Error("Not implemented");
  }

  async listSalesmen(): Promise<Salesman[]> {
    throw new Error("Not implemented");
  }

  async isBlocked(userId: string): Promise<boolean> {
    throw new Error("Not implemented");
  }
}

export default SalesmanService;
