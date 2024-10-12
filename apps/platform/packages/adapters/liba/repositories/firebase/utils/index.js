"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFirestoreProperty = exports.parseToFirestoreTimestamp = exports.parseToDate = exports.currentFirestoreTimestamp = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const { firestore } = firebase_admin_1.default;
const currentFirestoreTimestamp = () => {
    return firestore.Timestamp.now();
};
exports.currentFirestoreTimestamp = currentFirestoreTimestamp;
const parseToDate = (timestamp) => {
    return timestamp instanceof firestore.Timestamp
        ? timestamp.toDate()
        : timestamp;
};
exports.parseToDate = parseToDate;
const parseToFirestoreTimestamp = (date) => {
    return firestore.Timestamp.fromDate(date);
};
exports.parseToFirestoreTimestamp = parseToFirestoreTimestamp;
const deleteFirestoreProperty = () => {
    return firestore.FieldValue.delete();
};
exports.deleteFirestoreProperty = deleteFirestoreProperty;
//# sourceMappingURL=index.js.map