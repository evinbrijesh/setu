import { useState } from "react";
import FieldItem from "./FieldItem";

export default function ProgressPanel({ fields, schemeName, schemeId, currentFieldIndex, taskLogs = {} }) {
  const [viewMode, setViewMode] = useState("form"); // "form" | "checklist" | "engine"
  
  const total = fields.length;
  const completed = fields.filter(
    (f) => f.value !== undefined && f.value !== null
  ).length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (!schemeName) {
    return null;
  }

  // Active step details
  const activeField = fields[currentFieldIndex];

  // Helper to scan for disqualification criteria in real-time
  const getDisqualificationWarning = () => {
    if (schemeId === "pm_kisan") {
      const ownsLandField = fields.find((f) => f.name === "owns_land");
      const landSizeField = fields.find((f) => f.name === "land_size_acres");
      const bankLinkedField = fields.find((f) => f.name === "has_aadhaar_linked_bank");

      if (ownsLandField && ownsLandField.value === false) {
        return "Must own cultivable agricultural land to qualify.";
      }
      if (landSizeField && landSizeField.value !== null && Number(landSizeField.value) > 2.0) {
        return `Total agricultural land registered (${landSizeField.value} acres) exceeds the maximum limit of 2.0 acres.`;
      }
      if (bankLinkedField && bankLinkedField.value === false) {
        return "Your bank account must be linked to Aadhaar to qualify.";
      }
    } else if (schemeId === "caste_cert") {
      const incomeField = fields.find((f) => f.name === "annual_family_income");
      if (incomeField && incomeField.value !== null && Number(incomeField.value) > 800000) {
        return `Annual family income (Rs. ${Number(incomeField.value).toLocaleString()}) exceeds the Rs. 8,00,000 creamy layer limit.`;
      }
    } else if (schemeId === "income_cert") {
      const incomeField = fields.find((f) => f.name === "annual_income");
      if (incomeField && incomeField.value !== null && Number(incomeField.value) > 300000) {
        return `Annual household income (Rs. ${Number(incomeField.value).toLocaleString()}) exceeds the Rs. 3,00,000 welfare limit.`;
      }
    }
    return null;
  };

  const disqualificationWarning = getDisqualificationWarning();

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
    return <span className="text-[#a48464] font-serif">{fallbackText}</span>;
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

  const tasksList = [
    { id: "intake", name: "Task 1: Intake", icon: "login", desc: "Identifies scheme intent & initializes workflow state." },
    { id: "document_collection", name: "Task 2: Document Collection", icon: "quickref", desc: "Extracts form values from voice transcripts in real-time." },
    { id: "validation", name: "Task 3: Eligibility Rules Validation", icon: "rule", desc: "Evaluates criteria constraints and checks qualifications." },
    { id: "form_generation", name: "Task 4: Template Generation", icon: "picture_as_pdf", desc: "Compiles a verified PDF document using Jinja2 templates." },
    { id: "notify_user", name: "Task 5: User Notification", icon: "notifications_active", desc: "Dispatches the download links & triggers final confirmation." }
  ];

  // Render high-fidelity government form mockup
  const renderLiveForm = () => {
    if (schemeId === "pm_kisan") {
      return (
        <div className="border-4 border-double border-[#8a6842] p-4 flex flex-col justify-between text-[11px] bg-[#fcfaf5] text-[#3c2f2f] h-full w-full rounded-md shadow-inner select-none overflow-y-auto relative text-left">
          {/* Official Seal Watermark */}
          <span className="material-symbols-outlined text-[100px] text-[#8a6842]/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">
            account_balance
          </span>

          {/* Header */}
          <div className="text-center border-b pb-2 border-[#e6dfd5] z-10">
            <span className="font-bold text-[10px] tracking-wider uppercase block text-[#8a6842]">GOVERNMENT OF INDIA</span>
            <span className="text-[9px] text-[#8c7457] uppercase block">DEPARTMENT OF AGRICULTURE & COOPERATION</span>
            <div className="font-bold text-xs uppercase underline mt-2 text-[#8a6842]">
              PM-KISAN NEW FARMER REGISTRATION FORM
            </div>
          </div>

          {/* Photo Affix */}
          <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80 z-10">
            PASTE<br/>PHOTO
          </div>

          {/* Form Content */}
          <div className="space-y-4 mt-4 pr-16 z-10">
            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
                Section I — Farmer Profile
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>Name of Farmer: {renderBlank("full_name")}</div>
                <div>Category: <span className="font-semibold">General / OBC</span></div>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
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
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
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
          <div className="mt-6 border-t pt-2 border-[#e6dfd5] flex justify-between items-end z-10">
            <div className="w-1/2 text-[7.5px] leading-tight text-[#8c7457]">
              * Verification checklist is evaluated automatically in real-time. Disqualification criteria checks apply.
            </div>
            <div className="text-center w-1/3">
              <div className="border-t border-[#3c2f2f] w-full mt-4"></div>
              <span className="text-[8px] font-bold">Farmer Signature</span>
            </div>
          </div>
        </div>
      );
    }

    if (schemeId === "caste_cert") {
      return (
        <div className="border-4 border-double border-[#8a6842] p-4 flex flex-col justify-between text-[11px] bg-[#fcfaf5] text-[#3c2f2f] h-full w-full rounded-md shadow-inner select-none overflow-y-auto relative text-left">
          {/* Official Seal Watermark */}
          <span className="material-symbols-outlined text-[100px] text-[#8a6842]/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">
            account_balance
          </span>

          <div className="text-center border-b pb-2 border-[#e6dfd5] z-10">
            <span className="font-bold text-[10px] tracking-wider uppercase block text-[#8a6842]">REVENUE DEPARTMENT</span>
            <span className="text-[9px] text-[#8c7457] uppercase block">APPLICATION FOR COMMUNITY STATUS</span>
            <div className="font-bold text-xs uppercase underline mt-2 text-[#8a6842]">
              FORM I: CASTE CERTIFICATE DECLARATION
            </div>
          </div>

          {/* Photo Affix */}
          <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80 z-10">
            PASTE<br/>PHOTO
          </div>

          <div className="space-y-4 mt-4 pr-16 z-10">
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

          <div className="mt-6 border-t pt-2 border-[#e6dfd5] flex justify-between items-end z-10">
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
      <div className="border-4 border-double border-[#8a6842] p-4 flex flex-col justify-between text-[11px] bg-[#fcfaf5] text-[#3c2f2f] h-full w-full rounded-md shadow-inner select-none overflow-y-auto relative text-left">
        {/* Official Seal Watermark */}
        <span className="material-symbols-outlined text-[100px] text-[#8a6842]/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">
          account_balance
        </span>

        <div className="text-center border-b pb-2 border-[#e6dfd5] z-10">
          <span className="font-bold text-[10px] tracking-wider uppercase block text-[#8a6842]">REVENUE DEPARTMENT</span>
          <span className="text-[9px] text-[#8c7457] uppercase block">OFFICE OF THE TAHSILDAR</span>
          <div className="font-bold text-xs uppercase underline mt-2 text-[#8a6842]">
            INCOME STATUS DECLARATION FORM
          </div>
        </div>

        {/* Photo Affix */}
        <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80 z-10">
          PASTE<br/>PHOTO
        </div>

        <div className="space-y-4 mt-4 pr-16 z-10">
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
            <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
              Section II — Occupation & Earnings
            </span>
            <div className="grid grid-cols-1 gap-2 pl-2">
              <div>Primary Occupation: {renderBlank("occupation")}</div>
              <div>Annual Declared Income: Rs. {renderBlank("annual_income", "................")}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-2 border-[#e6dfd5] flex justify-between items-end z-10">
          <div className="w-1/2 text-[7.5px] leading-tight text-[#8c7457]">
            * Declared income must match local circle rate assessments and tax declaration.
          </div>
          <div className="text-center w-1/3">
            <div className="border-t border-[#3c2f2f] w-full mt-4"></div>
            <span className="text-[8px] font-bold">Declarant Signature</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-surface-variant rounded-xl p-6 shadow-[0_2px_12px_rgba(0,35,111,0.04)] w-full shrink-0 flex flex-col min-h-[580px]">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-4 shrink-0">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
            Application Progress
          </h3>
          <span className="text-xs text-secondary tracking-wide block mt-0.5">
            {schemeName} Application
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="block font-headline-md text-headline-md text-primary font-extrabold tracking-tight">
            {progressPct}%
          </span>
          <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block mt-0.5">
            FILLED
          </span>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-surface-container-high rounded-full p-1.5 flex gap-1 mb-5 shrink-0 border border-surface-variant/30">
        <button
          onClick={() => setViewMode("form")}
          className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all ${
            viewMode === "form"
              ? "bg-primary text-white shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          Form Preview
        </button>
        <button
          onClick={() => setViewMode("checklist")}
          className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all ${
            viewMode === "checklist"
              ? "bg-primary text-white shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          Checklist
        </button>
        <button
          onClick={() => setViewMode("engine")}
          className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all ${
            viewMode === "engine"
              ? "bg-primary text-white shadow-sm"
              : "text-secondary hover:text-primary"
          }`}
        >
          Workflow Engine
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
      <div className="flex-grow flex flex-col relative min-h-[480px] overflow-hidden">
        {/* Active Step Criteria (Only show when not in engine mode) */}
        {viewMode !== "engine" && activeField && activeField.criteria && (
          <div className="bg-[#fffbeb] border border-[#fef3c7] p-3 rounded-xl text-left shadow-sm flex items-start gap-2.5 mb-4 shrink-0">
            <span className="material-symbols-outlined text-[#d97706] text-[18px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              info_i
            </span>
            <div>
              <h5 className="font-bold text-[9px] text-[#b45309] uppercase tracking-wider">Rule for current step</h5>
              <p className="text-[11px] text-[#92400e] mt-0.5 leading-relaxed font-semibold">
                {activeField.criteria}
              </p>
            </div>
          </div>
        )}

        {/* Disqualification Warning (Only show when not in engine mode) */}
        {viewMode !== "engine" && disqualificationWarning && (
          <div className="bg-[#fef2f2] border border-[#fee2e2] p-3 rounded-xl text-left shadow-sm flex items-start gap-2.5 mb-4 shrink-0">
            <span className="material-symbols-outlined text-[#dc2626] text-[18px] shrink-0 mt-0.5 animate-bounce" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <div>
              <h5 className="font-bold text-[9px] text-[#991b1b] uppercase tracking-wider">Disqualification detected</h5>
              <p className="text-[11px] text-[#7f1d1d] mt-0.5 leading-relaxed font-bold">
                {disqualificationWarning} You can state a correction (e.g. "I mean 1.5 acres") to update the form.
              </p>
            </div>
          </div>
        )}

        {viewMode === "form" && (
          <div className="flex-1 w-full relative">
            {renderLiveForm()}
          </div>
        )}

        {viewMode === "checklist" && (
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

        {viewMode === "engine" && (
          <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar text-left pb-6 select-text">
            <div className="bg-[#f0f4f9] border border-blue-100 rounded-xl p-3.5 mb-5 flex gap-2">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5 animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
                settings_breathe
              </span>
              <div>
                <h4 className="font-bold text-xs text-primary">Render Workflows Live Engine</h4>
                <p className="text-[10px] text-secondary mt-0.5 leading-relaxed">
                  This panel reports real-time logs, runtime state, and task inputs/outputs to satisfy hackathon scoring criteria.
                </p>
              </div>
            </div>

            <div className="relative border-l-2 border-primary/20 pl-4 ml-3.5 space-y-6 mt-4">
              {tasksList.map((task) => {
                const log = taskLogs[task.id];
                const status = log ? log.status : "PENDING";
                const time = log ? new Date(log.updated_at).toLocaleTimeString() : null;
                
                // Style mappings based on status
                let bulletColor = "bg-[#f8f9ff] border-primary/30";
                let textColor = "text-on-surface/40";
                let badgeStyle = "bg-surface-container text-on-surface-variant/70 border border-surface-variant/40";
                
                if (status === "RUNNING") {
                  bulletColor = "bg-[#d97706] border-[#fef3c7] animate-pulse scale-110";
                  textColor = "text-[#d97706] font-bold";
                  badgeStyle = "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]";
                } else if (status === "SUCCESS") {
                  bulletColor = "bg-[#16a34a] border-[#dcfce7] scale-110";
                  textColor = "text-on-surface font-semibold";
                  badgeStyle = "bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]";
                } else if (status === "FAILED") {
                  bulletColor = "bg-[#dc2626] border-[#fee2e2] scale-110";
                  textColor = "text-[#dc2626] font-bold";
                  badgeStyle = "bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]";
                }
                
                return (
                  <div key={task.id} className="relative">
                    {/* Timeline Node Icon/Dot */}
                    <div className={`absolute -left-[23.5px] top-1.5 w-3.5 h-3.5 rounded-full border-2 ${bulletColor} z-10 shadow-sm transition-all duration-300`} />
                    
                    {/* Task Title & Status */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className={`text-[12px] font-bold ${textColor} flex items-center gap-1.5`}>
                          <span className="material-symbols-outlined text-[15px]">{task.icon}</span>
                          {task.name}
                        </h4>
                        <p className="text-[10px] text-secondary mt-0.5">{task.desc}</p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${badgeStyle}`}>
                        {status}
                      </span>
                    </div>
                    
                    {/* Time & Payload */}
                    {log && (
                      <div className="mt-2.5 ml-1 bg-[#fafafc] border border-surface-variant/40 rounded-lg p-2.5 text-[9px] shadow-sm select-text">
                        <div className="flex justify-between text-[8px] text-secondary border-b border-surface-variant/20 pb-1.5 mb-2 uppercase font-bold tracking-wider">
                          <span>Execution Timestamp</span>
                          <span>{time}</span>
                        </div>
                        
                        {/* Input Args */}
                        {log.input && Object.keys(log.input).length > 0 && (
                          <div className="mb-2">
                            <span className="block font-bold text-secondary uppercase text-[7px] tracking-wide mb-0.5">Input Arguments:</span>
                            <pre className="bg-[#1e1e24] text-[#a9b1d6] p-1.5 rounded text-[8px] font-mono overflow-x-auto max-w-full leading-tight">
                              {JSON.stringify(log.input, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {/* Output Args */}
                        {log.output && Object.keys(log.output).length > 0 && (
                          <div className="mb-2">
                            <span className="block font-bold text-secondary uppercase text-[7px] tracking-wide mb-0.5">Output Data:</span>
                            <pre className="bg-[#1e1e24] text-[#a9b1d6] p-1.5 rounded text-[8px] font-mono overflow-x-auto max-w-full leading-tight">
                              {JSON.stringify(log.output, null, 2)}
                            </pre>
                          </div>
                        )}
                        
                        {/* Error detail */}
                        {log.error && (
                          <div className="mt-1.5 bg-red-50 text-[#dc2626] p-2 rounded border border-red-100 leading-normal">
                            <span className="font-bold text-[7.5px] block uppercase mb-0.5">Error details:</span>
                            <span className="font-mono text-[8px] font-semibold">{log.error}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
