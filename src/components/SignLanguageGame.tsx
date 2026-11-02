import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  ChevronLeft,
  Crown,
  Flame,
  Gamepad2,
  Heart,
  Lightbulb,
  LockKeyhole,
  Medal,
  RotateCcw,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { signLetters, type SignLetter } from "@/lib/signLetters";
import { CameraPractice } from "@/components/CameraPractice";

type View = "home" | "play" | "levels" | "learn" | "achievements";
type Difficulty = "easy" | "medium" | "advanced" | "all";
type Progress = {
  completedLetters: number;
  totalStars: number;
  correctAnswers: number;
  mistakes: number;
  currentStreak: number;
  bestStreak: number;
  unlockedBadges: string[];
};
type Feedback = "correct" | "wrong" | null;

const progressKey = "sign-speaks-progress-v2";
const legacyProgressKey = "sign-speaks-progress-v1";
const settingsKey = "sign-speaks-sound-v1";
const initialProgress: Progress = {
  completedLetters: 0,
  totalStars: 0,
  correctAnswers: 0,
  mistakes: 0,
  currentStreak: 0,
  bestStreak: 0,
  unlockedBadges: [],
};

const levels = [
  {
    title: "البداية الجميلة",
    subtitle: "الحروف الأساسية",
    start: 0,
    end: 5,
    starsRequired: 0,
    color: "mint",
  },
  {
    title: "نخطو بثقة",
    subtitle: "الحروف التالية",
    start: 5,
    end: 10,
    starsRequired: 8,
    color: "blue",
  },
  {
    title: "نقرأ باليد",
    subtitle: "حروف متوسطة",
    start: 10,
    end: 15,
    starsRequired: 16,
    color: "purple",
  },
  {
    title: "أبطال الإشارة",
    subtitle: "حروف متقدمة",
    start: 15,
    end: 20,
    starsRequired: 24,
    color: "orange",
  },
  {
    title: "قربنا نوصل",
    subtitle: "أربع إشارات جديدة",
    start: 20,
    end: 24,
    starsRequired: 32,
    color: "pink",
  },
  {
    title: "أبجدية بطولية",
    subtitle: "الأربع إشارات الأخيرة",
    start: 24,
    end: 28,
    starsRequired: 40,
    color: "teal",
  },
];

const encouragements = [
  "رائع! كل إشارة جديدة تقرّبك من الطلاقة.",
  "أحسنت! يدك تتحدث بثقة أكبر.",
  "يا سلام! أنت تصنع فرقًا بإشاراتك.",
  "مذهل! واصل، أنت تتقدم حرفًا بعد حرف.",
  "برافو! هذه الإشارة أصبحت لك.",
];

const badgeRewards: Record<string, number> = {
  "first-letter": 10,
  "ten-letters": 30,
  "first-level": 25,
  "five-streak": 15,
  "star-collector": 35,
};

function nonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function readProgress(): Progress {
  try {
    const saved =
      window.localStorage.getItem(progressKey) ??
      window.localStorage.getItem(legacyProgressKey);
    if (!saved) return initialProgress;
    const parsed = JSON.parse(saved) as Partial<Progress>;
    const previousCompleted = nonNegativeInteger(parsed.completedLetters);
    return {
      completedLetters: Math.min(
        signLetters.length,
        Math.max(0, previousCompleted)
      ),
      totalStars: nonNegativeInteger(parsed.totalStars),
      correctAnswers: nonNegativeInteger(parsed.correctAnswers),
      mistakes: nonNegativeInteger(parsed.mistakes),
      currentStreak: nonNegativeInteger(parsed.currentStreak),
      bestStreak: nonNegativeInteger(parsed.bestStreak),
      unlockedBadges: Array.isArray(parsed.unlockedBadges)
        ? parsed.unlockedBadges.filter(
            (badge): badge is string => typeof badge === "string"
          )
        : [],
    };
  } catch {
    return initialProgress;
  }
}

function getLevelIndex(letterIndex: number) {
  return levels.findIndex(
    level => letterIndex >= level.start && letterIndex < level.end
  );
}

function LetterImage({
  letter,
  size = "large",
}: {
  letter: SignLetter;
  size?: "large" | "small";
}) {
  return (
    <img
      className={`sign-image sign-image-${size}`}
      src={`${import.meta.env.BASE_URL}${letter.asset.replace(/^\//, "")}`}
      alt={`إشارة حرف ${letter.letter}، ${letter.nameAr}`}
      draggable={false}
    />
  );
}

export default function SignLanguageGame() {
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [view, setView] = useState<View>(() =>
    progress.completedLetters >= signLetters.length ? "achievements" : "play"
  );
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(settingsKey) !== "false";
    } catch {
      return true;
    }
  });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [wrongLetter, setWrongLetter] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("all");
  const [showHint, setShowHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [milestone, setMilestone] = useState("");
  const feedbackTimeoutRef = useRef<number | null>(null);

  const roundIndex = progress.completedLetters;
  const target = signLetters[Math.min(roundIndex, signLetters.length - 1)];
  const levelIndex =
    progress.completedLetters >= signLetters.length
      ? levels.length - 1
      : Math.max(
          getLevelIndex(Math.min(roundIndex, signLetters.length - 1)),
          0
        );
  const activeLevel = levels[levelIndex];
  const choices = useMemo(() => {
    if (!target) return [];
    const indices = [
      roundIndex,
      (roundIndex + 4) % signLetters.length,
      (roundIndex + 9) % signLetters.length,
    ];
    const candidates = indices.map(index => signLetters[index]);
    const correctPosition = roundIndex % candidates.length;
    return candidates.map(
      (_, index) =>
        candidates[
          (index - correctPosition + candidates.length) % candidates.length
        ]
    );
  }, [roundIndex, target]);

  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, []);

  useEffect(() => {
    const syncFullscreenState = () =>
      setIsFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== null) {
        window.clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    };
  }, [view]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!milestone) return;
    const timeout = window.setTimeout(() => setMilestone(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [milestone]);

  function saveProgress(nextProgress: Progress) {
    try {
      window.localStorage.setItem(progressKey, JSON.stringify(nextProgress));
    } catch {
      setMessage("تعذّر حفظ التقدم على هذا الجهاز.");
    }
    setProgress(nextProgress);
  }

  function playChime(success: boolean) {
    if (!soundEnabled) return;
    try {
      const audioContext = new window.AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = success ? 720 : 250;
      gain.gain.setValueAtTime(0.12, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.28
      );
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.28);
      oscillator.onended = () => void audioContext.close();
    } catch {
      return;
    }
  }

  function handleAnswer(letter: SignLetter) {
    if (feedback || !target) return;
    setShowHint(false);

    if (letter.letter !== target.letter) {
      playChime(false);
      saveProgress({
        ...progress,
        mistakes: progress.mistakes + 1,
        currentStreak: 0,
      });
      setFeedback("wrong");
      setWrongLetter(letter.letter);
      setMessage("قريب جدًا! جرّب مرة ثانية، أنت قادر.");
      feedbackTimeoutRef.current = window.setTimeout(() => {
        setFeedback(null);
        setWrongLetter(null);
        feedbackTimeoutRef.current = null;
      }, 1050);
      return;
    }

    const completed = roundIndex + 1;
    const nextStreak = progress.currentStreak + 1;
    const badgeCriteria: [string, boolean][] = [
      ["first-letter", completed >= 1],
      ["ten-letters", completed >= 10],
      ["first-level", completed >= 5],
      ["five-streak", nextStreak >= 5],
      ["star-collector", progress.totalStars + 1 >= 15],
    ];
    const newlyUnlocked = badgeCriteria
      .filter(
        ([badge, achieved]) =>
          achieved && !progress.unlockedBadges.includes(badge)
      )
      .map(([badge]) => badge);
    const bonusStars = newlyUnlocked.reduce(
      (total, badge) => total + badgeRewards[badge],
      0
    );
    const unlockedBadges = [...progress.unlockedBadges, ...newlyUnlocked];
    saveProgress({
      completedLetters: completed,
      totalStars: progress.totalStars + 1 + bonusStars,
      correctAnswers: progress.correctAnswers + 1,
      mistakes: progress.mistakes,
      currentStreak: nextStreak,
      bestStreak: Math.max(progress.bestStreak, nextStreak),
      unlockedBadges,
    });
    playChime(true);
    setFeedback("correct");
    setMessage(encouragements[progress.correctAnswers % encouragements.length]);

    if (completed === 1) setMilestone("أول إشارة لك! بداية جميلة.");
    else if (completed === 10) setMilestone("عشر إشارات! إنجاز رائع.");
    else if (completed === 27) setMilestone("بقي حرف واحد وتكمل الأبجدية!");
    else if (nextStreak === 5) setMilestone("سلسلة خماسية! أنت نجم الإشارات.");

    if (newlyUnlocked.length > 0) {
      setMilestone(
        `مبروك! فتحت شارة جديدة وربحت ${bonusStars.toLocaleString("ar")} نجمة إضافية.`
      );
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      if (completed >= signLetters.length) {
        setView("achievements");
      } else {
        setView("play");
      }
      feedbackTimeoutRef.current = null;
    }, 1050);
  }

  function beginJourney() {
    if (progress.completedLetters >= signLetters.length) {
      setView("achievements");
      return;
    }
    setView("play");
    setFeedback(null);
    setShowHint(false);
  }

  function restartJourney() {
    const freshProgress = { ...initialProgress };
    saveProgress(freshProgress);
    setFeedback(null);
    setMessage("");
    setView("play");
  }

  function toggleSound() {
    const nextSound = !soundEnabled;
    setSoundEnabled(nextSound);
    try {
      window.localStorage.setItem(settingsKey, String(nextSound));
    } catch {
      setMessage("تعذّر حفظ إعداد الصوت.");
    }
  }

  function speakLetter(letter: SignLetter) {
    if (!("speechSynthesis" in window)) {
      setMessage("القراءة الصوتية غير متاحة في هذا المتصفح.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${letter.letter}، ${letter.nameAr}`
    );
    utterance.lang = "ar-SA";
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (!document.documentElement.requestFullscreen) {
          setMessage("ملء الشاشة غير مدعوم في هذا المتصفح.");
          return;
        }
        await document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      setMessage("تعذّر تفعيل ملء الشاشة. تحقّق من إعدادات المتصفح.");
    }
  }

  function enterDropZone(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const draggedLetter = event.dataTransfer.getData("text/plain");
    const selected = choices.find(choice => choice.letter === draggedLetter);
    if (selected) handleAnswer(selected);
  }

  const progressPercent = Math.round(
    (progress.completedLetters / signLetters.length) * 100
  );
  const unlockedAchievements = Object.keys(badgeRewards).filter(badge =>
    progress.unlockedBadges.includes(badge)
  ).length;
  const shownLetters = signLetters.filter(
    letter => difficulty === "all" || letter.difficulty === difficulty
  );

  return (
    <main className={`sign-game ${isFullScreen ? "sign-game-fullscreen" : ""}`}>
      <div className="game-glow game-glow-one" />
      <div className="game-glow game-glow-two" />

      <header className="game-topbar">
        <button
          className="brand-lockup"
          type="button"
          onClick={() => setView("home")}
          aria-label="العودة إلى البداية"
        >
          <span className="brand-mark-small">إ</span>
          <span className="brand-name">الإشارة تتحدث</span>
        </button>
        <div className="topbar-actions">
          <button
            className="icon-button sound-button"
            type="button"
            onClick={toggleSound}
            aria-label={
              soundEnabled ? "إيقاف المؤثرات الصوتية" : "تشغيل المؤثرات الصوتية"
            }
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="icon-button fullscreen-button"
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullScreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
          >
            {isFullScreen ? (
              <X size={18} />
            ) : (
              <span className="fullscreen-mark">⛶</span>
            )}
          </button>
          {view !== "home" && (
            <button
              className="back-button"
              type="button"
              onClick={() => setView("home")}
            >
              <ArrowLeft size={17} /> العودة
            </button>
          )}
        </div>
      </header>

      <section className="game-shell">
        {view === "home" && (
          <div className="home-view">
            <div className="home-intro">
              <div className="home-copy">
                <span className="eyebrow">
                  <Sparkles size={15} /> تعلّم، العب، وتواصل
                </span>
                <h1>
                  الإشارة <span>تتحدث</span>
                </h1>
                <p>
                  كل حرف تتعلّمه يفتح نافذة جديدة للتواصل. مستعد تبدأ رحلتك؟
                </p>
                <div className="home-buttons">
                  <button
                    className="primary-cta"
                    type="button"
                    onClick={beginJourney}
                  >
                    <Gamepad2 size={20} />{" "}
                    {progress.completedLetters >= signLetters.length
                      ? "اعرض إنجازك"
                      : progress.completedLetters
                        ? "تابع رحلتك"
                        : "ابدأ اللعب"}{" "}
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    className="secondary-cta"
                    type="button"
                    onClick={() => setView("learn")}
                  >
                    <BookOpen size={18} /> تعلّم الإشارات
                  </button>
                </div>
                <div className="home-trust">
                  <span className="trust-dot" /> ٢٨ حرفًا — رحلة واحدة ممتعة
                </div>
              </div>
              <div className="hero-art" aria-label="إشارة حرف الألف">
                <div className="hero-orbit orbit-one" />
                <div className="hero-orbit orbit-two" />
                <div className="hero-star star-one">
                  <Star size={17} fill="currentColor" />
                </div>
                <div className="hero-star star-two">
                  <Sparkles size={19} />
                </div>
                <div className="hero-letter-card">
                  <LetterImage
                    letter={
                      signLetters[Math.min(roundIndex, signLetters.length - 1)]
                    }
                  />
                  <div className="hero-letter-label">
                    <span>
                      {
                        signLetters[
                          Math.min(roundIndex, signLetters.length - 1)
                        ].letter
                      }
                    </span>
                    <span>إشارتك التالية</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="home-stats">
              <div className="stat-card">
                <span className="stat-icon mint-icon">
                  <Check size={17} />
                </span>
                <div>
                  <strong>
                    {progress.completedLetters}
                    <small> / ٢٨</small>
                  </strong>
                  <span>حرف تعلّمته</span>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon yellow-icon">
                  <Star size={17} fill="currentColor" />
                </span>
                <div>
                  <strong>{progress.totalStars}</strong>
                  <span>نجمة جمعتها</span>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon pink-icon">
                  <Flame size={17} />
                </span>
                <div>
                  <strong>{progress.currentStreak}</strong>
                  <span>إجابات متتالية</span>
                </div>
              </div>
              <button
                className="stat-card stat-link"
                type="button"
                onClick={() => setView("levels")}
              >
                <span className="stat-icon purple-icon">
                  <Medal size={17} />
                </span>
                <div>
                  <strong>
                    {progress.completedLetters
                      ? `المستوى ${levelIndex + 1}`
                      : "٦ مستويات"}
                  </strong>
                  <span>اكتشف رحلتك</span>
                </div>
                <ChevronLeft size={17} />
              </button>
            </div>
            <div className="home-panels">
              <button
                className="feature-tile"
                type="button"
                onClick={() => setView("levels")}
              >
                <span className="feature-icon purple-feature">
                  <Medal size={20} />
                </span>
                <span>
                  <strong>المستويات</strong>
                  <small>خطوة صغيرة، إنجاز كبير</small>
                </span>
                <ChevronLeft size={18} />
              </button>
              <button
                className="feature-tile"
                type="button"
                onClick={() => setView("learn")}
              >
                <span className="feature-icon blue-feature">
                  <BookOpen size={20} />
                </span>
                <span>
                  <strong>تعلّم الحروف</strong>
                  <small>اكتشف الإشارات وتدرّب</small>
                </span>
                <ChevronLeft size={18} />
              </button>
              <button
                className="feature-tile"
                type="button"
                onClick={() => setView("achievements")}
              >
                <span className="feature-icon orange-feature">
                  <Award size={20} />
                </span>
                <span>
                  <strong>إنجازاتي</strong>
                  <small>{unlockedAchievements} من ٥ شارات</small>
                </span>
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        )}

        {view === "play" && target && (
          <div className="play-view">
            <div className="play-heading">
              <div>
                <div className="round-overline">
                  <span className="level-pill">المستوى {levelIndex + 1}</span>
                  <span className="overline-divider" />
                  <span>{activeLevel.subtitle}</span>
                </div>
                <h1>
                  خلّنا <span>نطابق الإشارة!</span>
                </h1>
                <p>
                  اسحب البطاقة التي تحمل الحرف الصحيح إلى منطقة الإشارة، أو اضغط
                  عليها.
                </p>
              </div>
              <div className="round-count">
                <span>التقدم</span>
                <strong>
                  {roundIndex + 1}
                  <small> / ٢٨</small>
                </strong>
              </div>
            </div>

            <div
              className="progress-track"
              aria-label={`أكملت ${progress.completedLetters} من ٢٨ حرفًا`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={signLetters.length}
              aria-valuenow={progress.completedLetters}
            >
              <div
                className="progress-fill"
                style={{ width: `${Math.max(progressPercent, 4)}%` }}
              />
              <span className="progress-star">
                <Star size={13} fill="currentColor" />
              </span>
            </div>

            <div className="play-columns">
              <section
                className={`target-zone ${isDragging ? "target-zone-active" : ""} ${feedback === "correct" ? "target-correct" : ""} ${feedback === "wrong" ? "target-wrong" : ""}`}
                onDragOver={event => event.preventDefault()}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDrop={enterDropZone}
                aria-label="منطقة هدف الإشارة"
              >
                <div className="target-topline">
                  <span className="target-label">
                    <span className="pulse-dot" /> الإشارة المطلوبة
                  </span>
                  <span className="target-index">
                    {String(roundIndex + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="target-image-frame">
                  {feedback === "correct" && (
                    <div className="success-ring">
                      <Check size={26} />
                    </div>
                  )}
                  <LetterImage letter={target} />
                </div>
                <div className="target-caption">
                  <span className="target-caption-main">
                    ما الحرف الذي تشير إليه هذه اليد؟
                  </span>
                  <button
                    type="button"
                    className={`hint-button ${showHint ? "hint-button-active" : ""}`}
                    onClick={() => setShowHint(shown => !shown)}
                    aria-expanded={showHint}
                  >
                    <Lightbulb size={16} /> تلميح
                  </button>
                </div>
                {showHint && (
                  <div className="hint-content">
                    <span>{target.descriptionAr}</span>
                    <span className="hint-example">
                      مثال: {target.exampleAr}
                    </span>
                  </div>
                )}
              </section>

              <section className="answers-zone" aria-label="خيارات الحروف">
                <div className="answers-heading">
                  <h2>اختر الحرف المطابق</h2>
                  <span>اسحب أو اضغط</span>
                </div>
                <div className="answer-cards">
                  {choices.map((choice, index) => (
                    <button
                      key={choice.letter}
                      className={`answer-card ${feedback === "correct" && choice.letter === target.letter ? "answer-correct" : ""} ${feedback === "wrong" && choice.letter === wrongLetter ? "answer-wrong" : ""}`}
                      type="button"
                      draggable={!feedback}
                      onClick={() => handleAnswer(choice)}
                      onDragStart={event => {
                        event.dataTransfer.setData("text/plain", choice.letter);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setIsDragging(false)}
                      aria-label={`اختيار حرف ${choice.letter}، ${choice.nameAr}`}
                    >
                      <span className="answer-position">
                        {["أ", "ب", "ج"][index]}
                      </span>
                      <LetterImage letter={choice} size="small" />
                      <span className="answer-letter">{choice.letter}</span>
                      <span className="answer-name">{choice.nameAr}</span>
                      {feedback === "correct" &&
                        choice.letter === target.letter && (
                          <span className="answer-check">
                            <Check size={15} />
                          </span>
                        )}
                    </button>
                  ))}
                </div>
                <div className="motivation-card">
                  <span className="motivation-icon">
                    <Heart size={17} fill="currentColor" />
                  </span>
                  <p>
                    خذ وقتك، كل محاولة تقرّبك من{" "}
                    <strong>إتقان لغة جديدة.</strong>
                  </p>
                </div>
              </section>
            </div>

            <CameraPractice
              target={target}
              disabled={feedback !== null}
              onRecognized={letter => {
                const recognized = signLetters.find(
                  candidate => candidate.letter === letter
                );
                if (recognized) handleAnswer(recognized);
              }}
            />

            <div className="play-footer">
              <span>
                <Star size={15} fill="currentColor" /> {progress.totalStars}{" "}
                نجمة
              </span>
              <span>
                <Flame size={15} /> أفضل سلسلة: {progress.bestStreak}
              </span>
              <button
                type="button"
                className="speak-button"
                onClick={() => speakLetter(target)}
              >
                <Volume2 size={15} /> اسمع الحرف
              </button>
            </div>
          </div>
        )}

        {view === "levels" && (
          <div className="content-view">
            <div className="content-heading">
              <div>
                <span className="eyebrow">
                  <Medal size={15} /> تقدمك يكبر معك
                </span>
                <h1>
                  كل خطوة <span>إنجاز</span>
                </h1>
                <p>تعلّم حرفًا، اجمع نجمة، وافتح الطريق للمستوى التالي.</p>
              </div>
              <div className="level-summary">
                <strong>
                  {progress.completedLetters}
                  <small> / ٢٨</small>
                </strong>
                <span>حرفًا منجزًا</span>
              </div>
            </div>
            <div className="level-progress">
              <div className="level-progress-label">
                <span>رحلتك في الأبجدية</span>
                <strong>{progressPercent}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <div className="levels-grid">
              {levels.map((level, index) => {
                const done = progress.completedLetters >= level.end;
                const current =
                  progress.completedLetters >= level.start &&
                  progress.completedLetters < level.end &&
                  progress.totalStars >= level.starsRequired;
                const locked =
                  progress.completedLetters < level.start ||
                  progress.totalStars < level.starsRequired;
                return (
                  <div
                    key={level.title}
                    className={`level-card level-${level.color} ${current ? "level-current" : ""} ${locked ? "level-locked" : ""}`}
                  >
                    <span className="level-art">
                      {locked ? (
                        <LockKeyhole size={19} />
                      ) : done ? (
                        <Check size={20} />
                      ) : (
                        <Sparkles size={20} />
                      )}
                    </span>
                    <span className="level-card-number">
                      المستوى {index + 1}
                    </span>
                    <h2>{level.title}</h2>
                    <p>{level.subtitle}</p>
                    <div className="level-card-footer">
                      <span>
                        {Math.max(
                          0,
                          Math.min(
                            progress.completedLetters - level.start,
                            level.end - level.start
                          )
                        )}{" "}
                        / {level.end - level.start} حروف
                      </span>
                      <span>
                        {done
                          ? "مكتمل"
                          : current
                            ? "أنت هنا"
                            : progress.completedLetters < level.start
                              ? `أكمل ${level.start} حرفًا`
                              : `اجمع ${level.starsRequired} نجمة`}
                      </span>
                    </div>
                    {current && (
                      <button
                        type="button"
                        className="level-continue"
                        onClick={beginJourney}
                      >
                        تابع من هنا <ChevronLeft size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="keep-going">
              <span className="keep-going-icon">
                <Flame size={19} />
              </span>
              <span>
                <strong>خطوتك القادمة تصنع الفرق</strong>
                <small>الإشارات تتقن بالممارسة، وأنت تقوم بعمل رائع.</small>
              </span>
              <button type="button" onClick={beginJourney}>
                واصل اللعب <ChevronLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {view === "learn" && (
          <div className="content-view learn-view">
            <div className="content-heading">
              <div>
                <span className="eyebrow">
                  <BookOpen size={15} /> مرجعك الصغير للإشارة
                </span>
                <h1>
                  كل حرف <span>له حكاية</span>
                </h1>
                <p>اضغط على حرف لتسمع اسمه، واختر مستوى الصعوبة للتصفّح.</p>
              </div>
              <div className="learn-count">
                <strong>{shownLetters.length}</strong>
                <span>إشارة</span>
              </div>
            </div>
            <div
              className="filter-row"
              role="group"
              aria-label="تصفية الحروف حسب الصعوبة"
            >
              {(
                [
                  ["all", "الكل"],
                  ["easy", "سهلة"],
                  ["medium", "متوسطة"],
                  ["advanced", "متقدمة"],
                ] as [Difficulty, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    difficulty === value
                      ? "filter-chip filter-active"
                      : "filter-chip"
                  }
                  onClick={() => setDifficulty(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="letters-grid">
              {shownLetters.map(letter => (
                <button
                  className="learn-letter-card"
                  type="button"
                  key={letter.letter}
                  onClick={() => speakLetter(letter)}
                  aria-label={`استمع إلى حرف ${letter.letter}`}
                >
                  <span className="learn-letter-image">
                    <LetterImage letter={letter} size="small" />
                  </span>
                  <span className="learn-letter-name">{letter.nameAr}</span>
                  <span className="learn-letter-glyph">{letter.letter}</span>
                  <span className="learn-difficulty">
                    {letter.difficulty === "easy"
                      ? "سهلة"
                      : letter.difficulty === "medium"
                        ? "متوسطة"
                        : "متقدمة"}
                  </span>
                </button>
              ))}
            </div>
            <div className="learning-note">
              <Lightbulb size={18} />
              <p>
                راقب وضع الأصابع أولًا، ثم جرّب تذكّر شكل الإشارة بنفسك.{" "}
                <strong>التكرار يصنع الإتقان!</strong>
              </p>
            </div>
          </div>
        )}

        {view === "achievements" && (
          <div className="content-view achievements-view">
            {progress.completedLetters >= signLetters.length ? (
              <div className="finish-banner">
                <span className="finish-icon">
                  <Crown size={27} />
                </span>
                <span>
                  <strong>يا بطل! أكملت الأبجدية كاملة.</strong>
                  <small>٢٨ حرفًا تعلّمتها، و٢٨ خطوة جميلة قطعتها.</small>
                </span>
                <Sparkles className="finish-spark" size={24} />
              </div>
            ) : null}
            <div className="content-heading">
              <div>
                <span className="eyebrow">
                  <Award size={15} /> إنجازاتك تستاهل الاحتفال
                </span>
                <h1>
                  شوف <span>وش حققت!</span>
                </h1>
                <p>كل إشارة تتعلمها تستحق التصفيق. هذه محطات رحلتك.</p>
              </div>
              <div className="level-summary">
                <strong>
                  {unlockedAchievements}
                  <small> / ٥</small>
                </strong>
                <span>شارات مفتوحة</span>
              </div>
            </div>
            <div className="achievement-list">
              {[
                {
                  id: "first-letter",
                  title: "أول حرف",
                  description: "أكمل أول إشارة",
                  reward: badgeRewards["first-letter"],
                  icon: <Sparkles size={21} />,
                  progress: Math.min(progress.completedLetters, 1),
                  goal: 1,
                },
                {
                  id: "ten-letters",
                  title: "عشرة حروف",
                  description: "أكمل عشرة حروف",
                  reward: badgeRewards["ten-letters"],
                  icon: <BookOpen size={21} />,
                  progress: Math.min(progress.completedLetters, 10),
                  goal: 10,
                },
                {
                  id: "first-level",
                  title: "بطل المستوى الأول",
                  description: "أكمل حروف المرحلة الأولى",
                  reward: badgeRewards["first-level"],
                  icon: <Medal size={21} />,
                  progress: Math.min(progress.completedLetters, 5),
                  goal: 5,
                },
                {
                  id: "five-streak",
                  title: "سلسلة خماسية",
                  description: "أجب عن خمسة حروف متتالية",
                  reward: badgeRewards["five-streak"],
                  icon: <Flame size={21} />,
                  progress: Math.min(progress.bestStreak, 5),
                  goal: 5,
                },
                {
                  id: "star-collector",
                  title: "جامع النجوم",
                  description: "اجمع خمس عشرة نجمة",
                  reward: badgeRewards["star-collector"],
                  icon: <Star size={21} />,
                  progress: Math.min(progress.totalStars, 15),
                  goal: 15,
                },
              ].map(achievement => {
                const unlocked = progress.unlockedBadges.includes(
                  achievement.id
                );
                return (
                  <div
                    className={`achievement-card ${unlocked ? "achievement-unlocked" : ""}`}
                    key={achievement.id}
                  >
                    <span className="achievement-icon">{achievement.icon}</span>
                    <div className="achievement-copy">
                      <div>
                        <h2>{achievement.title}</h2>
                        <span>{unlocked ? "مفتوحة!" : "قريبًا"}</span>
                      </div>
                      <p>{achievement.description}</p>
                      <div className="achievement-progress">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${(achievement.progress / achievement.goal) * 100}%`,
                            }}
                          />
                        </div>
                        <small>
                          {achievement.progress} / {achievement.goal}
                        </small>
                      </div>
                    </div>
                    <span className="achievement-reward">
                      {unlocked ? (
                        <Check size={16} />
                      ) : (
                        <LockKeyhole size={15} />
                      )}
                      +{achievement.reward.toLocaleString("ar")} نجمة
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="achievement-actions">
              <button
                className="primary-cta"
                type="button"
                onClick={
                  progress.completedLetters >= signLetters.length
                    ? restartJourney
                    : beginJourney
                }
              >
                {progress.completedLetters >= signLetters.length ? (
                  <RotateCcw size={18} />
                ) : (
                  <Gamepad2 size={18} />
                )}
                {progress.completedLetters >= signLetters.length
                  ? "ابدأ رحلة جديدة"
                  : "واصل جمع الإنجازات"}
                <ChevronLeft size={16} />
              </button>
              <button
                className="secondary-cta"
                type="button"
                onClick={() => setView("home")}
              >
                العودة للبداية
              </button>
            </div>
          </div>
        )}
      </section>

      {message && (
        <div
          className={`toast-message ${feedback === "wrong" ? "toast-wrong" : ""}`}
          role="status"
          aria-live="polite"
        >
          {feedback === "correct" ? (
            <Check size={18} />
          ) : feedback === "wrong" ? (
            <Lightbulb size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          {message}
        </div>
      )}
      {milestone && (
        <div className="milestone-toast" role="status">
          <span>
            <Star size={22} fill="currentColor" />
          </span>
          <strong>{milestone}</strong>
          <Sparkles size={18} />
        </div>
      )}
      <footer className="game-bottom">
        <span>الإشارة تتحدث</span>
        <span className="footer-separator">·</span>
        <span>حرفٌ جديد، تواصلٌ أقرب</span>
        <span className="footer-heart">
          <Heart size={12} fill="currentColor" />
        </span>
      </footer>
    </main>
  );
}
