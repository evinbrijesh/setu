import { useState } from "react";
import FieldItem from "./FieldItem";

export default function ProgressPanel({ fields, schemeName, schemeId, currentFieldIndex }) {
  const [viewMode, setViewMode] = useState("form"); // "form" | "checklist"
  
  const total = fields.length;
  const completed = fields.filter(
    (f) => f.value !== undefined && f.value !== null
  ).length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (!schemeName) {
    return null;
  }

  // Helper to fetch the value or state of a field by name
  const getFieldInfo = (fieldName) => {
    const idx = fields.findIndex((f) => f.name === fieldName);
    const field = fields[idx];
    if (!field) return { status: "pending", val: null };
    
    if (field.value !== null && field.value !== undefined) {
      return { status: "completed", val: field.value };
    }
    if (idx === currentFieldIndex) {
      return { status: "active", val: null };
    }
    return { status: "pending", val: null };
  };

  // Helper to render value in blue ink or active pulse or empty line
  const renderBlank = (fieldName, fallbackText = "........................") => {
    const { status, val } = getFieldInfo(fieldName);
    
    if (status === "completed") {
      let display = String(val);
      if (typeof val === "boolean") {
        display = val ? "Yes / हाँ" : "No / नहीं";
      }
      return (
        <span className="font-serif italic font-bold text-blue-700 dark:text-blue-500 text-sm px-1 border-b border-blue-600/30 tracking-wide animate-pulse">
          {display}
        </span>
      );
    }
    if (status === "active") {
      return (
        <span className="bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 px-2 py-0.5 rounded text-primary dark:text-primary-fixed animate-pulse font-bold text-[11px]">
          [ Active Step ]
        </span>
      );
    }
    return <span className="text-gray-300 dark:text-gray-700">{fallbackText}</span>;
  };

  const renderCheckbox = (fieldName, targetValue) => {
    const { status, val } = getFieldInfo(fieldName);
    const checked = status === "completed" && val === targetValue;
    const active = status === "active";

    return (
      <span className={`inline-block w-4 h-4 border text-center line-height-4 text-[10px] font-bold mr-1 rounded ${
        active 
          ? "bg-yellow-100 border-yellow-400 animate-pulse text-primary" 
          : "border-on-surface"
      }`}>
        {checked ? "✓" : " "}
      </span>
    );
  };

  // Render high-fidelity government form mockup
  const renderLiveForm = () => {
    if (schemeId === "pm_kisan") {
      return (
        <div className="border-4 border-double border-[#8a6842] p-4 flex flex-col justify-between text-[11px] bg-[#fcfaf5] text-[#3c2f2f] h-full w-full rounded-md shadow-inner select-none overflow-y-auto relative">
          {/* Header */}
          <div className="text-center border-b pb-2 border-[#e6dfd5]">
            <span className="font-bold text-[10px] tracking-wider uppercase block text-[#8a6842]">GOVERNMENT OF INDIA</span>
            <span className="text-[9px] text-[#8c7457] uppercase block">DEPARTMENT OF AGRICULTURE & COOPERATION</span>
            <div className="font-bold text-xs uppercase underline mt-2 text-[#8a6842]">
              PM-KISAN NEW FARMER REGISTRATION FORM
            </div>
          </div>

          {/* Photo Affix */}
          <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80">
            PASTE<br/>PHOTO
          </div>

          {/* Form Content */}
          <div className="space-y-4 mt-4 pr-16">
            <div>
              <span className="font-bold uppercase tracking-tight block text-secondary text-[9px] mb-1">
                Section I — Farmer Profile
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>Name of Farmer: {renderBlank("full_name")}</div>
                <div>Category: <span className="font-semibold">General / OBC</span></div>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-tight block text-secondary text-[9px] mb-1">
                Section II — Land Details
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div className="flex items-center">
                  Owns Cultivable Land: &nbsp;&nbsp;
                  {renderCheckbox("owns_land", true)} Yes &nbsp;&nbsp;&nbsp;
                  {renderCheckbox("owns_land", false)} No
                </div>
                <div>Area of Land Owned: {renderBlank("land_size_acres", "..........")} Acres</div>
                <div>District Register: {renderBlank("district")}</div>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-tight block text-secondary text-[9px] mb-1">
                Section III — Bank & Aadhaar Verification
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div className="flex items-center">
                  Aadhaar Linked Bank Account: &nbsp;&nbsp;
                  {renderCheckbox("has_aadhaar_linked_bank", true)} Yes &nbsp;&nbsp;&nbsp;
                  {renderCheckbox("has_aadhaar_linked_bank", false)} No
                </div>
              </div>
            </div>
          </div>

          {/* Declaration and Signature */}
          <div className="mt-6 border-t pt-2 border-outline-variant/30 flex justify-between items-end">
            <div className="w-1/2 text-[7.5px] leading-tight text-secondary">
              * Verification checklist is evaluated automatically in real-time. Disqualification criteria checks apply.
            </div>
            <div className="text-center w-1/3">
              <div className="border-t border-on-surface w-full mt-4"></div>
              <span className="text-[8px] font-bold">Farmer Signature</span>
            </div>
          </div>
        </div>
      );
    }

    if (schemeId === "caste_cert") {
      return (
        <div className="border-4 border-double border-[#8a6842] p-4 flex flex-col justify-between text-[11px] bg-[#fcfaf5] text-[#3c2f2f] h-full w-full rounded-md shadow-inner select-none overflow-y-auto relative">
          <div className="text-center border-b pb-2 border-[#e6dfd5]">
            <span className="font-bold text-[10px] tracking-wider uppercase block text-[#8a6842]">REVENUE DEPARTMENT</span>
            <span className="text-[9px] text-[#8c7457] uppercase block">APPLICATION FOR COMMUNITY STATUS</span>
            <div className="font-bold text-xs uppercase underline mt-2 text-[#8a6842]">
              FORM I: CASTE CERTIFICATE DECLARATION
            </div>
          </div>

          {/* Photo Affix */}
          <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80">
            PASTE<br/>PHOTO
          </div>

          <div className="space-y-4 mt-4 pr-16">
            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
                Section I — Applicant Profile
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>Name of Applicant: {renderBlank("full_name")}</div>
                <div>State of Residence: {renderBlank("state")}</div>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
                Section II — Caste Details
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>Caste Category (SC/ST/OBC): {renderBlank("caste_category", "................")}</div>
                <div>Sub-Caste Name: {renderBlank("sub_caste")}</div>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
                Section III — Income Exclusions
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>Annual Household Income: Rs. {renderBlank("annual_family_income", "................")}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-2 border-[#e6dfd5] flex justify-between items-end">
            <div className="w-1/2 text-[7.5px] leading-tight text-[#8c7457]">
              * Non-creamy layer verification is processed automatically based on state classifications.
            </div>
            <div className="text-center w-1/3">
              <div className="border-t border-[#3c2f2f] w-full mt-4"></div>
              <span className="text-[8px] font-bold">Applicant Signature</span>
            </div>
          </div>
        </div>
      );
    }

    // Default: Income Certificate
    return (
      <div className="border-4 border-double border-[#8a6842] p-4 flex flex-col justify-between text-[11px] bg-[#fcfaf5] text-[#3c2f2f] h-full w-full rounded-md shadow-inner select-none overflow-y-auto relative">
        <div className="text-center border-b pb-2 border-[#e6dfd5]">
          <span className="font-bold text-[10px] tracking-wider uppercase block text-[#8a6842]">REVENUE DEPARTMENT</span>
          <span className="text-[9px] text-[#8c7457] uppercase block">OFFICE OF THE TAHSILDAR</span>
          <div className="font-bold text-xs uppercase underline mt-2 text-[#8a6842]">
            INCOME STATUS DECLARATION FORM
          </div>
        </div>

        {/* Photo Affix */}
        <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80">
          PASTE<br/>PHOTO
        </div>

        <div className="space-y-4 mt-4 pr-16">
          <div>
            <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
              Section I — Declarant Details
            </span>
            <div className="grid grid-cols-1 gap-2 pl-2">
              <div>Name of Declarant: {renderBlank("full_name")}</div>
              <div>District Location: {renderBlank("district")}</div>
            </div>
          </div>

          <div>
            <span className="font-bold uppercase tracking-tight block text-secondary text-[9px] mb-1">
              Section II — Occupation & Earnings
            </span>
            <div className="grid grid-cols-1 gap-2 pl-2">
              <div>Primary Occupation: {renderBlank("occupation")}</div>
              <div>Annual Declared Income: Rs. {renderBlank("annual_income", "................")}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-2 border-outline-variant/30 flex justify-between items-end">
          <div className="w-1/2 text-[7.5px] leading-tight text-secondary">
            * Declared income must match local circle rate assessments and tax declaration.
          </div>
          <div className="text-center w-1/3">
            <div className="border-t border-on-surface w-full mt-4"></div>
            <span className="text-[8px] font-bold">Declarant Signature</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-surface-variant rounded-xl p-6 shadow-[0_2px_12px_rgba(0,35,111,0.04)] w-full shrink-0 flex flex-col min-h-[460px]">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-bold tracking-tight">
            Application Progress
          </h3>
          <p className="text-secondary text-[13px] capitalize">
            {schemeName} Application
          </p>
        </div>
        <div className="text-right">
          <span className="text-primary font-bold text-lg">{progressPct}%</span>
          <p className="font-label-lg text-secondary text-[10px] uppercase tracking-wider">
            Filled
          </p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-1 bg-surface-container-low p-1 rounded-full w-full border border-outline-variant/30 mb-6 shrink-0">
        <button
          onClick={() => setViewMode("form")}
          className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
            viewMode === "form"
              ? "bg-primary text-white shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          Live Form Preview
        </button>
        <button
          onClick={() => setViewMode("checklist")}
          className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all ${
            viewMode === "checklist"
              ? "bg-primary text-white shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          Steps Checklist
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-surface-container rounded-full h-2 mb-6 overflow-hidden shrink-0">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-700 ease-out relative"
          style={{ width: `${progressPct}%` }}
        >
          <div className="absolute top-0 right-0 h-full w-4 bg-white/20 skew-x-12 animate-pulse" />
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-grow flex flex-col relative h-[360px] overflow-hidden">
        {viewMode === "form" ? (
          <div className="flex-1 w-full relative">
            {renderLiveForm()}
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
            {fields.length > 0 ? (
              <ul className="flex flex-col gap-5">
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
            ) : (
              <p className="text-body-md text-on-surface-variant text-center py-8">
                Select a scheme to begin...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
