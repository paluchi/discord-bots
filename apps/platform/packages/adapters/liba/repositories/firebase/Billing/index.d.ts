import { BaseFirestoreRepository } from "fireorm";
import UserCollection from "@platform/database/src/collections/User";
import BillingCollection from "@platform/database/src/collections/Billing";
import { Billing } from "@platform/core/domain/billing";
import { BillingRepository } from "@platform/core/services/Billing/types";
export declare class BillingFirebaseRepository implements BillingRepository {
    private userRepository;
    private billingRepository;
    constructor(userRepository: BaseFirestoreRepository<UserCollection>, billingRepository: BaseFirestoreRepository<BillingCollection>);
    getbillingProviderCustomerId(email: string): Promise<string | undefined>;
    pushBilling(billingData: Billing): Promise<void>;
    setLastUserBillingDate(email: string, date: Date): Promise<void>;
}
