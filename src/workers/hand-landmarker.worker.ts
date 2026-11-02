import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import {
  normalizeHandLandmarks,
  parseLandmarkModel,
  predictLandmarkClass,
  type LandmarkSample,
  type Point2D,
} from "@/lib/handRecognition";

let landmarker: HandLandmarker | null = null;
let baseTrainingSamples: LandmarkSample[] = [];
let trainingSamples: LandmarkSample[] = [];
let calibrationCounts = new Map<string, number>();
let lastTimestamp = 0;

type WorkerScope = {
  location: Location;
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
  close: () => void;
};

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = async (event: MessageEvent) => {
  const message = event.data as {
    type: string;
    baseUrl?: string;
    targetLetter?: string;
    bitmap?: ImageBitmap;
    timestamp?: number;
    letter?: string;
    features?: number[];
    samples?: { letter: string; features: number[] }[];
  };

  if (message.type === "initialize") {
    try {
      trainingSamples = [];
      calibrationCounts = new Map();
      workerScope.postMessage({ type: "loading", progress: 0 });
      const baseUrl = new URL(
        message.baseUrl ?? "/",
        workerScope.location.origin
      );
      const wasmUrl = new URL("mediapipe/wasm/", baseUrl).toString();
      const modelUrl = new URL(
        "models/hand_landmarker.task",
        baseUrl
      ).toString();
      const classifierUrl = new URL(
        "models/arsl_landmarks.bin",
        baseUrl
      ).toString();
      const vision = await FilesetResolver.forVisionTasks(wasmUrl, true);
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelUrl, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.65,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.55,
      });
      workerScope.postMessage({ type: "loading", progress: 0.45 });
      const modelResponse = await fetch(classifierUrl, {
        cache: "force-cache",
      });
      if (!modelResponse.ok) throw new Error("تعذّر تحميل نموذج تعرّف الحروف.");
      baseTrainingSamples = parseLandmarkModel(
        await modelResponse.arrayBuffer()
      );
      trainingSamples = [...baseTrainingSamples];
      for (const sample of message.samples ?? []) {
        if (
          sample.features.length === 42 &&
          sample.features.every(Number.isFinite)
        ) {
          trainingSamples.push({
            letter: sample.letter,
            features: new Float32Array(sample.features),
          });
          calibrationCounts.set(
            sample.letter,
            (calibrationCounts.get(sample.letter) ?? 0) + 1
          );
        }
      }
      const sampleCounts: Record<string, number> = {};
      calibrationCounts.forEach((count, letter) => {
        sampleCounts[letter] = count;
      });
      workerScope.postMessage({
        type: "ready",
        calibrationCounts: sampleCounts,
      });
    } catch (error) {
      landmarker?.close();
      landmarker = null;
      const messageText =
        error instanceof Error ? error.message : "تعذّر تحميل نموذج التعرّف.";
      workerScope.postMessage({ type: "error", message: messageText });
    }
    return;
  }

  if (message.type === "calibrate" && message.letter && message.features) {
    if (
      message.features.length === 42 &&
      message.features.every(Number.isFinite)
    ) {
      trainingSamples.push({
        letter: message.letter,
        features: new Float32Array(message.features),
      });
      calibrationCounts.set(
        message.letter,
        (calibrationCounts.get(message.letter) ?? 0) + 1
      );
    }
    return;
  }

  if (message.type === "clear-calibration") {
    trainingSamples = [...baseTrainingSamples];
    calibrationCounts.clear();
    return;
  }

  if (message.type === "close") {
    landmarker?.close();
    landmarker = null;
    baseTrainingSamples = [];
    trainingSamples = [];
    workerScope.close();
    return;
  }

  if (message.type !== "frame" || !message.bitmap) return;
  const bitmap = message.bitmap;
  try {
    if (!landmarker) throw new Error("نموذج اليد غير جاهز بعد.");
    const timestamp = Math.max(
      message.timestamp ?? performance.now(),
      lastTimestamp + 1
    );
    lastTimestamp = timestamp;
    const result = landmarker.detectForVideo(bitmap, timestamp);
    if (result.landmarks.length === 0) {
      workerScope.postMessage({ type: "no-hand" });
      return;
    }
    const landmarks: Point2D[] = result.landmarks[0].map(point => ({
      x: point.x,
      y: point.y,
    }));
    const handedness = result.handedness[0]?.[0]?.categoryName;
    const features = normalizeHandLandmarks(landmarks, handedness);
    if (!features) {
      workerScope.postMessage({ type: "no-hand" });
      return;
    }
    const prediction = predictLandmarkClass(trainingSamples, features);
    const letterSampleCount = prediction
      ? (calibrationCounts.get(prediction.letter) ?? 0)
      : 0;
    workerScope.postMessage(
      {
        type: "result",
        landmarks,
        prediction: prediction ? { ...prediction, letterSampleCount } : null,
        features,
      },
      [features.buffer]
    );
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : "تعذّر تحليل صورة اليد.";
    workerScope.postMessage({ type: "error", message: messageText });
  } finally {
    bitmap.close();
  }
};
