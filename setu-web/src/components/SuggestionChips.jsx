const CHIPS = [
  {
    label: "PM Kisan",
    icon: "agriculture",
    scheme: "pm_kisan",
    hint: "प्रधानमंत्री किसान सम्मान निधि",
  },
];

export default function SuggestionChips({ onSelect }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 w-full max-w-xl mx-auto">
      {CHIPS.map((chip) => (
        <button
          key={chip.scheme}
          onClick={() => onSelect(chip.scheme, chip.label)}
          className="flex items-center gap-3 bg-surface-container-low text-on-surface-variant text-label-lg px-6 py-4 rounded-full border border-outline-variant hover:bg-surface-container-high hover:shadow-md transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          title={chip.hint}
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {chip.icon}
          </span>
          {chip.label}
        </button>
      ))}
    </div>
  );
}
