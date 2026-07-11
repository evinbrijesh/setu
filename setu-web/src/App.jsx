import { useState, useCallback, useEffect } from "react";
import { ScreenProvider } from "./components/ScreenContext";
import TopBar from "./components/TopBar";
import WelcomeScreen from "./screens/WelcomeScreen";
import ChatScreen from "./screens/ChatScreen";
import CompletionScreen from "./screens/CompletionScreen";
import ServicesScreen from "./screens/ServicesScreen";
import HistoryScreen from "./screens/HistoryScreen";
import PreviewScreen from "./screens/PreviewScreen";

const PM_KISAN_FIELDS = [
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

const CASTE_FIELDS = [
  { name: "full_name", type: "text", prompt: "What is your full name?", value: null },
  { name: "state", type: "text", prompt: "Which state are you residing in?", value: null },
  { name: "caste_category", type: "text", prompt: "What is your caste category (e.g. OBC, SC, ST)?", value: null },
  { name: "sub_caste", type: "text", prompt: "What is your sub-caste name?", value: null },
  { name: "annual_family_income", type: "number", prompt: "What is your annual family income?", value: null }
];

const INCOME_FIELDS = [
  { name: "full_name", type: "text", prompt: "What is your full name?", value: null },
  { name: "district", type: "text", prompt: "Which district is your residence located in?", value: null },
  { name: "occupation", type: "text", prompt: "What is your occupation or profession?", value: null },
  { name: "annual_income", type: "number", prompt: "What is your annual income?", value: null }
];

export default function App() {
  // Screen routing: 'welcome' | 'services' | 'history' | 'chat' | 'complete' | 'preview'
  const [screen, setScreen] = useState("welcome");

  // Selected scheme context (used during preview stage)
  const [selectedSchemeId, setSelectedSchemeId] = useState("pm_kisan");
  const [selectedSchemeLabel, setSelectedSchemeLabel] = useState("PM Kisan");

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
  const [fields, setFields] = useState(PM_KISAN_FIELDS);

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
      setSelectedSchemeId(schemeId);
      setSelectedSchemeLabel(label || schemeId);
      setScreen("preview");
    },
    []
  );

  const handleProceedPreview = useCallback(() => {
    const schemeId = selectedSchemeId;
    const name = selectedSchemeLabel;
    setSchemeName(name);
    localStorage.setItem("setu_scheme_name", name);
    localStorage.setItem("setu_scheme_id", schemeId);
    
    let selectedFields = PM_KISAN_FIELDS;
    if (schemeId === "caste_cert") {
      selectedFields = CASTE_FIELDS;
    } else if (schemeId === "income_cert") {
      selectedFields = INCOME_FIELDS;
    }
    
    setFields(selectedFields);
    setWorkflowInstanceId(null);
    localStorage.removeItem("setu_workflow_id");
    localStorage.removeItem("setu_workflow_complete");
    setIsResumed(false);
    setIsComplete(false);
    setPdfDownloadUrl("");

    // Add an initial agent greeting message
    setMessages([
      {
        role: "agent",
        text: `Namaste! I can help you apply for ${name}. Tap the mic and tell me about yourself.`,
      },
    ]);
    setScreen("chat");
  }, [selectedSchemeId, selectedSchemeLabel]);

  const handleUploadAndProcess = useCallback((file) => {
    const schemeId = selectedSchemeId;
    const name = selectedSchemeLabel;
    
    // Define pre-populated data based on scheme
    let extractedData = {};
    let selectedFields = [];
    
    if (schemeId === "pm_kisan") {
      extractedData = {
        owns_land: true,
        land_size_acres: 1.5,
        has_aadhaar_linked_bank: true,
        district: "Lucknow",
        full_name: "Rajesh Kumar",
      };
      selectedFields = PM_KISAN_FIELDS.map(f => ({ ...f, value: extractedData[f.name] }));
    } else if (schemeId === "caste_cert") {
      extractedData = {
        full_name: "Rajesh Kumar",
        state: "Uttar Pradesh",
        caste_category: "OBC",
        sub_caste: "Yadav",
        annual_family_income: 240000,
      };
      selectedFields = CASTE_FIELDS.map(f => ({ ...f, value: extractedData[f.name] }));
    } else {
      // Income Certificate
      extractedData = {
        full_name: "Rajesh Kumar",
        district: "Lucknow",
        occupation: "Retail Shop Owner",
        annual_income: 180000,
      };
      selectedFields = INCOME_FIELDS.map(f => ({ ...f, value: extractedData[f.name] }));
    }

    // Call prepopulate endpoint in setu-audio
    const audioBaseUrl = (() => {
      const wsUrl = import.meta.env.VITE_AUDIO_WS_URL || "ws://localhost:8000/ws/audio";
      return wsUrl.replace(/^ws/, "http").replace(/\/ws\/audio$/, "");
    })();

    const userId = localStorage.getItem("setu_user_id") || crypto.randomUUID();
    localStorage.setItem("setu_user_id", userId);

    fetch(`${audioBaseUrl}/api/session/prepopulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        scheme_id: schemeId,
        fields: extractedData,
      }),
    })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (data.workflow_instance_id) {
          setWorkflowInstanceId(data.workflow_instance_id);
          localStorage.setItem("setu_workflow_id", data.workflow_instance_id);
        }
        
        setSchemeName(name);
        localStorage.setItem("setu_scheme_name", name);
        localStorage.setItem("setu_scheme_id", schemeId);
        setFields(selectedFields);
        setIsResumed(false);
        setIsComplete(false);
        setPdfDownloadUrl("");

        // Create a chat history with user upload indicator and agent extraction feedback
        setMessages([
          {
            role: "user",
            text: `[Uploaded document: ${file.name}]`,
          },
          {
            role: "agent",
            text: `Namaste! I have successfully processed your uploaded certificate and pre-populated the application progress. Let's review the gathered details to proceed.`,
          },
        ]);
        setScreen("chat");
      })
      .catch((err) => {
        console.error("Error prepopulating session:", err);
        alert("Simulated upload completed, but could not sync with database.");
        setScreen("welcome");
      });
  }, [selectedSchemeId, selectedSchemeLabel]);

  const handleResumeSession = useCallback(
    (instanceId, schemeId, schemeLabel) => {
      setWorkflowInstanceId(instanceId);
      setSchemeName(schemeLabel);
      localStorage.setItem("setu_workflow_id", instanceId);
      localStorage.setItem("setu_scheme_name", schemeLabel);
      localStorage.setItem("setu_scheme_id", schemeId);
      localStorage.removeItem("setu_workflow_complete");
      
      let selectedFields = PM_KISAN_FIELDS;
      if (schemeId === "caste_cert") {
        selectedFields = CASTE_FIELDS;
      } else if (schemeId === "income_cert") {
        selectedFields = INCOME_FIELDS;
      }
      
      setFields(selectedFields);
      setIsResumed(true);
      setIsComplete(false);
      setPdfDownloadUrl("");
      setMessages([]);

      // Fetch conversation history from backend
      const audioBaseUrl = (() => {
        const wsUrl = import.meta.env.VITE_AUDIO_WS_URL || "ws://localhost:8000/ws/audio";
        return wsUrl.replace(/^ws/, "http").replace(/\/ws\/audio$/, "");
      })();

      fetch(`${audioBaseUrl}/api/session/${encodeURIComponent(instanceId)}/messages`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (data.length > 0) {
            setMessages(data);
          } else {
            setMessages([
              {
                role: "agent",
                text: `Welcome back! We are resuming your ${schemeLabel} application. Tap the mic to continue.`,
              },
            ]);
          }
        })
        .catch(() => {
          setMessages([
            {
              role: "agent",
              text: `Welcome back! We are resuming your ${schemeLabel} application. Tap the mic to continue.`,
            },
          ]);
        });
      
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
    setFields(PM_KISAN_FIELDS);
    localStorage.removeItem("setu_workflow_id");
    localStorage.removeItem("setu_workflow_complete");
    localStorage.removeItem("setu_scheme_name");
    localStorage.removeItem("setu_scheme_id");
  }, []);

  // ── Mount-time restore from localStorage ──
  // Resumes an in-progress workflow after page reload, or shows
  // the completion screen if the workflow finished before reload.
  useEffect(() => {
    const storedWorkflowId = localStorage.getItem("setu_workflow_id");
    const storedSchemeName = localStorage.getItem("setu_scheme_name");
    const storedSchemeId = localStorage.getItem("setu_scheme_id") || "pm_kisan";
    const wasComplete = localStorage.getItem("setu_workflow_complete") === "true";
    const storedUserName = localStorage.getItem("setu_user_name");

    if (storedUserName) setUserName(storedUserName);

    if (storedWorkflowId) {
      setWorkflowInstanceId(storedWorkflowId);
      if (storedSchemeName) setSchemeName(storedSchemeName);

      // Setup correct fields
      let selectedFields = PM_KISAN_FIELDS;
      if (storedSchemeId === "caste_cert") {
        selectedFields = CASTE_FIELDS;
      } else if (storedSchemeId === "income_cert") {
        selectedFields = INCOME_FIELDS;
      }
      setFields(selectedFields);

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
        
        // 1. Fetch already collected fields from Supabase to prevent empty checklist/form preview on reload
        import("./lib/supabase.js").then(({ supabase }) => {
          supabase
            .from("documents_collected")
            .select("field_name, field_value")
            .eq("workflow_instance_id", storedWorkflowId)
            .then(({ data, error }) => {
              if (data && !error) {
                setFields((prev) =>
                  prev.map((f) => {
                    const match = data.find((row) => row.field_name === f.name);
                    if (match && match.field_value !== "__dependency_skipped__" && match.field_value !== null) {
                      return { ...f, value: match.field_value };
                    }
                    return f;
                  })
                );
              }
            });
        });
        
        // 2. Fetch conversation history from backend messages log
        const audioBaseUrl = (() => {
          const wsUrl = import.meta.env.VITE_AUDIO_WS_URL || "ws://localhost:8000/ws/audio";
          return wsUrl.replace(/^ws/, "http").replace(/\/ws\/audio$/, "");
        })();

        fetch(`${audioBaseUrl}/api/session/${encodeURIComponent(storedWorkflowId)}/messages`)
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => {
            if (data.length > 0) {
              setMessages(data);
            } else {
              setMessages([
                {
                  role: "agent",
                  text: "Welcome back! You have an existing application in progress. Tap the mic to continue.",
                },
              ]);
            }
          })
          .catch(() => {
            setMessages([
              {
                role: "agent",
                text: "Welcome back! You have an existing application in progress. Tap the mic to continue.",
              },
            ]);
          });

        setScreen("chat");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScreenProvider value={{ screen, setScreen }}>
      <div className="min-h-screen flex flex-col bg-[#f8f9ff]">
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

        {screen === "services" && (
          <ServicesScreen onStartChat={handleStartChat} />
        )}

        {screen === "history" && (
          <HistoryScreen onResumeSession={handleResumeSession} />
        )}

        {screen === "preview" && (
          <PreviewScreen
            schemeId={selectedSchemeId}
            schemeLabel={selectedSchemeLabel}
            onProceed={handleProceedPreview}
            onUploadAndProcess={handleUploadAndProcess}
          />
        )}

        {screen === "chat" && (
          <ChatScreen
            messages={messages}
            fields={fields}
            schemeName={schemeName}
            schemeId={selectedSchemeId}
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
        {(screen === "welcome" || screen === "services" || screen === "preview") && (
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
