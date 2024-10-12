import { UserRepository } from "@platform/core/src/services/User/types";
import { BaseFirestoreRepository } from "fireorm";
import UserCollection from "@platform/database/src/collections/User";
import { User, UserActivity, UserJWT } from "@platform/core/src/domain/user";
export declare class UserFirebaseRepository implements UserRepository {
    private userRepository;
    constructor(userRepository: BaseFirestoreRepository<UserCollection>);
    getById(email: string): Promise<User | null>;
    initUser(user: User): Promise<User>;
    updateUserJWTPayload(email: string, payload: Partial<UserJWT>): Promise<UserJWT>;
    PushUserActivity(email: string, activity: UserActivity): Promise<void>;
    getUsersDueForRenewal(limit: number): Promise<User[]>;
    private mapToDomainUser;
}
