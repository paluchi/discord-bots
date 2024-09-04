import { Channel, Client, Guild, Message, User } from "discord.js";
import StateManager, { RequestDataOptions } from "./StateManager";

export type UpdateChatData = (
  data: Object | ((data: any) => any),
  options?: RequestDataOptions
) => Promise<any>;
export interface Request {
  message: Message<boolean>;
  user: User;
  originChannel: Channel;
  client: Client;
  guild: Guild;
  stateManager: StateManager;
  getChatData: () => Promise<any>;
  updateChatData: UpdateChatData;
}

export interface RequestDataResponse {
  status: "awaiting" | "received" | "timeout" | "error";
  response: string;
}

export interface Response {
  send: (message: string) => Promise<void>;
  requestData: (message?: string) => Promise<RequestDataResponse>;
  askForInput: (expectedInput: {
    text?: string;
    buttons?: { id: string; label: string }[][];
    type?: "string" | "number" | "boolean";
    checker?: (input: any) => boolean | string | Promise<boolean | string>;
  }) => Promise<any>;
  booleanQuestion: (question: string) => Promise<boolean>;
}

export type Next = (middleware?: ChatMiddleware) => void;

export type ChatMiddleware = (
  req: Request,
  res: Response,
  next: Next
) => Promise<void>;
