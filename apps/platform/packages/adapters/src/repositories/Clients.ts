import { BaseFirestoreRepository } from "fireorm";
import ClientModel from "@platform/database/models/Client";
import { Client } from "@platform/core/domain/client";
import { ClientRepository as IClientRepository } from "@platform/core/services/types.repositories";
import { parseToDate, parseToFirestoreTimestamp } from "./utils";

export class ClientRepository implements IClientRepository {
  private clientRepository: BaseFirestoreRepository<ClientModel>;

  constructor(clientRepository: BaseFirestoreRepository<ClientModel>) {
    this.clientRepository = clientRepository;
  }

  public async createClient(clientData: Omit<Client, "id">): Promise<Client> {
    const client = await this.clientRepository.create({
      ...clientData,
      createDate: parseToFirestoreTimestamp(clientData.createDate),
    });

    return this.mapToDomain(client);
  }

  public async findById(id: string): Promise<Client> {
    const client = await this.clientRepository.findById(id);
    if (!client) throw new Error(`Client with id ${id} not found`);
    return this.mapToDomain(client);
  }

  public async findClientsBySalesmanId(salesmanId: string): Promise<Client[]> {
    const clients = await this.clientRepository
      .whereEqualTo("salesmanId", salesmanId)
      .find();
    return clients.map(this.mapToDomain);
  }

  public async updateClient(
    id: string,
    clientData: Partial<Omit<Client, "id" | "createDate">>
  ): Promise<Client> {
    const client = await this.clientRepository.update({
      id,
      ...(clientData as any),
    });
    return this.mapToDomain(client);
  }

  private mapToDomain(client: ClientModel): Client {
    return {
      ...client,
      createDate: parseToDate(client.createDate)!,
    };
  }
}

export default ClientRepository;
