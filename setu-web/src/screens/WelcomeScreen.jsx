import { useLocation } from "../components/ScreenContext";
import MicButton from "../components/MicButton";
import SuggestionChips from "../components/SuggestionChips";

export default function WelcomeScreen({
  onStartChat,
  isRecording,
  onRecordingChange,
  onProcessingChange,
  onTranscript,
  onAgentResponse,
  onSessionState,
  onAudioResponse,
  language,
  workflowInstanceId,
}) {
  const { setScreen } = useLocation();

  const handleChipSelect = (schemeId, label) => {
    // Start a chat with a pre-selected scheme context
    onStartChat?.(schemeId, label);
  };

  const handleSessionState = (state) => {
    onSessionState?.(state);
    // Transition to chat screen once we get a workflow instance
    if (state.workflow_instance_id) {
      setScreen("chat");
    }
  };

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-container-padding py-12 w-full max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center justify-between w-full gap-12 lg:gap-24">
        {/* Left: Instruction Text */}
        <div className="text-center md:text-left md:w-1/2">
          <h2 className="text-headline-xl text-[40px] md:text-[48px] leading-[48px] md:leading-[56px] font-bold text-on-surface mb-6 tracking-tight">
            Tap the mic and tell me what you need
          </h2>
          <p className="text-body-lg text-[20px] md:text-[24px] leading-[30px] md:leading-[36px] text-secondary">
            — for example, &ldquo;I need a caste certificate.&rdquo;
          </p>
        </div>

        {/* Right: Mic Button + Chips */}
        <div className="flex flex-col items-center md:w-1/2">
          {/* Central Mic Button */}
          <div className="mb-12">
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
              size="lg"
            />
          </div>

          {/* Suggestion Chips */}
          <SuggestionChips onSelect={handleChipSelect} />
        </div>
      </div>
    </main>
  );
}
