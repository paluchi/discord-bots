import admin from "firebase-admin";
const { firestore } = admin;

export const currentFirestoreTimestamp = () => {
  return firestore.Timestamp.now();
};

export const parseToDate = (timestamp: any): Date | undefined => {
  return timestamp instanceof firestore.Timestamp
    ? timestamp.toDate()
    : timestamp;
};

export const parseToFirestoreTimestamp = (
  date: Date
): admin.firestore.Timestamp => {
  return firestore.Timestamp.fromDate(date);
};

export const deleteFirestoreProperty = (): any => {
  return firestore.FieldValue.delete();
};
