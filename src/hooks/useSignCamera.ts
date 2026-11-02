import { useCallback, useEffect, useRef, useState } from "react";
import {
  cameraModelThresholds,
  type LandmarkPrediction,
  type Point2D,
} from "@/lib/handRecognition";
import {
  clearCalibrationSamples,
  countCalibrationSamples,
  loadCalibrationSamples,
  saveCalibrationSample,
} from "@/lib/cameraCalibration";

export type CameraPrediction = LandmarkPrediction & {
  stable: boolean;
  stableCount: number;
  usable: boolean;
  calibratedSamples: number;
};

export type CameraSessionState =
  "idle" | "requesting" | "loading" | "ready" | "error";

type WorkerPrediction = LandmarkPrediction & { letterSampleCount: number };

type WorkerResponse =
  | { type: "ready"; calibrationCounts: Record<string, number> }
  | { type: "loading"; progress: number | null }
  | {
      type: "result";
      landmarks: Point2D[];
      prediction: WorkerPrediction | null;
      features: Float32Array | null;
    }
  | { type: "no-hand" }
  | { type: "error"; message: string };

type WorkerInstance = Worker & {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
};

type UseSignCameraOptions = {
  targetLetter: string;
  onRecognized: (letter: string) => void;
  disabled: boolean;
};

const connectionPairs = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const;

function cameraErrorMessage(error: unknown) {
  if (!(error instanceof DOMException))
    return "تعذّر تشغيل الكاميرا. تحقّق من اتصال الجهاز ثم أعد المحاولة.";
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "لم يُسمح للمتصفح بالكاميرا. امنح الإذن من إعدادات الموقع ثم حاول مجددًا.";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "لم نعثر على كاميرا متصلة بهذا الجهاز.";
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "الكاميرا مستخدمة في تطبيق آخر. أغلقه ثم حاول مجددًا.";
  }
  if (error.name === "OverconstrainedError") {
    return "الكاميرا لا تدعم الإعداد المطلوب. جرّب الكاميرا الأخرى.";
  }
  return "تعذّر تشغيل الكاميرا. تحقّق من اتصال الجهاز ثم أعد المحاولة.";
}

export function useSignCamera({
  targetLetter,
  onRecognized,
  disabled,
}: UseSignCameraOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<WorkerInstance | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const frameBusyRef = useRef(false);
  const workerReadyRef = useRef(false);
  const lastFrameAtRef = useRef(0);
  const lastFeaturesRef = useRef<Float32Array | null>(null);
  const targetRef = useRef(targetLetter);
  const callbackRef = useRef(onRecognized);
  const disabledRef = useRef(disabled);
  const predictionHistoryRef = useRef<string[]>([]);
  const autoAcceptedRef = useRef("");
  const calibrationCountsRef = useRef<Record<string, number>>({});
  const [state, setState] = useState<CameraSessionState>("idle");
  const [error, setError] = useState("");
  const [prediction, setPrediction] = useState<CameraPrediction | null>(null);
  const [cameraCount, setCameraCount] = useState(0);
  const [calibrationCount, setCalibrationCount] = useState(0);
  const [targetCalibrationCount, setTargetCalibrationCount] = useState(0);
  const facingModeRef = useRef<"user" | "environment">("user");
  const sessionIdRef = useRef(0);

  useEffect(() => {
    targetRef.current = targetLetter;
    predictionHistoryRef.current = [];
    autoAcceptedRef.current = "";
    setTargetCalibrationCount(calibrationCountsRef.current[targetLetter] ?? 0);
  }, [targetLetter]);

  useEffect(() => {
    callbackRef.current = onRecognized;
    disabledRef.current = disabled;
  }, [disabled, onRecognized]);

  const drawLandmarks = useCallback((landmarks: Point2D[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !video) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.clearRect(0, 0, width, height);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(107, 238, 197, .88)";
    context.lineWidth = Math.max(3, width / 180);
    for (const [start, end] of connectionPairs) {
      context.beginPath();
      context.moveTo(landmarks[start].x * width, landmarks[start].y * height);
      context.lineTo(landmarks[end].x * width, landmarks[end].y * height);
      context.stroke();
    }
    context.fillStyle = "#e7fff5";
    for (const point of landmarks) {
      context.beginPath();
      context.arc(
        point.x * width,
        point.y * height,
        Math.max(2.6, width / 230),
        0,
        Math.PI * 2
      );
      context.fill();
    }
  }, []);

  const clearLandmarks = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    lastFeaturesRef.current = null;
    predictionHistoryRef.current = [];
    setPrediction(null);
  }, []);

  const stop = useCallback(() => {
    sessionIdRef.current += 1;
    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
    frameBusyRef.current = false;
    workerReadyRef.current = false;
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({ type: "close" });
      worker.terminate();
      workerRef.current = null;
    }
    clearLandmarks();
    setState("idle");
  }, [clearLandmarks]);

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      setError("تتطلب الكاميرا اتصالًا آمنًا HTTPS أو تشغيلًا محليًا.");
      setState("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("هذا المتصفح لا يتيح الوصول إلى الكاميرا.");
      setState("error");
      return;
    }
    stop();
    const sessionId = sessionIdRef.current;
    setError("");
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingModeRef.current },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24, max: 30 },
        },
      });
      if (sessionId !== sessionIdRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("لم تظهر معاينة الكاميرا.");
      video.srcObject = stream;
      await video.play();
      if (sessionId !== sessionIdRef.current) return;
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      if (sessionId !== sessionIdRef.current) return;
      setCameraCount(
        availableDevices.filter(device => device.kind === "videoinput").length
      );
      setState("loading");
      const worker = new Worker(
        new URL("../workers/hand-landmarker.worker.ts", import.meta.url),
        { type: "module", name: "sign-language-camera" }
      ) as WorkerInstance;
      workerRef.current = worker;
      worker.onmessage = event => {
        const message = event.data;
        if (message.type === "ready") {
          workerReadyRef.current = true;
          calibrationCountsRef.current = message.calibrationCounts;
          setCalibrationCount(
            Object.keys(message.calibrationCounts).reduce(
              (total, letter) =>
                total + (message.calibrationCounts[letter] ?? 0),
              0
            )
          );
          setTargetCalibrationCount(
            message.calibrationCounts[targetRef.current] ?? 0
          );
          setState("ready");
          return;
        }
        if (message.type === "loading") {
          setState("loading");
          return;
        }
        if (message.type === "error") {
          frameBusyRef.current = false;
          stop();
          setError(message.message);
          setState("error");
          return;
        }
        frameBusyRef.current = false;
        if (message.type === "no-hand") {
          clearLandmarks();
          return;
        }
        drawLandmarks(message.landmarks);
        lastFeaturesRef.current = message.features;
        if (!message.prediction) {
          predictionHistoryRef.current = [];
          setPrediction(null);
          return;
        }
        const history = [
          ...predictionHistoryRef.current,
          message.prediction.letter,
        ].slice(-cameraModelThresholds.predictionWindow);
        predictionHistoryRef.current = history;
        const counts = new Map<string, number>();
        for (const letter of history)
          counts.set(letter, (counts.get(letter) ?? 0) + 1);
        const ranked = Array.from(counts.entries()).sort(
          (left, right) => right[1] - left[1]
        );
        const [stableLetter, stableCount = 0] = ranked[0] ?? [];
        const stable = stableCount >= cameraModelThresholds.stablePredictions;
        const candidate = message.prediction.letter;
        const usable =
          message.prediction.nearestDistance <=
            cameraModelThresholds.maximumSquaredDistance &&
          message.prediction.margin >= cameraModelThresholds.minimumSeparation;
        const samplesForLetter = message.prediction.letterSampleCount ?? 0;
        const nextPrediction: CameraPrediction = {
          ...message.prediction,
          stable,
          stableCount,
          usable,
          calibratedSamples: samplesForLetter,
        };
        setPrediction(nextPrediction);
        const canAutoAccept =
          stable &&
          stableLetter === candidate &&
          usable &&
          candidate === targetRef.current &&
          message.prediction.nearestDistance <= 0.08 &&
          message.prediction.margin >= 0.7 &&
          !disabledRef.current &&
          autoAcceptedRef.current !== candidate;
        if (canAutoAccept) {
          autoAcceptedRef.current = candidate;
          callbackRef.current(candidate);
        }
      };
      worker.onerror = () => {
        stop();
        setError("تعذّر تحميل نموذج اليد. أعد تحميل الصفحة ثم حاول مجددًا.");
        setState("error");
      };
      const calibrationSamples = await loadCalibrationSamples().catch(() => []);
      worker.postMessage({
        type: "initialize",
        baseUrl: new URL(
          import.meta.env.BASE_URL,
          window.location.href
        ).toString(),
        targetLetter: targetRef.current,
        samples: calibrationSamples.map(sample => ({
          letter: sample.letter,
          features: Array.from(sample.features),
        })),
      });
      frameTimerRef.current = window.setInterval(() => {
        const currentVideo = videoRef.current;
        const currentWorker = workerRef.current;
        if (
          !currentVideo ||
          !currentWorker ||
          !workerReadyRef.current ||
          currentVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
          disabledRef.current
        ) {
          return;
        }
        const now = performance.now();
        if (now - lastFrameAtRef.current < 145) return;
        if (frameBusyRef.current) return;
        frameBusyRef.current = true;
        lastFrameAtRef.current = now;
        void createImageBitmap(currentVideo)
          .then(bitmap => {
            if (workerRef.current !== currentWorker) {
              bitmap.close();
              frameBusyRef.current = false;
              return;
            }
            currentWorker.postMessage(
              { type: "frame", bitmap, timestamp: now },
              [bitmap]
            );
          })
          .catch(() => {
            frameBusyRef.current = false;
          });
      }, 90);
      const totalSamples = await countCalibrationSamples().catch(() => 0);
      setCalibrationCount(totalSamples);
    } catch (caughtError) {
      if (sessionId !== sessionIdRef.current) return;
      stop();
      setError(cameraErrorMessage(caughtError));
      setState("error");
    }
  }, [clearLandmarks, drawLandmarks, stop]);

  const switchCamera = useCallback(async () => {
    if (cameraCount < 2) return;
    const nextFacing =
      facingModeRef.current === "user" ? "environment" : "user";
    facingModeRef.current = nextFacing;
    await start();
  }, [cameraCount, start]);

  const saveCurrentSample = useCallback(async (letter: string) => {
    const features = lastFeaturesRef.current;
    if (!features)
      throw new Error("ضع يدك داخل الإطار أولًا حتى نلتقط نقاطها.");
    await saveCalibrationSample(letter, features);
    const totalSamples = await countCalibrationSamples();
    const letterSamples = Math.min(
      16,
      (calibrationCountsRef.current[letter] ?? 0) + 1
    );
    calibrationCountsRef.current[letter] = letterSamples;
    setCalibrationCount(totalSamples);
    if (letter === targetRef.current) setTargetCalibrationCount(letterSamples);
    workerRef.current?.postMessage({
      type: "calibrate",
      letter,
      features: Array.from(features),
    });
    return totalSamples;
  }, []);

  const eraseCalibration = useCallback(async () => {
    await clearCalibrationSamples();
    workerRef.current?.postMessage({ type: "clear-calibration" });
    calibrationCountsRef.current = {};
    setCalibrationCount(0);
    setTargetCalibrationCount(0);
  }, []);

  useEffect(() => {
    return () => {
      sessionIdRef.current += 1;
      if (frameTimerRef.current !== null) {
        window.clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      frameBusyRef.current = false;
      workerReadyRef.current = false;
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      streamRef.current = null;
      workerRef.current?.terminate();
      workerRef.current = null;
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!disabled) return;
    frameBusyRef.current = false;
  }, [disabled]);

  return {
    videoRef,
    canvasRef,
    state,
    error,
    prediction,
    calibrationCount,
    targetCalibrationCount,
    cameraCount,
    isRunning:
      state === "requesting" || state === "loading" || state === "ready",
    start,
    stop,
    switchCamera,
    saveCurrentSample,
    eraseCalibration,
  };
}
