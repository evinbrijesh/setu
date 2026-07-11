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
  size = "lg",
}) {
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const localTranscriptRef = useRef("");
  
  const [micStream, setMicStream] = useState(null);
  const level = useAudioLevel(isRecording ? micStream : null);

  const startRecording = useCallback(async () => {
    onRecordingChange(true);
    localTranscriptRef.current = "";

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
        const blob = new Blob([event.data], { type: "audio/wav" });
        onAudioResponse?.(blob);
      }
    };

    ws.onopen = async () => {
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicStream(stream);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          e.data.arrayBuffer().then((buf) => ws.send(buf));
        }
      };

      mediaRecorder.start(250);

      // Start local browser Web Speech Recognition as backup/primary transcriptor
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = language;

        rec.onresult = (event) => {
          let interim = "";
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const text = final || interim;
          localTranscriptRef.current = text;
          onTranscript?.(text, false);
        };

        rec.onerror = (e) => {
          console.warn("Local speech recognition warning:", e.error);
        };

        rec.onend = () => {
          // Restart if the user is still actively recording
          if (streamRef.current) {
            try {
              rec.start();
            } catch (_) {}
          }
        };

        recognitionRef.current = rec;
        rec.start();
      }
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

    // Shut down speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

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

    const transcriptText = localTranscriptRef.current.trim();

    if (ws && ws.readyState === WebSocket.OPEN) {
      if (transcriptText) {
        // Send final text transcript directly to bypass server STT
        ws.send(
          JSON.stringify({
            type: "text_utterance",
            text: transcriptText,
            language_code: language,
          })
        );
      } else {
        // Fall back to ending the utterance normally (streams audio buffer)
        ws.send(JSON.stringify({ type: "end_utterance", language_code: language }));
      }
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
