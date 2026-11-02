export type Point2D = {
  x: number;
  y: number;
};

export type LandmarkSample = {
  letter: string;
  features: Float32Array;
};

export type LandmarkPrediction = {
  letter: string;
  nearestDistance: number;
  margin: number;
};

const featureCount = 42;
const sampleHeaderLength = 66;

export function normalizeHandLandmarks(
  landmarks: readonly Point2D[],
  handedness?: string
): Float32Array | null {
  if (landmarks.length !== 21) return null;
  const wrist = landmarks[0];
  const middleBase = landmarks[9];
  const scale = Math.hypot(middleBase.x - wrist.x, middleBase.y - wrist.y);
  if (!Number.isFinite(scale) || scale < 0.00001) return null;
  const isLeftHand = handedness?.toLowerCase() === "left";
  const features = new Float32Array(featureCount);
  for (let index = 0; index < landmarks.length; index += 1) {
    const point = landmarks[index];
    const horizontal = (point.x - wrist.x) / scale;
    const vertical = (point.y - wrist.y) / scale;
    features[index * 2] = isLeftHand ? -horizontal : horizontal;
    features[index * 2 + 1] = vertical;
  }
  return features.every(Number.isFinite) ? features : null;
}

export function parseLandmarkModel(buffer: ArrayBuffer): LandmarkSample[] {
  const view = new DataView(buffer);
  if (
    view.byteLength < sampleHeaderLength ||
    view.getUint8(0) !== 65 ||
    view.getUint8(1) !== 82 ||
    view.getUint8(2) !== 83 ||
    view.getUint8(3) !== 76
  ) {
    throw new Error("ملف نموذج الإشارات تالف أو غير مدعوم.");
  }
  const version = view.getUint8(4);
  const classes = view.getUint8(5);
  const dimensions = view.getUint8(6);
  const sampleCount = view.getUint16(8, true);
  if (version !== 1 || classes !== 28 || dimensions !== featureCount) {
    throw new Error("إصدار نموذج الإشارات غير متوافق.");
  }
  const labels: string[] = [];
  for (let index = 0; index < classes; index += 1) {
    labels.push(String.fromCharCode(view.getUint16(10 + index * 2, true)));
  }
  const bytesPerSample = 1 + featureCount * 4;
  if (view.byteLength !== sampleHeaderLength + sampleCount * bytesPerSample) {
    throw new Error("بيانات نموذج الإشارات غير مكتملة.");
  }
  const samples: LandmarkSample[] = [];
  let offset = sampleHeaderLength;
  for (let index = 0; index < sampleCount; index += 1) {
    const labelIndex = view.getUint8(offset);
    offset += 1;
    const features = new Float32Array(featureCount);
    for (let feature = 0; feature < featureCount; feature += 1) {
      features[feature] = view.getFloat32(offset, true);
      offset += 4;
    }
    if (labelIndex >= labels.length || !features.every(Number.isFinite))
      continue;
    samples.push({ letter: labels[labelIndex], features });
  }
  if (samples.length === 0)
    throw new Error("لم تُعثر على عينات صالحة في النموذج.");
  return samples;
}

export function predictLandmarkClass(
  samples: readonly LandmarkSample[],
  features: Float32Array
): LandmarkPrediction | null {
  if (features.length !== featureCount || samples.length === 0) return null;
  const nearest = new Map<string, number>();
  for (const sample of samples) {
    let squaredDistance = 0;
    for (let index = 0; index < featureCount; index += 1) {
      const difference = features[index] - sample.features[index];
      squaredDistance += difference * difference;
    }
    if (!Number.isFinite(squaredDistance)) continue;
    const current = nearest.get(sample.letter);
    if (current === undefined || squaredDistance < current) {
      nearest.set(sample.letter, squaredDistance);
    }
  }
  const ranked = Array.from(nearest.entries()).sort(
    (left, right) => left[1] - right[1]
  );
  const best = ranked[0];
  const second = ranked[1];
  if (!best || !second) return null;
  return {
    letter: best[0],
    nearestDistance: best[1],
    margin: (second[1] - best[1]) / Math.max(second[1], 0.000001),
  };
}

export const cameraModelThresholds = {
  maximumSquaredDistance: 0.18,
  minimumSeparation: 0.22,
  stablePredictions: 5,
  predictionWindow: 7,
} as const;
