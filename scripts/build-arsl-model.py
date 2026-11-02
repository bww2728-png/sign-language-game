import argparse
import csv
import math
import struct
from pathlib import Path


LETTER_ORDER = [
    "ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي"
]

LABELS = {
    "Alef": "ا",
    "Ba2": "ب",
    "Ta2": "ت",
    "Tha2": "ث",
    "Jim": "ج",
    "7a2": "ح",
    "Kha2": "خ",
    "Dal": "د",
    "Thal": "ذ",
    "Ra2": "ر",
    "Zayn": "ز",
    "Sin": "س",
    "Chin": "ش",
    "SSad": "ص",
    "DDad": "ض",
    "TTa2": "ط",
    "TTha2": "ظ",
    "3ayn": "ع",
    "Ghayn": "غ",
    "Fa2": "ف",
    "9af": "ق",
    "Kaf": "ك",
    "Lam": "ل",
    "Mim": "م",
    "Noon": "ن",
    "Ha2": "ه",
    "Waw": "و",
    "Ya2": "ي",
}


def normalized_features(row):
    points = []
    for index in range(21):
        x = float(row[f"x{index}"])
        y = float(row[f"y{index}"])
        points.append((x, y))
    wrist_x, wrist_y = points[0]
    scale = math.hypot(points[9][0] - wrist_x, points[9][1] - wrist_y)
    if not math.isfinite(scale) or scale < 1e-5:
        return None
    features = []
    for x, y in points:
        features.extend(((x - wrist_x) / scale, (y - wrist_y) / scale))
    if not all(math.isfinite(value) for value in features):
        return None
    return features


def build_model(csv_path, output_path):
    letter_indexes = {letter: index for index, letter in enumerate(LETTER_ORDER)}
    samples = []
    with Path(csv_path).open(newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source, delimiter=";")
        if not reader.fieldnames or "Sign" not in reader.fieldnames:
            raise ValueError("Expected a semicolon-delimited ArSL-31 CSV.")
        indexes = {name: index for index, name in enumerate(reader.fieldnames)}
        missing = [name for index in range(21) for name in (f"x{index}", f"y{index}") if name not in indexes]
        if missing:
            raise ValueError(f"Missing landmark columns: {', '.join(missing[:4])}")
        for row in reader:
            letter = LABELS.get(row.get("Sign", ""))
            if letter is None:
                continue
            features = normalized_features(row)
            if features is not None:
                samples.append((letter_indexes[letter], features))
    counts = [sum(label == index for label, _ in samples) for index in range(len(LETTER_ORDER))]
    if any(count == 0 for count in counts):
        raise ValueError("The dataset must contain at least one sample for every letter.")
    output = bytearray(b"ARSL")
    output.extend(struct.pack("<BBBBH", 1, len(LETTER_ORDER), 42, 0, len(samples)))
    output.extend(struct.pack("<" + "H" * len(LETTER_ORDER), *(ord(letter) for letter in LETTER_ORDER)))
    for label, features in samples:
        output.extend(struct.pack("<B42f", label, *features))
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(output)
    print(f"Wrote {len(samples)} samples ({len(output)} bytes) to {target}")
    print("Per-class samples:", ", ".join(f"{letter}:{count}" for letter, count in zip(LETTER_ORDER, counts)))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv")
    parser.add_argument("output_model")
    arguments = parser.parse_args()
    build_model(arguments.input_csv, arguments.output_model)
