import { BaseFirestoreRepository } from "fireorm";
import PlanCollection from "@platform/database/src/collections/Plan";
import UserCollection from "@platform/database/src/collections/User";
import { PlanRepository } from "@platform/core/services/Billing/types";
import { PlanName, PlanVersion } from "@platform/core/domain/plan";
export declare class PlanFirebaseRepository implements PlanRepository {
    private planRepository;
    private userRepository;
    constructor(planRepository: BaseFirestoreRepository<PlanCollection>, userRepository: BaseFirestoreRepository<UserCollection>);
    getPlanVersion(planId: string, version?: number): Promise<PlanVersion>;
    UserPlanFeaturesRefil(userId: string, planIdProp?: PlanName, safeMode?: boolean): Promise<{
        newTokensAmount: number;
        nextFeaturesRenewalDate: Date;
    } | null>;
    UserPlanFeaturesUpdate(userId: string, newTokensAmount: number): Promise<void>;
    subscribeUser(email: string, planId: PlanName): Promise<void>;
    unsubscribeUser(email: string, isCancelingSubscription?: boolean): Promise<void>;
    private mapToDomainPlan;
}
