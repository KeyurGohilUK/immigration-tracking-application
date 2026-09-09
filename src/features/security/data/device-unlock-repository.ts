import {
  DATABASE_STORES,
  openAppDatabase,
} from "../../../infrastructure/storage/app-database";
import {
  isDeviceUnlockRecord,
  type DeviceUnlockRecord,
} from "../services/device-unlock";

const SECURITY_STORE = DATABASE_STORES.security;
const DEVICE_UNLOCK_KEY = "device-unlock";

export async function getDeviceUnlockRecord(): Promise<DeviceUnlockRecord | null> {
  const database = await openAppDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SECURITY_STORE, "readonly");
    const request = transaction
      .objectStore(SECURITY_STORE)
      .get(DEVICE_UNLOCK_KEY);
    request.onsuccess = () => {
      if (request.result === undefined) {
        resolve(null);
        return;
      }
      if (!isDeviceUnlockRecord(request.result)) {
        reject(new Error("Device Unlock contains invalid local metadata."));
        return;
      }
      resolve(request.result);
    };
    request.onerror = () =>
      reject(new Error("Device Unlock metadata could not be read."));
    transaction.oncomplete = () => database.close();
  });
}

export async function saveDeviceUnlockRecord(
  record: DeviceUnlockRecord,
): Promise<void> {
  const database = await openAppDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SECURITY_STORE, "readwrite");
    transaction.objectStore(SECURITY_STORE).put(record, DEVICE_UNLOCK_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("Device Unlock metadata could not be saved."));
    };
  });
}

export async function deleteDeviceUnlockRecord(): Promise<void> {
  const database = await openAppDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SECURITY_STORE, "readwrite");
    transaction.objectStore(SECURITY_STORE).delete(DEVICE_UNLOCK_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("Device Unlock could not be disabled."));
    };
  });
}
