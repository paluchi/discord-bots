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
}

export default ClientService;
