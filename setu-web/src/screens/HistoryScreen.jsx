import { useEffect, useState } from "react";
import { useLocation } from "../components/ScreenContext";
import { getFormDownloadUrl } from "../lib/api";

const MOCK_HISTORY = [
  {
    id: "mock-income-123",
    scheme_id: "income_cert",
    scheme_label: "Income Certificate",
    created_at: "2023-10-12T10:00:00Z",
    status: "completed",
    current_stage: "notified",
    icon: "description",
    bgClass: "bg-tertiary-fixed text-on-tertiary-fixed",
    isMock: true,
  },
  {
    id: "mock-caste-456",
    scheme_id: "caste_cert",
    scheme_label: "Caste Certificate",
    created_at: "2023-10-24T14:30:00Z",
    status: "in_progress",
    current_stage: "document_collection",
    icon: "badge",
    bgClass: "bg-primary-fixed text-on-primary-fixed",
    isMock: true,
  },
  {
    id: "mock-pmkisan-789",
    scheme_id: "pm_kisan",
    scheme_label: "PM Kisan Eligibility",
    created_at: "2023-09-30T09:15:00Z",
    status: "completed",
    current_stage: "notified",
    icon: "agriculture",
    bgClass: "bg-tertiary-fixed text-on-tertiary-fixed",
    isMock: true,
  },
];

export default function HistoryScreen({ onResumeSession }) {
  const { setScreen } = useLocation();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const userId = localStorage.getItem("setu_user_id");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch history from setu-audio backend
    const audioBaseUrl = (() => {
      const wsUrl = import.meta.env.VITE_AUDIO_WS_URL || "ws://localhost:8000/ws/audio";
      return wsUrl.replace(/^ws/, "http").replace(/\/ws\/audio$/, "");
    })();

    fetch(`${audioBaseUrl}/api/history/${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        // Map database records to display format
        const mapped = data.map((item) => {
          let label = item.scheme_id;
          let icon = "description";
          let bgClass = "bg-primary-fixed text-on-primary-fixed";

          if (item.scheme_id === "pm_kisan") {
            label = "PM Kisan Samman Nidhi";
            icon = "agriculture";
            bgClass = "bg-primary-fixed text-on-primary-fixed";
          } else if (item.scheme_id === "caste_cert") {
            label = "Caste Certificate";
            icon = "badge";
            bgClass = "bg-primary-fixed text-on-primary-fixed";
          } else if (item.scheme_id === "income_cert") {
            label = "Income Certificate";
            icon = "description";
            bgClass = "bg-tertiary-fixed text-on-tertiary-fixed";
          }

          return {
            id: item.id,
            scheme_id: item.scheme_id,
            scheme_label: label,
            created_at: item.created_at,
            status: item.status,
            current_stage: item.current_stage,
            icon,
            bgClass,
            isMock: false,
          };
        });
        setHistoryList(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching history:", err);
        setLoading(false);
      });
  }, [userId]);

  const handleDownload = async (instanceId, schemeLabel) => {
    setDownloadingId(instanceId);
    try {
      const res = await getFormDownloadUrl(instanceId);
      if (res && res.download_url) {
        window.open(res.download_url, "_blank");
      } else {
        alert("PDF is still generating or template rendering failed. Please try again in a few moments.");
      }
    } catch {
      alert("Error generating download link.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleResume = (item) => {
    if (item.isMock) {
      alert("This is a demo history record. Try starting a real voice application from the Home or Services tab!");
      return;
    }
    onResumeSession?.(item.id, item.scheme_id, item.scheme_label);
    setScreen("chat");
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // If there's no live history in database, we show the mockup records with a demo indicator.
  const displayList = historyList.length > 0 ? historyList : MOCK_HISTORY;

  return (
    <main className="flex-grow pt-8 pb-24 max-w-[720px] mx-auto px-container-padding w-full">
      {/* Header Section */}
      <section className="mb-stack-gap">
        <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">
          Recent Activities
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Track your ongoing and historical applications with the state.
        </p>
      </section>

      {/* Demo Banner */}
      {historyList.length === 0 && !loading && (
        <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-secondary font-medium">
            💡 Showing demo history records. Complete an application using the mic to see your live records here!
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant text-sm">Loading your activity log...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayList.map((item) => (
            <div
              key={item.id}
              className="bg-surface-container-low border border-outline-variant p-6 rounded-lg transition-all hover:bg-surface-container hover:shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.bgClass}`}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-body-lg text-body-lg font-semibold text-primary">
                      {item.scheme_label}
                    </h3>
                    <p className="font-label-lg text-label-lg text-on-surface-variant mt-0.5">
                      Applied on {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>

                {item.status === "completed" ? (
                  <div className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span className="font-label-lg text-label-lg">Completed</span>
                  </div>
                ) : (
                  <div className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">pending</span>
                    <span className="font-label-lg text-label-lg">In Progress</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-outline-variant/40 pt-4 gap-4">
                {item.status === "completed" ? (
                  <>
                    <button
                      onClick={() => handleResume(item)}
                      className="flex items-center gap-1 font-label-lg text-label-lg text-primary hover:underline hover:opacity-85"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span> View Chat
                    </button>
                    <button
                      onClick={() => handleDownload(item.id, item.scheme_label)}
                      disabled={downloadingId === item.id}
                      className="flex items-center gap-1 font-label-lg text-label-lg text-primary hover:underline hover:opacity-85 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {downloadingId === item.id ? "hourglass_empty" : "download"}
                      </span>
                      {downloadingId === item.id ? "Loading..." : "Download Form"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleResume(item)}
                    className="flex items-center gap-1 font-label-lg text-label-lg text-primary hover:underline hover:opacity-85"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span> View Status
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decorative Secure Trust banner */}
      <div className="mt-section-margin bg-surface-container-high rounded-xl p-8 relative overflow-hidden shadow-sm">
        <div className="relative z-10 max-w-xs">
          <h4 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2">
            Secure &amp; Transparent
          </h4>
          <p className="font-body-md text-body-md text-on-surface-variant">
            All documents are digitally signed and verified by the issuing authority.
          </p>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/2 opacity-20 md:opacity-40">
          <div className="w-full h-full bg-center bg-no-repeat bg-contain flex items-center justify-center">
            <span className="material-symbols-outlined text-8xl text-primary opacity-30">shield</span>
          </div>
        </div>
      </div>
    </main>
  );
}
