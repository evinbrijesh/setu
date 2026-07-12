import { useRef, useCallback, useState } from "react";
import useAudioLevel from "../hooks/useAudioLevel";

const WS_URL = import.meta.env.VITE_AUDIO_WS_URL || "ws://localhost:8000/ws/audio";

export default function MicButton({
  isRecording,
  onRecordingChange,
  onProcessingChange,
  onTranscript,
  onAgentResponse,
  onSessionState,
  onAudioResponse,
  language = "hi-IN",
  workflowInstanceId = null,
  schemeId = null,
  size = "lg",
}) {
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [micStream, setMicStream] = useState(null);
  const level = useAudioLevel(isRecording ? micStream : null);

  const startRecording = useCallback(async () => {
    onRecordingChange(true);

    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "transcript":
            // Only update if is_final, or if it has text (prevents empty overrides)
            if (msg.text) {
              onTranscript?.(msg.text, msg.is_final);
            }
            break;
          case "agent_response_text":
            onAgentResponse?.(msg.text);
            break;
          case "session_state":
            onSessionState?.(msg);
            break;
          case "session_started":
            if (msg.workflow_instance_id) {
              onSessionState?.({ workflow_instance_id: msg.workflow_instance_id });
            }
            break;
          case "error":
            console.error("WebSocket error:", msg.message);
            break;
        }
      } else {
        const blob = new Blob([event.data]);
        onAudioResponse?.(blob);
      }
    };

    ws.onopen = async () => {
      try {
        const userId = localStorage.getItem("setu_user_id") || crypto.randomUUID();
        localStorage.setItem("setu_user_id", userId);
        ws.send(
          JSON.stringify({
            type: "start_session",
            user_id: userId,
            language_code: language,
            scheme_id: schemeId,
            ...(workflowInstanceId ? { workflow_instance_id: workflowInstanceId } : {}),
          })
        );

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("navigator.mediaDevices.getUserMedia is undefined. Secure context (HTTPS/localhost) required.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setMicStream(stream);

        let options = {};
        if (typeof MediaRecorder !== "undefined") {
          if (MediaRecorder.isTypeSupported("audio/webm")) {
            options = { mimeType: "audio/webm" };
          } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
            options = { mimeType: "audio/ogg" };
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            options = { mimeType: "audio/mp4" };
          }
        }

        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            e.data.arrayBuffer().then((buf) => ws.send(buf));
          }
        };

        mediaRecorder.start(250);
      } catch (err) {
        console.error("WebSocket microphone start failed:", err);
        alert(
          "Could not access your microphone. Please verify that: \n" +
          "1. Microphone permissions are granted.\n" +
          "2. You are using a secure context (localhost or HTTPS)."
        );
        ws.close();
        onRecordingChange(false);
      }
    };

    ws.onclose = () => {
      onRecordingChange(false);
    };

    ws.onerror = () => {
      onRecordingChange(false);
      onProcessingChange?.(false);
    };
  }, [language, workflowInstanceId, schemeId, onRecordingChange, onProcessingChange, onTranscript, onAgentResponse, onSessionState, onAudioResponse]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    const ws = wsRef.current;

    if (mr && mr.state !== "inactive") {
      mr.ondataavailable = null;
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setMicStream(null);

    if (ws && ws.readyState === WebSocket.OPEN) {
      // Send end_utterance to trigger audio transcode and Saaras STT on the server
      ws.send(JSON.stringify({ type: "end_utterance", language_code: language }));
    }

    onRecordingChange(false);
    onProcessingChange?.(true);
  }, [language, onRecordingChange, onProcessingChange]);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const iconSize = size === "sm" ? "text-[28px]" : "text-[44px]";
  const buttonSize = size === "sm" ? "w-16 h-16" : "w-24 h-24";

  const ringScale = isRecording ? 1 + level * 0.35 : 1;
  const ringOpacity = isRecording ? 0.3 + level * 0.5 : 0;
  
  const ring2Scale = isRecording ? 1.25 + level * 0.45 : 1;
  const ring2Opacity = isRecording ? 0.2 + level * 0.35 : 0;
  
  const ring3Scale = isRecording ? 1.5 + level * 0.55 : 1;
  const ring3Opacity = isRecording ? 0.1 + level * 0.2 : 0;

  return (
    <div className="relative flex justify-center items-center">
      {!isRecording && (
        <div
          className="absolute inset-0 bg-primary/10 rounded-full animate-pulse blur-xl"
          style={{ width: "160%", height: "160%", top: "-30%", left: "-30%" }}
        />
      )}

      {isRecording && (
        <>
          <div
            className="absolute rounded-full ai-glow-ring pointer-events-none"
            style={{
              width: "200%",
              height: "200%",
              transform: `scale(${ringScale})`,
              opacity: ringOpacity,
            }}
          />
          <div
            className="absolute rounded-full ai-glow-ring pointer-events-none"
            style={{
              width: "200%",
              height: "200%",
              transform: `scale(${ring2Scale})`,
              opacity: ring2Opacity,
            }}
          />
          <div
            className="absolute rounded-full ai-glow-ring pointer-events-none"
            style={{
              width: "200%",
              height: "200%",
              transform: `scale(${ring3Scale})`,
              opacity: ring3Opacity,
            }}
          />
        </>
      )}

      <button
        onClick={handleClick}
        className={`relative z-10 ${buttonSize} rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-primary-fixed-dim/30 ${
          isRecording
            ? "ai-gradient-flow text-white"
            : "ai-glass-orb-idle text-white"
        }`}
        aria-label={isRecording ? "Stop recording" : "Start voice recording"}
      >
        <span
          className={`material-symbols-outlined ${iconSize}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {isRecording ? "stop" : "mic"}
        </span>
      </button>
    </div>
  );
}

export { WS_URL };
