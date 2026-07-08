import { useEffect, useRef } from "react";
import MicButton from "../components/MicButton";
import ChatMessage from "../components/ChatMessage";
import ProgressPanel from "../components/ProgressPanel";
import { useLocation } from "../components/ScreenContext";

export default function ChatScreen({
  messages,
  fields,
  schemeName,
  currentFieldIndex,
  isRecording,
  onRecordingChange,
  onTranscript,
  onAgentResponse,
  onSessionState,
  onAudioResponse,
  language,
  workflowInstanceId,
  userName,
  isResumed,
  isComplete,
  onComplete,
}) {
  const { setScreen } = useLocation();
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // If the workflow reached completion, bounce to complete screen
  useEffect(() => {
    if (isComplete) {
      onComplete?.();
      setScreen("complete");
    }
  }, [isComplete, onComplete, setScreen]);

  const handleSessionState = (state) => {
    onSessionState?.(state);
    // Check if the workflow signals completion
    if (state.complete === true) {
      onComplete?.();
      setScreen("complete");
    }
  };

  const showResumeBanner = isResumed && messages.length <= 2;

  return (
    <main className="flex-1 overflow-hidden px-container-padding py-stack-gap w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-stack-gap min-h-0">
      {/* ===== Left: Chat / Transcript Area ===== */}
      <div className="lg:w-2/3 flex flex-col bg-surface-container-low rounded-[2rem] border border-surface-variant p-container-padding relative shadow-sm h-[70vh] lg:h-[calc(100vh-180px)]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-headline-lg-mobile text-on-surface font-semibold">
            Live Assistant
          </h2>
          <span className="bg-surface-container text-primary px-3 py-1 rounded-full text-label-lg text-[12px] flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Active
          </span>
        </div>

        {/* Resume Banner */}
        {showResumeBanner && (
          <div className="bg-surface-container-high border border-primary-fixed rounded-xl p-4 mb-4 shrink-0 text-center">
            <p className="text-body-md text-primary font-medium">
              Welcome back! You have an existing application in progress.
            </p>
            <p className="text-body-md text-on-surface-variant mt-1">
              Tap the mic to continue where you left off.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-6 flex-1 overflow-y-auto pb-[120px] pr-2 custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-body-lg text-on-surface-variant text-center">
                Tap the mic button below to start speaking.
              </p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} text={msg.text} />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Mic Button anchored at bottom */}
        <div className="absolute bottom-6 left-0 w-full flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <MicButton
              isRecording={isRecording}
              onRecordingChange={onRecordingChange}
              onTranscript={onTranscript}
              onAgentResponse={onAgentResponse}
              onSessionState={handleSessionState}
              onAudioResponse={onAudioResponse}
              language={language}
              workflowInstanceId={workflowInstanceId}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* ===== Right: Application Progress ===== */}
      <div className="lg:w-1/3 flex flex-col gap-stack-gap overflow-y-auto custom-scrollbar">
        <ProgressPanel
          fields={fields}
          schemeName={schemeName}
          currentFieldIndex={currentFieldIndex}
        />
      </div>
    </main>
  );
}
