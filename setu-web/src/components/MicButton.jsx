import { useRef, useCallback } from "react";

const WS_URL = import.meta.env.VITE_AUDIO_WS_URL || "ws://localhost:8000/ws/audio";

/**
 * The Pulse — primary interaction element.
 *
 * Props (controlled by parent for state management):
 *  - isRecording: boolean
 *  - onRecordingChange: (recording: boolean) => void
 *  - onTranscript: (text: string) => void
 *  - onAgentResponse: (text: string) => void
 *  - onSessionState: (state: object) => void
 *  - onAudioResponse: (blob: Blob) => void
 *  - language: string
 *  - workflowInstanceId: string | null
 *  - size: 'sm' | 'lg' (default 'lg')
 */
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
  size = "lg",
}) {
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);

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
            onTranscript?.(msg.text, msg.is_final);
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
        // Binary = synthesized audio
        const blob = new Blob([event.data], { type: "audio/wav" });
        onAudioResponse?.(blob);
      }
    };

    ws.onopen = async () => {
      // Send session start — persist user_id across reloads
      const userId = localStorage.getItem("setu_user_id") || crypto.randomUUID();
      localStorage.setItem("setu_user_id", userId);
      ws.send(
        JSON.stringify({
          type: "start_session",
          user_id: userId,
          language_code: language,
          ...(workflowInstanceId ? { workflow_instance_id: workflowInstanceId } : {}),
        })
      );

      // Start mic capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          e.data.arrayBuffer().then((buf) => ws.send(buf));
        }
      };

      mediaRecorder.start(250);
    };

    ws.onclose = () => {
      onRecordingChange(false);
    };

    ws.onerror = () => {
      onRecordingChange(false);
      onProcessingChange?.(false);
    };
  }, [language, workflowInstanceId, onRecordingChange, onProcessingChange, onTranscript, onAgentResponse, onSessionState, onAudioResponse]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    const ws = wsRef.current;

    if (mr && mr.state !== "inactive") {
      mr.ondataavailable = null; // prevent final chunk race
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
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

  const iconSize = size === "sm" ? "text-[32px]" : "text-[56px]";
  const buttonSize = size === "sm" ? "w-20 h-20" : "w-32 h-32";

  return (
    <div className="relative flex justify-center items-center">
      {/* Pulsing background rings — only show when idle */}
      {!isRecording && (
        <>
          <div
            className="absolute inset-0 bg-primary-container opacity-10 rounded-full animate-ping-slow"
            style={{ width: "200%", height: "200%", top: "-50%", left: "-50%" }}
          />
          <div
            className="absolute inset-0 bg-primary-container opacity-20 rounded-full animate-ping-slow"
            style={{
              width: "160%",
              height: "160%",
              top: "-30%",
              left: "-30%",
              animationDelay: "0.5s",
            }}
          />
          <div
            className="absolute inset-0 bg-primary-container opacity-30 rounded-full animate-ping-slow"
            style={{
              width: "130%",
              height: "130%",
              top: "-15%",
              left: "-15%",
              animationDelay: "1s",
            }}
          />
        </>
      )}

      {/* Active recording rings */}
      {isRecording && (
        <>
          <div
            className="absolute inset-0 rounded-full bg-primary-container animate-pulse-ring"
            style={{ width: "200%", height: "200%", top: "-50%", left: "-50%" }}
          />
          <div
            className="absolute inset-0 rounded-full bg-primary-container animate-pulse-ring"
            style={{
              width: "160%",
              height: "160%",
              top: "-30%",
              left: "-30%",
              animationDelay: "0.5s",
            }}
          />
        </>
      )}

      {/* The Button */}
      <button
        onClick={handleClick}
        className={`relative z-10 ${buttonSize} rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-fixed-dim ${
          isRecording
            ? "bg-error text-on-error pulse-active"
            : "bg-primary-container text-on-primary-container pulse-idle"
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
