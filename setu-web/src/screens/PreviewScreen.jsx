import { useState, useRef, useEffect } from "react";
import { useLocation } from "../components/ScreenContext";

export default function PreviewScreen({ schemeId, schemeLabel, onProceed, onStartFresh, onUploadAndProcess }) {
  const { setScreen } = useLocation();
  const [analyzing, setAnalyzing] = useState(false);
  const [draftInstance, setDraftInstance] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const userId = localStorage.getItem("setu_user_id");
    if (!userId) return;

    // Check if there is an in-progress draft for this user and scheme
    import("../lib/supabase.js")
      .then(({ supabase }) => {
        supabase
          .table("workflow_instances")
          .select("id, created_at")
          .eq("user_id", userId)
          .eq("scheme_id", schemeId)
          .eq("status", "in_progress")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data, error }) => {
            if (data && !error) {
              setDraftInstance(data);
            } else {
              setDraftInstance(null);
            }
          });
      })
      .catch(() => {});
  }, [schemeId]);

  const handleProceed = () => {
    // If browser doesn't support mic in this context, warn the user
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(
        "Microphone access requires a secure context (HTTPS) or localhost. Please check your browser address bar or use text input."
      );
    }
    onProceed?.();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    // Simulate OCR and document parsing progress (2.5 seconds)
    setTimeout(() => {
      setAnalyzing(false);
      onUploadAndProcess?.(file);
    }, 2500);
  };

  // Render blank high-fidelity form mockup based on scheme type
  const renderBlankFormMockup = () => {
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
                <div>Name of Farmer: <span className="text-[#a48464] font-serif">........................................</span></div>
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
                  <span className="inline-block w-4 h-4 border border-[#cbbca3] text-center rounded"></span> Yes &nbsp;&nbsp;&nbsp;
                  <span className="inline-block w-4 h-4 border border-[#cbbca3] text-center rounded"></span> No
                </div>
                <div>Area of Land Owned: <span className="text-[#a48464] font-serif">..........</span> Acres</div>
                <div>District Register: <span className="text-[#a48464] font-serif">........................</span></div>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
                Section III — Bank & Aadhaar Verification
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div className="flex items-center">
                  Aadhaar Linked Bank Account: &nbsp;&nbsp;
                  <span className="inline-block w-4 h-4 border border-[#cbbca3] text-center rounded"></span> Yes &nbsp;&nbsp;&nbsp;
                  <span className="inline-block w-4 h-4 border border-[#cbbca3] text-center rounded"></span> No
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

          <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80 z-10">
            PASTE<br/>PHOTO
          </div>

          <div className="space-y-4 mt-4 pr-16 z-10">
            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
                Section I — Applicant Profile
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>Name of Applicant: <span className="text-[#a48464] font-serif">........................................</span></div>
                <div>State of Residence: <span className="text-[#a48464] font-serif">................................</span></div>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
                Section II — Caste Details
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>Caste Category (SC/ST/OBC): <span className="text-[#a48464] font-serif">................</span></div>
                <div>Sub-Caste Name: <span className="text-[#a48464] font-serif">................................</span></div>
              </div>
            </div>

            <div>
              <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
                Section III — Income Exclusions
              </span>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>Annual Household Income: Rs. <span className="text-[#a48464] font-serif">................</span></div>
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

        <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80 z-10">
          PASTE<br/>PHOTO
        </div>

        <div className="space-y-4 mt-4 pr-16 z-10">
          <div>
            <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
              Section I — Declarant Details
            </span>
            <div className="grid grid-cols-1 gap-2 pl-2">
              <div>Name of Declarant: <span className="text-[#a48464] font-serif">........................................</span></div>
              <div>District Location: <span className="text-[#a48464] font-serif">................................</span></div>
            </div>
          </div>

          <div>
            <span className="font-bold uppercase tracking-tight block text-[#8c7457] text-[9px] mb-1">
              Section II — Occupation & Earnings
            </span>
            <div className="grid grid-cols-1 gap-2 pl-2">
              <div>Primary Occupation: <span className="text-[#a48464] font-serif">........................................</span></div>
              <div>Annual Declared Income: Rs. <span className="text-[#a48464] font-serif">................</span></div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-2 border-[#e6dfd5] flex justify-between items-end z-10">
          <div className="w-1/2 text-[7.5px] leading-tight text-[#8c7457]">
            * Declared income is verified against state income tax registries and land holdings.
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
    <main className="flex-grow flex flex-col items-center justify-center px-container-padding max-w-[1200px] mx-auto w-full py-8 relative">
      {/* Fullscreen Analyzing Overlay */}
      {analyzing && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-md z-50 flex flex-col items-center justify-center transition-all duration-300">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute w-24 h-24 rounded-full bg-primary/10 animate-ping"></div>
            <div className="absolute w-16 h-16 rounded-full bg-primary/20 animate-pulse"></div>
            <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin z-10"></div>
            <span className="material-symbols-outlined text-primary text-3xl absolute z-10" style={{ fontVariationSettings: "'FILL' 1" }}>
              quick_reference_all
            </span>
          </div>
          <h3 className="text-xl font-bold text-primary animate-pulse">Analyzing Document</h3>
          <p className="text-sm text-secondary mt-2 max-w-xs text-center leading-relaxed">
            Setu OCR AI is processing your document structure and pre-populating fields...
          </p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />

      <div className="w-full max-w-xl text-center space-y-6">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
            Confirm Application Type
          </h2>
          <p className="text-secondary text-sm mt-1">
            Review the application template below before starting your submission.
          </p>
        </div>

        {/* Draft Option Warning Card */}
        {draftInstance && (
          <div className="bg-[#eaf5fc] dark:bg-[#1a2c3a] border border-[#a4cbe6] dark:border-[#2b4c64] p-4.5 rounded-2xl text-left max-w-sm mx-auto shadow-sm flex items-start gap-3.5 transition-all">
            <span className="material-symbols-outlined text-primary text-[28px] shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              info_i
            </span>
            <div className="flex-grow">
              <h4 className="font-bold text-sm text-primary">Draft Application Found</h4>
              <p className="text-xs text-secondary mt-1 leading-relaxed">
                You have a draft application in progress for this service. Would you like to resume your draft or start fresh?
              </p>
              <div className="flex gap-2.5 mt-3">
                <button
                  onClick={() => onProceed?.(draftInstance.id)}
                  className="bg-primary hover:bg-primary-container text-white text-xs font-semibold px-4.5 py-2.5 rounded-full transition-colors active:scale-95 shadow-md flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                  Resume Draft
                </button>
                <button
                  onClick={onStartFresh}
                  className="border border-outline hover:bg-surface-container-low text-on-surface text-xs font-semibold px-4.5 py-2.5 rounded-full transition-all active:scale-95"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="w-full max-w-sm mx-auto aspect-[1/1.3] bg-white border border-[#e6dfd5] rounded-xl p-4 shadow-md flex flex-col justify-between relative select-none hover:border-primary/50 transition-colors">
          {renderBlankFormMockup()}
        </div>

        {/* Action Button layout */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full pt-4">
          <button
            onClick={handleProceed}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white font-semibold font-label-lg px-8 py-4 rounded-full hover:bg-primary-container transition-colors active:scale-95 shadow-md"
          >
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            Proceed with Voice Application
          </button>
          <button
            onClick={handleUploadClick}
            className="w-full sm:w-auto flex items-center justify-center gap-2 border border-outline hover:border-primary text-on-surface font-semibold font-label-lg px-8 py-4 rounded-full hover:bg-surface-container-low transition-all"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Upload Existing Certificate
          </button>
        </div>

        <button
          onClick={() => setScreen("welcome")}
          className="text-sm text-secondary hover:text-primary transition-colors flex items-center gap-1 mx-auto"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Home
        </button>
      </div>
    </main>
  );
}
