import { useState, useCallback, useEffect } from "react";
import { ScreenProvider } from "./components/ScreenContext";
import TopBar from "./components/TopBar";
import WelcomeScreen from "./screens/WelcomeScreen";
import ChatScreen from "./screens/ChatScreen";
import CompletionScreen from "./screens/CompletionScreen";

const INITIAL_FIELDS = [
  { name: "owns_land", type: "boolean", prompt: "Do you own agricultural land?", value: null },
  {
    name: "land_size_acres",
    type: "number",
    prompt: "How many acres of agricultural land do you own?",
    value: null,
    depends_on: { field: "owns_land", value: true },
  },
  {
    name: "has_aadhaar_linked_bank",
    type: "boolean",
    prompt: "Is your bank account linked to Aadhaar?",
    value: null,
  },
  { name: "district", type: "text", prompt: "Which district is your land registered in?", value: null },
  { name: "full_name", type: "text", prompt: "What is your full name as per Aadhaar?", value: null },
];

export default function App() {
  // Screen routing: 'welcome' | 'chat' | 'complete'
  const [screen, setScreen] = useState("welcome");

  // Session state
  const [language, setLanguage] = useState("hi-IN");
  const [workflowInstanceId, setWorkflowInstanceId] = useState(null);
  const [userName, setUserName] = useState("");
  const [schemeName, setSchemeName] = useState("PM Kisan Samman Nidhi");
  const [isResumed, setIsResumed] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);

  // Processing state — true while backend handles STT → LLM → TTS
  const [isProcessing, setIsProcessing] = useState(false);

  // Chat messages
  const [messages, setMessages] = useState([]);

  // Field collection state
  const [fields, setFields] = useState(INITIAL_FIELDS);

  // Workflow completion
  const [isComplete, setIsComplete] = useState(false);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState("");

  // Derive current field index
  const currentFieldIndex = fields.findIndex((f) => f.value === null);

  // ── Handlers ──

  const handleLanguageChange = useCallback(() => {
    setLanguage((prev) => {
      if (prev === "hi-IN") return "en";
      if (prev === "en") return "ta-IN";
      return "hi-IN";
    });
  }, []);

  const handleStartChat = useCallback(
    (schemeId, label) => {
      const name = label || schemeId;
      setSchemeName(name);
      localStorage.setItem("setu_scheme_name", name);
      // Add an initial agent greeting message
      setMessages([
        {
          role: "agent",
          text: `Namaste! I can help you apply for ${name}. Tap the mic and tell me about yourself.`,
        },
      ]);
      setScreen("chat");
    },
    []
  );

  const handleTranscript = useCallback((text) => {
    setIsProcessing(false);
    setMessages((prev) => [...prev, { role: "user", text }]);
  }, []);

  const handleAgentResponse = useCallback((text) => {
    setIsProcessing(false);
    setMessages((prev) => [...prev, { role: "agent", text }]);
  }, []);

  const handleSessionState = useCallback((state) => {
    if (state.workflow_instance_id) {
      setWorkflowInstanceId(state.workflow_instance_id);
      localStorage.setItem("setu_workflow_id", state.workflow_instance_id);
    }
    if (state.current_stage) {
      // Update fields based on collected_fields
      if (state.collected_fields) {
        setFields((prev) =>
          prev.map((f) => {
            const raw = state.collected_fields[f.name];
            // Never let the backend sentinel leak into the UI
            if (raw === "__dependency_skipped__") return f;
            if (raw !== null && raw !== undefined) {
              return { ...f, value: raw };
            }
            return f;
          })
        );
      }
    }
    if (state.resumed) {
      setIsResumed(true);
    }
    if (state.download_url) {
      setPdfDownloadUrl(state.download_url);
    }
    if (state.complete === true) {
      setIsComplete(true);
      localStorage.setItem("setu_workflow_complete", "true");
    }
  }, []);

  const handleAudioResponse = useCallback((blob) => {
    // Auto-play received audio
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().catch(() => {
      // Autoplay may be blocked — that's OK, the message text is displayed
    });
  }, []);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  const handleStartNew = useCallback(() => {
    // Reset all state
    setWorkflowInstanceId(null);
    setSchemeName("PM Kisan Samman Nidhi");
    setIsResumed(false);
    setIsComplete(false);
    setPdfDownloadUrl("");
    setMessages([]);
    setFields(INITIAL_FIELDS);
    localStorage.removeItem("setu_workflow_id");
    localStorage.removeItem("setu_workflow_complete");
    localStorage.removeItem("setu_scheme_name");
  }, []);

  // ── Mount-time restore from localStorage ──
  // Resumes an in-progress workflow after page reload, or shows
  // the completion screen if the workflow finished before reload.
  useEffect(() => {
    const storedWorkflowId = localStorage.getItem("setu_workflow_id");
    const storedSchemeName = localStorage.getItem("setu_scheme_name");
    const wasComplete = localStorage.getItem("setu_workflow_complete") === "true";
    const storedUserName = localStorage.getItem("setu_user_name");

    if (storedUserName) setUserName(storedUserName);

    if (storedWorkflowId) {
      setWorkflowInstanceId(storedWorkflowId);
      if (storedSchemeName) setSchemeName(storedSchemeName);

      if (wasComplete) {
        // Workflow finished before reload — fetch download URL, show completion
        import("./lib/api.js").then(({ getFormDownloadUrl }) => {
          getFormDownloadUrl(storedWorkflowId).then((result) => {
            if (result.download_url) setPdfDownloadUrl(result.download_url);
          });
        });
        setIsComplete(true);
        setScreen("complete");
      } else {
        // Workflow in progress — resume in chat screen
        setIsResumed(true);
        setMessages([
          {
            role: "agent",
            text: "Welcome back! You have an existing application in progress. Tap the mic to continue.",
          },
        ]);
        setScreen("chat");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenProvider value={{ screen, setScreen }}>
      <div className="min-h-screen flex flex-col">
        <TopBar language={language} onLanguageChange={handleLanguageChange} />

        {screen === "welcome" && (
          <WelcomeScreen
            onStartChat={handleStartChat}
            isRecording={isRecording}
            onRecordingChange={setIsRecording}
            onProcessingChange={setIsProcessing}
            onTranscript={handleTranscript}
            onAgentResponse={handleAgentResponse}
            onSessionState={handleSessionState}
            onAudioResponse={handleAudioResponse}
            language={language}
            workflowInstanceId={workflowInstanceId}
          />
        )}

        {screen === "chat" && (
          <ChatScreen
            messages={messages}
            fields={fields}
            schemeName={schemeName}
            currentFieldIndex={currentFieldIndex}
            isRecording={isRecording}
            isProcessing={isProcessing}
            onRecordingChange={setIsRecording}
            onProcessingChange={setIsProcessing}
            onTranscript={handleTranscript}
            onAgentResponse={handleAgentResponse}
            onSessionState={handleSessionState}
            onAudioResponse={handleAudioResponse}
            language={language}
            workflowInstanceId={workflowInstanceId}
            userName={userName}
            isResumed={isResumed}
            isComplete={isComplete}
            onComplete={handleComplete}
          />
        )}

        {screen === "complete" && (
          <CompletionScreen
            schemeName={schemeName}
            beneficiaryName={
              fields.find((f) => f.name === "full_name")?.value || userName
            }
            pdfDownloadUrl={pdfDownloadUrl}
            onStartNew={handleStartNew}
          />
        )}

        {/* Footer on welcome screen only */}
        {screen === "welcome" && (
          <footer className="mt-auto py-6 text-center">
            <p className="text-sm text-on-surface-variant/60">
              Powered by Sarvam AI &amp; Render Workflows
            </p>
          </footer>
        )}
      </div>
    </ScreenProvider>
  );
}
