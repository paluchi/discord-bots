import { ClientService as IClientService } from "../types.services";
import { ClientRepository as IClientRepository } from "../types.repositories";
import { Client } from "../../domain/client";

class ClientService implements IClientService {
  clientsRepository: IClientRepository;

  constructor(clientsRepository: IClientRepository) {
    this.clientsRepository = clientsRepository;
  }

  async createClient(
    clientData: Omit<Client, "id" | "createDate">
  ): Promise<Client> {
    return this.clientsRepository.createClient({
      ...clientData,
      createDate: new Date(),
    });
  }

  async findById(id: string): Promise<Client> {
    return this.clientsRepository.findById(id);
  }

  async findClientsBySalesmanId(salesmanId: string): Promise<Client[]> {
    return this.clientsRepository.findClientsBySalesmanId(salesmanId);
  }

  async updateClient(
    id: string,
    clientData: Partial<Omit<Client, "id" | "createDate">>
  ): Promise<Client> {
    return this.clientsRepository.updateClient(id, clientData);
  }
}

export default ClientService;
