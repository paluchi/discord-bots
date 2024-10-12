"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanFirebaseRepository = void 0;
const utils_1 = require("../utils");
class PlanFirebaseRepository {
    constructor(planRepository, userRepository) {
        this.planRepository = planRepository;
        this.userRepository = userRepository;
    }
    async getPlanVersion(planId, version) {
        const fbPlan = await this.planRepository.findById(planId);
        if (!fbPlan) {
            throw new Error("Plan not found");
        }
        const plan = await this.mapToDomainPlan(fbPlan);
        // Ensure versions is initialized and not empty
        if (!plan.versions || plan.versions.length === 0) {
            throw new Error("No versions found for this plan");
        }
        let targetVersion;
        if (version !== undefined) {
            // Find the specific version
            targetVersion = await plan.versions.find((v) => v.version === version);
        }
        else {
            // Get the latest version
            targetVersion = plan.versions.sort((a, b) => b.version - a.version)[0];
        }
        if (!targetVersion) {
            throw new Error(`Version ${version} not found for plan ${planId}`);
        }
        return targetVersion;
    }
    async UserPlanFeaturesRefil(userId, planIdProp, safeMode = true) {
        try {
            const userDoc = await this.userRepository.findById(userId);
            if (!userDoc) {
                throw new Error(`User with id ${userId} not found`);
            }
            const planId = planIdProp || userDoc.planId;
            const planVersion = await this.getPlanVersion(planId);
            if (safeMode && userDoc.nextFeaturesRenewalDate) {
                // Check if time from last renewal to current date is older than plan renewal period
                const nextRenewalDate = (0, utils_1.parseToDate)(userDoc.nextFeaturesRenewalDate);
                const currentDate = new Date();
                if (nextRenewalDate && currentDate < nextRenewalDate)
                    return null;
            }
            let newTokensAmount = planVersion.features.tokens;
            // For now, we just add the new tokens to the existing ones
            newTokensAmount += userDoc.availableTokens || 0;
            // Calculate next renewal date
            const nextRenewalDate = new Date();
            nextRenewalDate.setDate(nextRenewalDate.getDate() + planVersion.featuresRenewalCycle);
            userDoc.nextFeaturesRenewalDate =
                (0, utils_1.parseToFirestoreTimestamp)(nextRenewalDate);
            userDoc.availableTokens = newTokensAmount;
            await this.userRepository.update(userDoc);
            // Add activity to user
            return {
                newTokensAmount,
                nextFeaturesRenewalDate: nextRenewalDate,
            };
        }
        catch (error) {
            console.error(`Error updating last features renewal for user ${userId}:`, error);
            throw error;
        }
    }
    async UserPlanFeaturesUpdate(userId, newTokensAmount) {
        try {
            const userDoc = await this.userRepository.findById(userId);
            if (!userDoc) {
                throw new Error(`User with id ${userId} not found`);
            }
            userDoc.nextFeaturesRenewalDate = (0, utils_1.currentFirestoreTimestamp)();
            userDoc.availableTokens = newTokensAmount;
            await this.userRepository.update(userDoc);
        }
        catch (error) {
            console.error(`Error updating last features renewal for user ${userId}:`, error);
            throw error;
        }
    }
    async subscribeUser(email, planId) {
        // First, fetch the current user document
        const user = await this.userRepository.findById(email);
        if (!user) {
            throw new Error("User not found");
        }
        if (user.planId === planId)
            return;
        // Update the planId
        user.planId = planId;
        // The next renewal date will be set when the user's features are refilled
        // Perform the update
        await this.userRepository.update(user);
    }
    async unsubscribeUser(email, isCancelingSubscription = false) {
        // First, fetch the current user document
        const user = await this.userRepository.findById(email);
        if (!user) {
            throw new Error("User not found");
        }
        // get Trial plan
        const lastTrialVersion = await this.getPlanVersion("trial");
        const nextRenewalDate = new Date();
        nextRenewalDate.setDate(nextRenewalDate.getDate() + lastTrialVersion.featuresRenewalCycle);
        // Update the planId
        user.planId = "trial";
        // If undefined it's asumed that the user is upgrading/downgrading to paid plan
        user.nextFeaturesRenewalDate = isCancelingSubscription
            ? (0, utils_1.parseToFirestoreTimestamp)(nextRenewalDate)
            : (0, utils_1.deleteFirestoreProperty)();
        // Perform the update
        await this.userRepository.update(user);
    }
    async mapToDomainPlan(plan) {
        const versionsSnapshot = await plan.versions.find();
        const versions = versionsSnapshot.map((version) => ({
            ...version,
            createDate: (0, utils_1.parseToDate)(version.createDate),
        }));
        return {
            ...plan,
            versions,
            createDate: (0, utils_1.parseToDate)(plan.createDate),
        };
    }
}
exports.PlanFirebaseRepository = PlanFirebaseRepository;
//# sourceMappingURL=index.js.map