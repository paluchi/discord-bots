import admin from "firebase-admin";
declare const firestore: typeof admin.firestore;
export declare const currentFirestoreTimestamp: () => admin.firestore.Timestamp;
export declare const parseToDate: (timestamp: any) => Date | undefined;
export declare const parseToFirestoreTimestamp: (date: Date) => admin.firestore.Timestamp;
export declare const deleteFirestoreProperty: () => any;
export {};
