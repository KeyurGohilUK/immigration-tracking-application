import {
  DATABASE_STORES,
  openAppDatabase,
} from "../../../infrastructure/storage/app-database";
import { clearCurrentTermsAcceptance } from "../../legal/data/terms-repository";
import { clearOnboardingPreference } from "../../onboarding/services/onboarding-preference";

interface LocalDataDeletionDependencies {
  clearIndexedDbStores: () => Promise<void>;
  clearTermsAcceptance: () => void;
  clearOnboardingPreference: () => void;
}

async function clearIndexedDbStores(): Promise<void> {
  const database = await openAppDatabase();
  await new Promise<void>((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(
        Object.values(DATABASE_STORES),
        "readwrite",
      );
    } catch {
      database.close();
      reject(new Error("Local data could not be deleted."));
      return;
    }
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error("Local data could not be deleted."));
    };
    transaction.onerror = () => {
      // IndexedDB aborts the transaction, so no partial store wipe is committed.
    };
    try {
      for (const storeName of Object.values(DATABASE_STORES))
        transaction.objectStore(storeName).clear();
    } catch {
      transaction.abort();
    }
  });
}

const defaultDependencies: LocalDataDeletionDependencies = {
  clearIndexedDbStores,
  clearTermsAcceptance: clearCurrentTermsAcceptance,
  clearOnboardingPreference,
};

export async function deleteAllLocalData(
  dependencies: LocalDataDeletionDependencies = defaultDependencies,
): Promise<void> {
  await dependencies.clearIndexedDbStores();
  dependencies.clearTermsAcceptance();
  dependencies.clearOnboardingPreference();
}
