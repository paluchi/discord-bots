import envs from "../env";
import StateManager from "./StateManager";
import { RequestDataResponse } from "./types";

export class PromiseManager {
  private stateManager: StateManager;
  private activePromises: {
    [key: string]: { resolve: Function; reject: Function };
  } = {};

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async createPromise(
    key: string,
    timeoutMs: number,
    timeoutCallback?: Function
  ): Promise<RequestDataResponse> {
    const keyPattern = `request:${key}`;
    await this.stateManager.setRequestData(keyPattern, {
      status: "awaiting",
    });

    return new Promise((resolve, reject) => {
      let timeoutId: any = null;
      let processing = false;

      const checkInterval = setInterval(async () => {
        if (processing) return;
        processing = true;
        const data = await this.stateManager.getRequestData(keyPattern);

        if (data && (data as any).status === "resolved") {
          await this.activePromises[keyPattern]?.resolve(data);
        } else if (!data) {
          this.activePromises[keyPattern]?.reject("Request data not found");
        }
        processing = false;
      }, envs.POLLING_INTERVAL_MS);

      if (timeoutMs > 0) {
        timeoutId = setTimeout(async () => {
          if (this.activePromises[keyPattern]) {
            timeoutCallback && (await timeoutCallback());
            await this.discardPromise(keyPattern, "promise-timeout");
          }
        }, timeoutMs);

        this.activePromises[keyPattern] = {
          resolve: async (data: any) => {
            timeoutId && clearInterval(timeoutId);
            clearInterval(checkInterval);
            await this.stateManager.deleteRequestData(keyPattern);
            resolve(data);
            delete this.activePromises[keyPattern];
          },
          reject: async (reason: string) => {
            timeoutId && clearInterval(timeoutId);
            clearInterval(checkInterval);
            await this.stateManager.deleteRequestData(keyPattern);
            reject(reason);
            delete this.activePromises[keyPattern];
          },
        };
      }
    });
  }

  async discardPromise(key: string, reason: string = "UNKNOWN") {
    const keyPattern = key.includes("request:") ? key : `request:${key}`;
    await this.activePromises[keyPattern]?.reject(reason);
  }
}
