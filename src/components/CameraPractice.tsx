import {
  Camera,
  CameraOff,
  Check,
  Download,
  Focus,
  Lightbulb,
  LoaderCircle,
  RotateCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { SignLetter } from "@/lib/signLetters";
import { exportCalibrationSamples } from "@/lib/cameraCalibration";
import { Button } from "@/components/ui/button";
import { useSignCamera } from "@/hooks/useSignCamera";

type CameraPracticeProps = {
  target: SignLetter;
  disabled: boolean;
  onRecognized: (letter: string) => void;
};

function saveCsvFile(csv: string) {
  const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sign-language-camera-samples.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CameraPractice({
  target,
  disabled,
  onRecognized,
}: CameraPracticeProps) {
  const camera = useSignCamera({
    targetLetter: target.letter,
    onRecognized,
    disabled,
  });
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationBusy, setCalibrationBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [expandedDetails, setExpandedDetails] = useState(false);
  const handHasStablePrediction =
    camera.prediction?.stable && camera.prediction.usable;
  const handMatchesTarget =
    camera.prediction?.letter === target.letter && handHasStablePrediction;
  const needsManualConfirmation = Boolean(
    camera.prediction &&
    handMatchesTarget &&
    (camera.prediction.nearestDistance > 0.08 || camera.prediction.margin < 0.7)
  );

  async function addCurrentSample() {
    setCalibrationBusy(true);
    setNotice("");
    try {
      const total = await camera.saveCurrentSample(target.letter);
      setNotice(`أُضيفت عينة هذا الحرف محليًا. إجمالي عيناتك: ${total}.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "تعذّرت إضافة العينة."
      );
    } finally {
      setCalibrationBusy(false);
    }
  }

  async function downloadSamples() {
    try {
      saveCsvFile(await exportCalibrationSamples());
      setNotice("نُزّل ملف النقاط محليًا؛ لم يُرسل إلى أي جهة.");
    } catch {
      setNotice("لا توجد عينات محلية قابلة للتصدير.");
    }
  }

  async function removeSamples() {
    try {
      await camera.eraseCalibration();
      setNotice("حُذفت عينات المعايرة من هذا الجهاز.");
    } catch {
      setNotice("تعذّر حذف العينات المحلية.");
    }
  }

  return (
    <section
      className="camera-practice"
      aria-labelledby="camera-practice-title"
    >
      <div className="camera-practice-header">
        <div>
          <span className="camera-kicker">
            <Focus size={15} /> تعرّف محلي على شكل اليد
          </span>
          <h2 id="camera-practice-title">خلِّ الكاميرا تقرأ إشارتك</h2>
          <p>
            ثبّت يدك كما في البطاقة. القراءة غير المؤكدة لن تُحتسب ولن تخصم من
            تقدمك.
          </p>
        </div>
        <span className="camera-privacy-pill">
          <ShieldCheck size={15} /> المعالجة على جهازك
        </span>
      </div>

      <div className="camera-practice-grid">
        <div className="camera-preview-wrap">
          <div
            className={`camera-preview ${camera.isRunning ? "camera-preview-on" : ""}`}
          >
            <video
              ref={camera.videoRef}
              className="camera-video"
              autoPlay
              playsInline
              muted
              aria-label="معاينة الكاميرا الحية"
            />
            <canvas
              ref={camera.canvasRef}
              className="camera-landmarks"
              aria-hidden="true"
            />
            {camera.state === "idle" && (
              <div className="camera-idle-overlay">
                <span className="camera-idle-icon">
                  <Camera size={30} />
                </span>
                <strong>كاميرتك جاهزة عندما تكون أنت</strong>
                <span>لن نطلب الإذن حتى تضغط بدء الكاميرا.</span>
              </div>
            )}
            {camera.state === "requesting" && (
              <div className="camera-idle-overlay">
                <LoaderCircle className="camera-loader" size={29} />
                <strong>بانتظار إذن الكاميرا</strong>
                <span>اختر «سماح» في رسالة المتصفح.</span>
              </div>
            )}
            {camera.state === "loading" && (
              <div className="camera-idle-overlay">
                <LoaderCircle className="camera-loader" size={29} />
                <strong>نجهّز نموذج اليد</strong>
                <span>تُحمّل النماذج محليًا في هذه الصفحة.</span>
              </div>
            )}
            <div className="camera-live-pill">
              <span
                className={camera.state === "ready" ? "camera-live-dot" : ""}
              />
              {camera.state === "ready" ? "تحليل مباشر" : "الكاميرا متوقفة"}
            </div>
            {camera.state === "ready" && (
              <div className="camera-target-chip">
                الحرف المطلوب <strong>{target.letter}</strong>
              </div>
            )}
          </div>
          <div className="camera-controls">
            {camera.isRunning ? (
              <>
                <Button
                  type="button"
                  className="camera-main-button camera-stop-button"
                  onClick={camera.stop}
                >
                  <CameraOff size={17} /> أوقف الكاميرا
                </Button>
                {camera.cameraCount > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="camera-icon-button"
                    onClick={camera.switchCamera}
                    aria-label="تبديل الكاميرا الأمامية والخلفية"
                    title="تبديل الكاميرا"
                  >
                    <RotateCw size={17} />
                  </Button>
                )}
              </>
            ) : (
              <Button
                type="button"
                className="camera-main-button"
                onClick={() => void camera.start()}
                disabled={
                  camera.state === "requesting" || camera.state === "loading"
                }
              >
                {camera.state === "requesting" || camera.state === "loading" ? (
                  <LoaderCircle className="camera-loader" size={17} />
                ) : (
                  <Camera size={17} />
                )}
                {camera.state === "error"
                  ? "حاول تشغيل الكاميرا"
                  : "ابدأ الكاميرا"}
              </Button>
            )}
            <span className="camera-control-hint">لا تسجيل ولا ميكروفون</span>
          </div>
          {camera.error && (
            <div className="camera-error" role="alert">
              <CameraOff size={16} />
              <span>{camera.error}</span>
            </div>
          )}
        </div>

        <div className="camera-results">
          <div className="camera-result-heading">
            <span className="camera-result-icon">
              {camera.prediction?.stable ? (
                <Check size={17} />
              ) : (
                <Focus size={17} />
              )}
            </span>
            <div>
              <span>قراءة الإشارة</span>
              <strong>
                {camera.state === "ready"
                  ? camera.prediction?.stable
                    ? camera.prediction.usable
                      ? camera.prediction.letter
                      : "الإشارة غير واضحة"
                    : (camera.prediction?.letter ?? "ضع يدك داخل الإطار")
                  : "بانتظار بدء الكاميرا"}
              </strong>
            </div>
          </div>

          <div className="camera-stability" aria-live="off">
            <div className="camera-stability-label">
              <span>
                {camera.prediction?.stable
                  ? camera.prediction.usable
                    ? "قراءة ثابتة"
                    : "حرّك يدك قليلًا لتحسين الوضوح"
                  : "ثبّت الإشارة للحظة"}
              </span>
              <strong>
                {camera.prediction?.stableCount ?? 0}/{7}
              </strong>
            </div>
            <div
              className="camera-stability-track"
              role="progressbar"
              aria-label="ثبات القراءة عبر الإطارات"
              aria-valuemin={0}
              aria-valuemax={7}
              aria-valuenow={camera.prediction?.stableCount ?? 0}
            >
              <span
                style={{
                  width: `${((camera.prediction?.stableCount ?? 0) / 7) * 100}%`,
                }}
              />
            </div>
          </div>

          <div
            className={`camera-feedback ${handMatchesTarget ? "camera-feedback-match" : ""}`}
            aria-live="polite"
          >
            {camera.state !== "ready" ? (
              <>
                <Lightbulb size={16} />
                ابدأ الكاميرا لتظهر قراءة الإشارة هنا.
              </>
            ) : handMatchesTarget && needsManualConfirmation ? (
              <>
                <Check size={16} /> ظهرت الإشارة المطلوبة بثبات. تأكيدك ضروري
                لهذه القراءة التجريبية.
              </>
            ) : handMatchesTarget ? (
              <>
                <Check size={16} /> الإشارة تطابق المطلوب بوضوح. ستُحتسب
                تلقائيًا.
              </>
            ) : camera.prediction?.stable && camera.prediction.usable ? (
              <>
                <Focus size={16} />
                ظهرت إشارة «{camera.prediction.letter}». راجع شكل اليد وأعد
                المحاولة؛ المحاولات لا تخصم تقدمك.
              </>
            ) : (
              <>
                <Lightbulb size={16} /> اجعل اليد كاملة داخل الإطار وبعيدة
                قليلًا عن الكاميرا.
              </>
            )}
          </div>

          {needsManualConfirmation && !disabled && (
            <Button
              type="button"
              className="camera-confirm-button"
              onClick={() => onRecognized(target.letter)}
            >
              <Check size={17} /> نعم، هذه إشارتي — تابع تلقائيًا
            </Button>
          )}

          <div className="camera-calibration">
            <button
              type="button"
              className={`camera-calibration-toggle ${calibrationMode ? "camera-calibration-active" : ""}`}
              onClick={() => setCalibrationMode(enabled => !enabled)}
              aria-pressed={calibrationMode}
              disabled={camera.state !== "ready"}
            >
              <Focus size={16} />
              {calibrationMode
                ? "إيقاف معايرة هذا الجهاز"
                : "حسّن التعرّف على هذا الجهاز"}
            </button>
            {calibrationMode && (
              <div className="camera-calibration-details">
                <p>
                  لا تضغط الحفظ إلا إذا كانت يدك تطابق بطاقة «{target.letter}»
                  فعلًا؛ سنحفظ نقاط اليد فقط على هذا الجهاز، لا صورة أو فيديو.
                </p>
                {handHasStablePrediction &&
                  camera.targetCalibrationCount < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="camera-sample-button"
                      onClick={() => void addCurrentSample()}
                      disabled={calibrationBusy}
                    >
                      {calibrationBusy ? (
                        <LoaderCircle className="camera-loader" size={16} />
                      ) : (
                        <Check size={16} />
                      )}
                      احفظ عينة الحرف «{target.letter}»
                    </Button>
                  )}
                {camera.calibrationCount > 0 && (
                  <div className="camera-data-actions">
                    <span>
                      {camera.calibrationCount} عينة شخصية على هذا الجهاز
                    </span>
                    <button
                      type="button"
                      onClick={() => void downloadSamples()}
                    >
                      <Download size={14} /> تنزيل
                    </button>
                    <button type="button" onClick={() => void removeSamples()}>
                      <Trash2 size={14} /> مسح
                    </button>
                  </div>
                )}
                {notice && (
                  <span className="camera-notice" role="status">
                    {notice}
                  </span>
                )}
              </div>
            )}
          </div>

          <ul className="camera-tips">
            <li>إضاءة أمامية واضحة، وخلفية هادئة.</li>
            <li>أظهر اليد كاملة، واترك مساحة حول الأصابع.</li>
            <li>
              تُحتسب القراءة المستقرة فقط؛ ويمكنك دائمًا استخدام البطاقات.
            </li>
          </ul>

          <details
            className="camera-model-details"
            open={expandedDetails}
            onToggle={event => setExpandedDetails(event.currentTarget.open)}
          >
            <summary>عن النموذج والخصوصية</summary>
            <p>
              يحدد MediaPipe نقاط اليد، ثم يقارنها بخط أساس من مجموعة
              <a
                href="https://zenodo.org/records/18363162"
                target="_blank"
                rel="noreferrer"
              >
                {" "}
                ArSL-31-Pilot
              </a>
              . تختلف بيانات التدريب عن رسومات اللعبة؛ لذلك قد يقترح حرفًا يحتاج
              مراجعتك. لا يُرسل الفيديو أو الصوت. المعايرة اختيارية، ونقاطها
              تحفظ في هذا المتصفح فقط.
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
