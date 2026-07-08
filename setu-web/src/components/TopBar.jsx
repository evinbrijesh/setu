import { useLocation } from "./ScreenContext";

export default function TopBar({ language, onLanguageChange }) {
  const { setScreen } = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/30">
      <div className="flex items-center justify-between w-full px-container-padding py-4 max-w-7xl mx-auto">
        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <span
            className="material-symbols-outlined text-primary text-[32px] hidden md:block"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_balance
          </span>
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-bold text-primary tracking-tight">
            Setu
          </h1>
        </div>

        {/* Center: Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => setScreen("welcome")}
            className="text-label-lg text-primary border-b-2 border-primary pb-1 hover:opacity-80"
          >
            Home
          </button>
          <button className="text-label-lg text-on-surface hover:text-primary transition-colors">
            Services
          </button>
          <button className="text-label-lg text-on-surface hover:text-primary transition-colors">
            History
          </button>
          <button className="text-label-lg text-on-surface hover:text-primary transition-colors">
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
        <span className="material-symbols-outlined text-[16px]">arrow_drop_down</span>
      </button>
    </div>
  );
}
