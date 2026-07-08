export default function ChatMessage({ role, text }) {
  const isAgent = role === "agent";
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%]">
        <div
          className={
            isAgent
              ? "bg-surface-container-lowest border border-surface-variant rounded-2xl rounded-tl-none p-4 shadow-sm"
              : "bg-primary-container text-on-primary-container rounded-2xl rounded-tr-none p-4 shadow-sm"
          }
        >
          <p className={isUser ? "text-body-md" : "text-body-md text-on-surface"}>
            {text}
          </p>
        </div>
        <span
          className={`text-label-lg text-[12px] text-secondary mt-2 block ${
            isUser ? "text-right mr-2" : "ml-2"
          }`}
        >
          {isAgent ? "Setu Agent" : "You said"}
        </span>
      </div>
    </div>
  );
}
