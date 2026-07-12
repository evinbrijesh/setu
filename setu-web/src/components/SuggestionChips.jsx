const CHIPS = [
  {
    scheme: "pm_kisan",
    label: "PM Kisan Eligibility",
    sub: "पीएम किसान पात्रता",
    icon: "agriculture",
    bgClass: "bg-[#e5ffe6] text-[#006e1c]",
    isFeatured: true,
  },
  {
    scheme: "caste_cert",
    label: "Caste Certificate",
    sub: "जाति प्रमाण पत्र",
    icon: "description",
    bgClass: "bg-surface-container-high text-primary",
    isBeta: true,
  },
  {
    scheme: "income_cert",
    label: "Income Certificate",
    sub: "आय प्रमाण पत्र",
    icon: "account_balance_wallet",
    bgClass: "bg-surface-container-high text-primary",
    isBeta: true,
  },
];

export default function SuggestionChips({ onSelect }) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-5 w-full max-w-4xl mx-auto mt-8 px-4">
      {CHIPS.map((chip) => {
        const borderClass = chip.isFeatured
          ? "border-emerald-500/40 hover:border-emerald-500 bg-[#f8fff9]/80 shadow-[0_4px_16px_rgba(0,110,28,0.03)] scale-105"
          : "border-outline-variant hover:border-primary bg-surface-container-lowest";
          
        return (
          <button
            key={chip.scheme}
            onClick={() => onSelect(chip.scheme, chip.label)}
            className={`group border px-7 py-4.5 rounded-full flex items-center gap-4.5 transition-all hover:shadow-md active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${borderClass}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${chip.bgClass}`}>
              <span
                className="material-symbols-outlined text-sm font-bold"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {chip.icon}
              </span>
            </div>
            
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="block font-label-lg text-label-lg text-on-surface font-bold">
                  {chip.label}
                </span>
                {chip.isFeatured && (
                  <span className="bg-[#008f28] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Main
                  </span>
                )}
                {chip.isBeta && (
                  <span className="bg-surface-variant text-on-surface-variant text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider opacity-80">
                    Beta
                  </span>
                )}
              </div>
              <span className="block text-[10px] text-secondary uppercase tracking-widest mt-0.5 font-medium">
                {chip.sub}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
