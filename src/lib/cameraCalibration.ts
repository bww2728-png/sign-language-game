import { signLetters } from "@/lib/signLetters";
import type { LandmarkSample } from "@/lib/handRecognition";

const databaseName = "sign-speaks-camera-calibration";
const storeName = "samples";
const maximumSamplesPerLetter = 16;

type StoredSample = {
  id?: number;
  letter: string;
  features: number[];
  createdAt: number;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("التخزين المحلي غير متاح في هذا المتصفح."));
      return;
    }
    const request = window.indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCalibrationSamples(): Promise<LandmarkSample[]> {
  const database = await openDatabase();
  try {
    const samples = await new Promise<StoredSample[]>((resolve, reject) => {
      const request = database
        .transaction(storeName, "readonly")
        .objectStore(storeName)
        .getAll();
      request.onsuccess = () => resolve(request.result as StoredSample[]);
      request.onerror = () => reject(request.error);
    });
    return samples.map(sample => ({
      letter: sample.letter,
      features: new Float32Array(sample.features),
    }));
  } finally {
    database.close();
  }
}

export async function saveCalibrationSample(
  letter: string,
  features: Float32Array
) {
  if (!signLetters.some(candidate => candidate.letter === letter)) {
    throw new Error("الحرف غير معروف ولا يمكن معايرته.");
  }
  if (features.length !== 42 || !features.every(Number.isFinite)) {
    throw new Error("تعذّر حفظ عينة يد صالحة.");
  }
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const existing = await new Promise<StoredSample[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as StoredSample[]);
      request.onerror = () => reject(request.error);
    });
    const currentLetterSamples = existing
      .filter(sample => sample.letter === letter)
      .sort((left, right) => left.createdAt - right.createdAt);
    if (currentLetterSamples.length >= maximumSamplesPerLetter) {
      store.delete(currentLetterSamples[0].id as number);
    }
    store.add({
      letter,
      features: Array.from(features),
      createdAt: Date.now(),
    } satisfies StoredSample);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function countCalibrationSamples() {
  const database = await openDatabase();
  try {
    return await new Promise<number>((resolve, reject) => {
      const request = database
        .transaction(storeName, "readonly")
        .objectStore(storeName)
        .count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function exportCalibrationSamples() {
  const database = await openDatabase();
  try {
    const samples = await new Promise<StoredSample[]>((resolve, reject) => {
      const request = database
        .transaction(storeName, "readonly")
        .objectStore(storeName)
        .getAll();
      request.onsuccess = () => resolve(request.result as StoredSample[]);
      request.onerror = () => reject(request.error);
    });
    const header = [
      "letter",
      ...Array.from({ length: 42 }, (_, index) => `f${index}`),
    ];
    const rows = samples.map(sample => [
      sample.letter,
      ...sample.features.map(value => value.toString()),
    ]);
    return [header, ...rows]
      .map(row =>
        row.map(value => `"${value.replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
  } finally {
    database.close();
  }
}

export async function clearCalibrationSamples() {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
