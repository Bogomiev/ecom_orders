type WindowWithWebkitAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export function playNotificationSound() {
  const audioWindow = window as WindowWithWebkitAudioContext;
  const AudioContextConstructor =
    audioWindow.AudioContext || audioWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  const audioContext = new AudioContextConstructor();
  const masterGain = audioContext.createGain();
  const tones = [
    { frequency: 784, startAt: 0, duration: 0.28 },
    { frequency: 988, startAt: 0.22, duration: 0.32 },
    { frequency: 1319, startAt: 0.48, duration: 0.42 }
  ];
  const endAt = 1.08;

  masterGain.connect(audioContext.destination);
  masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(
    0.28,
    audioContext.currentTime + 0.04
  );
  masterGain.gain.setValueAtTime(0.28, audioContext.currentTime + 0.72);
  masterGain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + endAt
  );

  tones.forEach((tone) => {
    const oscillator = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    const startAt = audioContext.currentTime + tone.startAt;
    const stopAt = startAt + tone.duration;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(tone.frequency, startAt);
    toneGain.gain.setValueAtTime(0.0001, startAt);
    toneGain.gain.exponentialRampToValueAtTime(1, startAt + 0.03);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    oscillator.connect(toneGain);
    toneGain.connect(masterGain);
    oscillator.start(startAt);
    oscillator.stop(stopAt);
  });

  window.setTimeout(() => {
    audioContext.close();
  }, 1300);
}
