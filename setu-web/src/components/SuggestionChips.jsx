const CHIPS = [
  {
    scheme: "caste_cert",
    label: "Caste Certificate",
    sub: "जाति प्रमाण पत्र",
    icon: "description",
    bgClass: "bg-primary-fixed-dim text-primary",
  },
  {
    scheme: "pm_kisan",
    label: "PM Kisan Eligibility",
    sub: "पीएम किसान पात्रता",
    icon: "agriculture",
    bgClass: "bg-tertiary-fixed text-tertiary",
  },
  {
    scheme: "income_cert",
    label: "Income Certificate",
    sub: "आय प्रमाण पत्र",
    icon: "account_balance_wallet",
    bgClass: "bg-surface-container-high text-primary",
  },
];

export default function SuggestionChips({ onSelect }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 w-full max-w-4xl mx-auto mt-6">
      {CHIPS.map((chip) => (
        <button
          key={chip.scheme}
          onClick={() => onSelect(chip.scheme, chip.label)}
          className="group bg-surface-container-lowest border border-outline-variant hover:border-primary px-6 py-4 rounded-full flex items-center gap-3 transition-all hover:shadow-md active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${chip.bgClass}`}>
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {chip.icon}
            </span>
          </div>
          <div className="text-left">
            <span className="block font-label-lg text-label-lg text-on-surface font-semibold">
              {chip.label}
            </span>
            <span className="block text-[10px] text-secondary uppercase tracking-widest mt-0.5">
              {chip.sub}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
