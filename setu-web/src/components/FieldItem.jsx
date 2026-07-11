export default function FieldItem({ fieldName, fieldValue, prompt, isActive }) {
  const isComplete = fieldValue !== undefined && fieldValue !== null;

  const getCleanLabel = () => {
    return fieldName.replace(/_/g, " ");
  };

  if (isActive) {
    return (
      <li className="flex items-start gap-4 bg-primary/5 p-5 rounded-2xl border border-primary/20 shadow-sm">
        <div className="relative w-6 h-6 mt-1 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-primary/25"></div>
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
        <div>
          <p className="font-label-lg text-primary text-[12px] font-bold uppercase tracking-tight mb-1">
            In Progress
          </p>
          <span className="font-body-lg text-primary font-semibold block leading-tight capitalize">
            {getCleanLabel()}
          </span>
          <p className="text-primary/70 text-[13px] mt-1">
            {prompt || `Waiting for details about your ${getCleanLabel()}...`}
          </p>
        </div>
      </li>
    );
  }

  if (isComplete) {
    const displayValue =
      typeof fieldValue === "boolean"
        ? fieldValue
          ? "Yes / हाँ"
          : "No / नहीं"
        : String(fieldValue);

    return (
      <li className="flex items-start gap-4 px-1">
        <div className="bg-tertiary-container/10 p-1.5 rounded-full shrink-0">
          <span
            className="material-symbols-outlined text-tertiary text-[20px] block"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <div>
          <p className="font-label-lg text-secondary text-[12px] font-semibold uppercase tracking-tight mb-0.5 capitalize">
            {getCleanLabel()}
          </p>
          <p className="font-body-lg text-on-surface font-medium capitalize">
            {displayValue}
          </p>
        </div>
      </li>
    );
  }

  // Not yet collected — pending state
  return (
    <li className="flex items-start gap-4 px-1 opacity-50">
      <div className="p-1.5 shrink-0">
        <span
          className="material-symbols-outlined text-on-surface-variant text-[20px] block"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          radio_button_unchecked
        </span>
      </div>
      <div>
        <p className="font-label-lg text-secondary text-[12px] font-semibold uppercase tracking-tight mb-0.5 capitalize">
          {getCleanLabel()}
        </p>
        <p className="font-body-lg text-on-surface-variant capitalize">Pending...</p>
      </div>
    </li>
  );
}
