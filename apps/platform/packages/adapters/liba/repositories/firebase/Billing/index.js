"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingFirebaseRepository = void 0;
const utils_1 = require("../utils");
class BillingFirebaseRepository {
    constructor(userRepository, billingRepository) {
        this.userRepository = userRepository;
        this.billingRepository = billingRepository;
    }
    async getbillingProviderCustomerId(email) {
        const user = await this.userRepository.findById(email);
        if (!user) {
            throw new Error("User not found");
        }
        return user.billingProviderCustomerId;
    }
    async pushBilling(billingData) {
        const billing = {
            ...billingData,
            billingDate: (0, utils_1.currentFirestoreTimestamp)(),
        };
        await this.billingRepository.create(billing);
    }
    async setLastUserBillingDate(email, date) {
        const user = await this.userRepository.findById(email);
        if (!user) {
            throw new Error("User not found");
        }
        user.lastBillingDate = (0, utils_1.parseToFirestoreTimestamp)(date);
        await this.userRepository.update(user);
    }
}
exports.BillingFirebaseRepository = BillingFirebaseRepository;
//# sourceMappingURL=index.js.map