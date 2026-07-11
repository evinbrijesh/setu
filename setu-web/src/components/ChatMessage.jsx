import { useState, useEffect } from "react";

export default function ChatMessage({ role, text, created_at }) {
  const isAgent = role === "agent";
  const isUser = role === "user";
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    // Generate static timestamp based on creation time, or default to current time
    const date = created_at ? new Date(created_at) : new Date();
    setTimeStr(
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  }, [created_at]);

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} w-full`}>
      <div className={`max-w-[85%] group flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        {/* Chat Bubble */}
        <div
          className={`p-5 shadow-sm transition-all duration-200 ${
            isAgent
              ? "bg-surface-container-lowest border border-surface-variant/60 rounded-2xl rounded-tl-none group-hover:border-primary/20"
              : "bg-primary-container text-on-primary-container rounded-2xl rounded-tr-none group-hover:shadow-md"
          }`}
        >
          <p className={`font-body-md text-body-md leading-relaxed ${isUser ? "text-white" : "text-on-surface"}`}>
            {text}
          </p>
        </div>

        {/* Bubble Meta (Avatar & Timestamp) */}
        <div className={`flex items-center gap-2 mt-2 ${isUser ? "mr-1" : "ml-1"}`}>
          {!isUser && (
            <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[10px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                smart_toy
              </span>
            </span>
          )}
          
          <span className="font-label-lg text-[12px] text-secondary font-medium">
            {isAgent ? `Setu Agent • ${timeStr}` : `You • ${timeStr}`}
          </span>

          {isUser && (
            <span className="material-symbols-outlined text-[14px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              done_all
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
