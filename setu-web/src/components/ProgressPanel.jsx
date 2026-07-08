import FieldItem from "./FieldItem";

export default function ProgressPanel({ fields, schemeName, currentFieldIndex }) {
  const total = fields.length;
  const completed = fields.filter(
    (f) => f.value !== undefined && f.value !== null
  ).length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (!schemeName) {
    return null;
  }

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-[2rem] p-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-headline-lg-mobile text-on-surface font-semibold">
          Application Progress
        </h3>
        <span className="bg-surface-container text-primary px-4 py-1.5 rounded-full text-label-lg text-[14px]">
          Step {Math.min(completed + 1, total)} of {total}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-surface-container rounded-full h-3 mb-8">
        <div
          className="bg-primary h-3 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Field List */}
      {fields.length > 0 && (
        <ul className="flex flex-col gap-4">
          {fields.map((field, idx) => (
            <FieldItem
              key={field.name}
              fieldName={field.name}
              fieldValue={field.value}
              prompt={field.prompt}
              isActive={idx === currentFieldIndex}
            />
          ))}
        </ul>
      )}

      {fields.length === 0 && (
        <p className="text-body-md text-on-surface-variant text-center py-8">
          Select a scheme to begin...
        </p>
      )}
    </div>
  );
}
