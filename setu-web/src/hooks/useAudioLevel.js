/**
 * useAudioLevel — returns a real-time audio amplitude level (0–1)
 * from a MediaStream via the Web Audio API's AnalyserNode.
 *
 * Usage:
 *   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 *   const level = useAudioLevel(stream); // 0.0 (silent) – 1.0 (loud)
 *
 * The level updates at ~60 fps while the stream is active.
 * Returns 0 when stream is null (idle / stopped).
 */

import { useEffect, useRef, useState } from "react";

export default function useAudioLevel(stream) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;

    source.connect(analyser);
    // Do NOT connect to audioCtx.destination — we don't want playback

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
    ctxRef.current = audioCtx;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      // RMS-like average of frequency bins → 0–1 range
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength / 255; // normalize to 0–1

      // Boost low levels slightly so even quiet speech shows a ring,
      // and apply a power curve so loud speech really pushes it out.
      const boosted = Math.min(1, Math.pow(avg, 0.6) * 1.4);
      setLevel(boosted);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      audioCtx.close();
      analyserRef.current = null;
      dataArrayRef.current = null;
      ctxRef.current = null;
      setLevel(0);
    };
  }, [stream]);

  return level;
}
