export default function FieldItem({ fieldName, fieldValue, prompt, isActive }) {
  const isComplete = fieldValue !== undefined && fieldValue !== null;

  if (isActive) {
    return (
      <li className="flex items-start gap-4 bg-surface-container-low p-4 rounded-xl border border-primary-fixed shadow-inner">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mt-0.5 shrink-0" />
        <div>
          <p className="text-label-lg text-primary mb-1">Current Step</p>
          <span className="text-body-lg text-primary font-medium">
            {prompt || fieldName}: Waiting for input...
          </span>
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
      <li className="flex items-start gap-4">
        <span
          className="material-symbols-outlined text-tertiary-container mt-0.5 shrink-0"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <div>
          <p className="text-label-lg text-secondary mb-1">
            {prompt || fieldName.replace(/_/g, " ")}
          </p>
          <p className="text-body-lg text-on-surface">{displayValue}</p>
        </div>
      </li>
    );
  }

  // Not yet collected — dim placeholder
  return (
    <li className="flex items-start gap-4 opacity-40">
      <span
        className="material-symbols-outlined text-on-surface-variant mt-0.5 shrink-0"
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        radio_button_unchecked
      </span>
      <div>
        <p className="text-label-lg text-secondary mb-1">
          {prompt || fieldName.replace(/_/g, " ")}
        </p>
        <p className="text-body-lg text-on-surface-variant">Pending...</p>
      </div>
    </li>
  );
}
