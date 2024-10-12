"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFirebaseRepository = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const utils_1 = require("./utils");
class UserFirebaseRepository {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async getById(email) {
        try {
            const userDoc = await this.userRepository.findById(email);
            if (!userDoc) {
                return null;
            }
            return this.mapToDomainUser(userDoc);
        }
        catch (error) {
            console.error(`Error getting user with id: ${email}`, error);
            throw error;
        }
    }
    async initUser(user) {
        const { createDate, lastBillingDate, nextFeaturesRenewalDate, activities, ...userData } = user;
        try {
            const newUser = {
                ...userData,
                createDate: (0, utils_1.currentFirestoreTimestamp)(),
            };
            const createdUser = await this.userRepository.create(newUser);
            return this.mapToDomainUser(createdUser);
        }
        catch (error) {
            console.error(`Error initializing user: ${userData.id}`, error);
            if (error instanceof Error && error.message.includes("already exists")) {
                throw new Error(`User with id ${userData.id} already exists`);
            }
            throw error;
        }
    }
    async updateUserJWTPayload(email, payload) {
        // Get user by email
        const user = await firebase_admin_1.default.auth().getUserByEmail(email);
        // Get existing custom claims
        const existingClaims = user.customClaims || {};
        // Merge existing claims with new payload
        const updatedClaims = {
            ...existingClaims,
            ...payload,
        };
        // Set custom user claims
        await firebase_admin_1.default.auth().setCustomUserClaims(user.uid, updatedClaims);
        // Return the updated JWT payload
        return updatedClaims;
    }
    async PushUserActivity(email, activity) {
        const user = await this.userRepository.findById(email);
        if (!user) {
            throw new Error(`User with id ${email} not found`);
        }
        const userActivity = {
            ...activity,
            createDate: (0, utils_1.currentFirestoreTimestamp)(),
        };
        await user.activities?.create(userActivity);
    }
    async getUsersDueForRenewal(limit) {
        let query = this.userRepository
            .whereLessOrEqualThan("nextFeaturesRenewalDate", (0, utils_1.currentFirestoreTimestamp)().toDate())
            .limit(limit);
        const users = await query.find();
        return Promise.all(users.map((user) => this.mapToDomainUser(user)));
    }
    async mapToDomainUser(dbUser) {
        const activitiesSnapshot = await dbUser.activities?.find();
        const activities = activitiesSnapshot?.map((activity) => ({
            ...activity,
            createDate: (0, utils_1.parseToDate)(activity.createDate),
        })) || [];
        return {
            ...dbUser,
            createDate: (0, utils_1.parseToDate)(dbUser.createDate),
            lastBillingDate: (0, utils_1.parseToDate)(dbUser.lastBillingDate),
            nextFeaturesRenewalDate: (0, utils_1.parseToDate)(dbUser.nextFeaturesRenewalDate),
            activities,
        };
    }
}
exports.UserFirebaseRepository = UserFirebaseRepository;
//# sourceMappingURL=User.js.map