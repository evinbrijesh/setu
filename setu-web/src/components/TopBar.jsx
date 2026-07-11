import { useLocation } from "./ScreenContext";

export default function TopBar({ language, onLanguageChange }) {
  const { screen, setScreen } = useLocation();

  const getLinkClass = (active) => {
    return active
      ? "text-primary dark:text-primary-fixed font-bold font-label-lg text-label-lg border-b-2 border-primary pb-1 transition-all duration-200"
      : "text-secondary dark:text-secondary-fixed-dim font-label-lg text-label-lg hover:bg-surface-container dark:hover:bg-tertiary-container hover:text-primary transition-colors px-3 py-2 rounded-full";
  };

  return (
    <header className="sticky top-0 z-40 bg-surface dark:bg-on-background border-b border-outline-variant/30">
      <div className="flex items-center justify-between w-full px-container-padding py-4 max-w-7xl mx-auto h-20">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setScreen("welcome")}>
          <span
            className="material-symbols-outlined text-primary dark:text-primary-fixed text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_balance
          </span>
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary dark:text-primary-fixed tracking-tight">
            Setu
          </h1>
        </div>

        {/* Center: Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => setScreen("welcome")}
            className={getLinkClass(screen === "welcome" || screen === "chat" || screen === "complete")}
          >
            Home
          </button>
          <button
            onClick={() => setScreen("services")}
            className={getLinkClass(screen === "services")}
          >
            Services
          </button>
          <button
            onClick={() => setScreen("history")}
            className={getLinkClass(screen === "history")}
          >
            History
          </button>
          <button
            onClick={() => alert("Support tickets and guides are planned for Phase 8.")}
            className={getLinkClass(false)}
          >
            Support
          </button>
        </nav>

        {/* Right: Language toggle */}
        <LanguageButton language={language} onLanguageChange={onLanguageChange} />
      </div>
    </header>
  );
}

function LanguageButton({ language, onLanguageChange }) {
  const labels = { "hi-IN": "हिन्दी", "ta-IN": "தமிழ்", en: "English" };
  const current = labels[language] || "English";

  return (
    <div className="relative">
      <button
        onClick={onLanguageChange}
        className="text-label-lg text-primary px-4 py-2 rounded-full hover:bg-surface-container transition-colors border border-primary/20 flex items-center gap-1"
      >
        {current}
        <span className="material-symbols-outlined text-[16px]">translate</span>
      </button>
    </div>
  );
}
