(() => {
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const TRIAL_RESULTS = {
    "余裕": { level: "easy", label: "余裕", reason: "試唱で余裕を確認済み" },
    "歌える": { level: "singable", label: "歌える", reason: "試唱で実用範囲内と確認済み" },
    "苦しい": { level: "caution", label: "要注意", reason: "試唱で苦戦" },
    "不可": { level: "hard", label: "現状では難しい", reason: "試唱で現状は歌唱困難と確認" }
  };

  function noteToMidi(note) {
    const match = String(note || "").trim().match(/^([A-Ga-g])([#b]?)(-?\d)$/);
    if (!match) return null;
    const pitch = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1].toUpperCase()];
    const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
    return (Number(match[3]) + 1) * 12 + pitch + accidental;
  }

  function midiToIntl(midi) {
    if (!Number.isFinite(midi)) return "";
    return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  }

  function midiToKaraoke(midi) {
    if (!Number.isFinite(midi)) return "";
    const name = NOTE_NAMES[((midi % 12) + 12) % 12];
    if (midi < 60) return `mid1${name}`;
    if (midi < 69) return `mid2${name}`;
    if (midi < 81) return `hi${name}`;
    return `hihi${name}`;
  }

  function numberOrNull(value) {
    if (value === "" || value == null) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function pitchReason(midi, stable, current) {
    if (midi <= stable) return "想定最高音は安定域内";
    if (midi <= current) return "想定最高音は現在の実用域内";
    return `想定最高音は現在の上限より${midi - current}半音高い`;
  }

  function judge(track, profile = {}) {
    const stable = noteToMidi(profile.stableTop || "A4");
    const current = noteToMidi(profile.currentTop || "A#4");
    const originalMidi = noteToMidi(track.topNoteIntl);
    const keyShift = numberOrNull(track.keyShift);
    const octaveShift = numberOrNull(track.octaveShift);
    const required = [
      [originalMidi, "最高音"], [keyShift, "想定キー差"], [octaveShift, "オクターブ調整"],
      [track.highFrequency, "高音頻度"], [track.highHold, "高音保持"],
      [track.highContinuity, "高音連続性"], [track.chorusLoad, "サビ平均負荷"]
    ];
    const missing = required.filter(([value]) => value == null || value === "").map(([, label]) => label);
    const adjustedMidi = originalMidi == null || keyShift == null || octaveShift == null
      ? null : originalMidi + keyShift + octaveShift * 12;
    const trial = TRIAL_RESULTS[track.trialRating];
    const highReasons = [
      track.highFrequency === "多" && "高音の出現回数が多い",
      track.highHold === "ロング" && "高音ロングトーンあり",
      track.highContinuity === "高" && "高音が連続する",
      track.chorusLoad === "高" && "サビ全体の平均負荷が高い"
    ].filter(Boolean);
    const theoryReasons = adjustedMidi == null ? highReasons : [pitchReason(adjustedMidi, stable, current), ...highReasons];

    if (trial) {
      return { ...trial, source: "trial", originalMidi, adjustedMidi, missing, reasons: [trial.reason, ...theoryReasons].slice(0, 3) };
    }
    if (missing.length) {
      return { level: "unknown", label: "判定材料不足", source: "missing", originalMidi, adjustedMidi, missing, reasons: [`未入力: ${missing.slice(0, 3).join("・")}`] };
    }

    let result;
    if (adjustedMidi > current || highReasons.length >= 2) result = { level: "challenge", label: "挑戦" };
    else if (adjustedMidi === current || highReasons.length === 1) result = { level: "caution", label: "要注意" };
    else if (adjustedMidi <= stable) result = { level: "easy", label: "余裕" };
    else result = { level: "singable", label: "歌える" };
    return { ...result, source: "theory", originalMidi, adjustedMidi, missing: [], reasons: theoryReasons.slice(0, 3) };
  }

  window.SAK_UTA_READINESS = { noteToMidi, midiToIntl, midiToKaraoke, judge };
})();
