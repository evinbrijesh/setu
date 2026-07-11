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
    onStartChat?.(schemeId, label);
  };

  const handleSessionState = (state) => {
    onSessionState?.(state);
    if (state.workflow_instance_id) {
      setScreen("chat");
    }
  };

  return (
    <main className="flex-grow flex flex-col items-center justify-center px-container-padding max-w-[1200px] mx-auto w-full py-stack-gap relative">
      {/* Decorative Atmospheric Elements */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-surface-container-high rounded-full blur-3xl"></div>
      </div>

      {/* Central Interaction Zone (The Pulse) */}
      <div className="flex flex-col items-center text-center space-y-8 w-full max-w-2xl mt-8">
        <div className="relative group cursor-pointer">
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
        <div className="space-y-4">
          <h2 className="font-headline-xl text-headline-xl text-on-surface">
            Tap the mic and tell me what you need
          </h2>
          <p className="font-body-lg text-body-lg text-secondary max-w-lg mx-auto leading-relaxed">
            Your digital bridge to government services. Speak naturally in your preferred language.
          </p>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="mt-8 w-full max-w-4xl">
        <SuggestionChips onSelect={handleChipSelect} />
      </div>

      {/* Featured Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-section-margin w-full max-w-[1000px] mb-12">
        {/* Bento 1: Featured Service */}
        <div className="md:col-span-2 glass-card p-container-padding rounded-lg flex items-center justify-between gap-6 hover:shadow-md transition-shadow">
          <div className="flex-grow">
            <span className="inline-block bg-primary-container text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider mb-3">
              NEW SERVICE
            </span>
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold mb-2">
              Pension Scheme Tracking
            </h3>
            <p className="font-body-md text-body-md text-secondary leading-relaxed">
              Check your pension application status simply by saying "Where is my pension?"
            </p>
          </div>
          <div className="hidden sm:block w-32 h-32 rounded-lg bg-surface-variant overflow-hidden shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-primary opacity-30">elderly</span>
          </div>
        </div>

        {/* Bento 2: Security & Privacy */}
        <div className="bg-primary text-white p-container-padding rounded-lg flex flex-col justify-between hover:shadow-md transition-shadow">
          <span className="material-symbols-outlined text-4xl text-tertiary-fixed">
            shield_with_heart
          </span>
          <div className="mt-8">
            <h3 className="font-label-lg text-label-lg mb-1 text-white font-semibold">Your Privacy</h3>
            <p className="text-sm opacity-80 leading-relaxed">
              End-to-end encrypted voice processing for all citizen requests.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
