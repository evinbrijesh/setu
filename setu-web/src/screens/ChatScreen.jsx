import { useEffect, useRef } from "react";
import MicButton from "../components/MicButton";
import ChatMessage from "../components/ChatMessage";
import ProgressPanel from "../components/ProgressPanel";
import { useLocation } from "../components/ScreenContext";

export default function ChatScreen({
  messages,
  fields,
  schemeName,
  schemeId,
  currentFieldIndex,
  isRecording,
  isProcessing,
  onRecordingChange,
  onProcessingChange,
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
  }, [messages, isProcessing]);

  // If the workflow reached completion, bounce to complete screen
  useEffect(() => {
    if (isComplete) {
      onComplete?.();
      setScreen("complete");
    }
  }, [isComplete, onComplete, setScreen]);

  const handleSessionState = (state) => {
    onSessionState?.(state);
    if (state.complete === true) {
      onComplete?.();
      setScreen("complete");
    }
  };

  const showResumeBanner = isResumed && messages.length <= 1;

  // Determine status pill text and styling
  let statusText = "Active";
  let statusBadgeClass = "bg-[#e5eeff] text-primary";
  if (isRecording) {
    statusText = "Listening";
    statusBadgeClass = "bg-primary/10 text-primary animate-pulse";
  } else if (isProcessing) {
    statusText = "Thinking...";
    statusBadgeClass = "bg-surface-variant text-on-surface-variant";
  }

  return (
    <main className="flex-grow flex flex-col md:flex-row gap-6 px-container-padding md:px-section-margin py-stack-gap w-full max-w-[1920px] mx-auto h-[calc(100vh-80px)] overflow-hidden bg-[#fbfcfe]">
      
      {/* ===== Left (60%): Live Assistant Transcript Panel ===== */}
      <div className="w-full md:w-[60%] flex flex-col bg-white rounded-xl border border-surface-variant p-container-padding relative shadow-[0_2px_12px_rgba(0,35,111,0.04)] h-full overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/5 rounded-lg">
              <span className="material-symbols-outlined text-primary text-[24px]">forum</span>
            </div>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold">
              Live Assistant
            </h2>
          </div>
          
          <span className={`px-4 py-1.5 rounded-full font-label-lg text-[13px] flex items-center gap-2 font-semibold ${statusBadgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-primary animate-ping" : "bg-primary"}`}></span>
            {statusText}
          </span>
        </div>

        {/* Messages List Area */}
        <div className="flex flex-col gap-8 flex-grow overflow-y-auto pb-[140px] pr-2 custom-scrollbar">
          {showResumeBanner && (
            <div className="bg-surface-container-high border border-primary-fixed rounded-xl p-4 shrink-0 text-center shadow-sm">
              <p className="text-body-md text-primary font-semibold">
                Welcome back! Resuming your application context.
              </p>
              <p className="text-body-md text-on-surface-variant mt-1">
                Tap the mic to continue where you left off.
              </p>
            </div>
          )}

          {messages.length === 0 && !isProcessing && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-body-lg text-on-surface-variant text-center font-medium opacity-80">
                Tap the mic button below to start speaking.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} text={msg.text} created_at={msg.created_at} />
          ))}

          {/* Typing Bounce Indicator */}
          {isProcessing && (
            <div className="self-start flex gap-1.5 ml-4 py-3 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2.5 h-2.5 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2.5 h-2.5 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Floating Centered Mic Button */}
        <div className="absolute bottom-8 left-0 w-full flex justify-center shrink-0 pointer-events-none z-20">
          <div className="pointer-events-auto">
            <MicButton
              isRecording={isRecording}
              onRecordingChange={onRecordingChange}
              onProcessingChange={onProcessingChange}
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

      {/* ===== Right (40%): Application Progress Panel ===== */}
      <div className="w-full md:w-[40%] flex flex-col gap-6 overflow-y-auto h-full custom-scrollbar pb-10">
        <ProgressPanel
          fields={fields}
          schemeName={schemeName}
          schemeId={schemeId}
          currentFieldIndex={currentFieldIndex}
        />

        {/* Secure verification trust card */}
        <div className="bg-surface-container-low border border-surface-variant/40 rounded-xl p-6 shadow-sm shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              security
            </span>
            <h4 className="font-label-lg text-on-surface font-bold text-primary">
              Secure Verification
            </h4>
          </div>
          <p className="text-[13px] text-on-surface-variant leading-relaxed">
            Your data is encrypted and handled according to government privacy standards. You can pause this conversation or resume it from the history panel at any time.
          </p>
        </div>
      </div>

    </main>
  );
}
