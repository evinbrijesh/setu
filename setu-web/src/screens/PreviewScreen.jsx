import { useState, useRef } from "react";
import { useLocation } from "../components/ScreenContext";

export default function PreviewScreen({ schemeId, schemeLabel, onProceed, onUploadAndProcess }) {
  const { setScreen } = useLocation();
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const handleProceed = () => {
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
          <div className="mt-6 border-t pt-2 border-[#e6dfd5] flex justify-between items-end">
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
          <div className="text-center border-b pb-2 border-[#e6dfd5]">
            <span className="font-bold text-[10px] tracking-wider uppercase block text-[#8a6842]">REVENUE DEPARTMENT</span>
            <span className="text-[9px] text-[#8c7457] uppercase block">APPLICATION FOR COMMUNITY STATUS</span>
            <div className="font-bold text-xs uppercase underline mt-2 text-[#8a6842]">
              FORM I: CASTE CERTIFICATE DECLARATION
            </div>
          </div>

          <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80">
            PASTE<br/>PHOTO
          </div>

          <div className="space-y-4 mt-4 pr-16">
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
      <div className="border-4 border-double border-[#8a6842] p-4 flex flex-col justify-between text-[11px] bg-[#fcfaf5] text-[#3c2f2f] h-full w-full rounded-md shadow-inner select-none overflow-y-auto relative text-left">
        <div className="text-center border-b pb-2 border-[#e6dfd5]">
          <span className="font-bold text-[10px] tracking-wider uppercase block text-[#8a6842]">REVENUE DEPARTMENT</span>
          <span className="text-[9px] text-[#8c7457] uppercase block">OFFICE OF THE TAHSILDAR</span>
          <div className="font-bold text-xs uppercase underline mt-2 text-[#8a6842]">
            INCOME STATUS DECLARATION FORM
          </div>
        </div>

        <div className="absolute top-16 right-6 border border-dashed border-[#cbbca3] w-16 h-20 flex items-center justify-center text-center text-[7px] text-[#8c7457] bg-[#fcfaf5]/80">
          PASTE<br/>PHOTO
        </div>

        <div className="space-y-4 mt-4 pr-16">
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

        <div className="mt-6 border-t pt-2 border-[#e6dfd5] flex justify-between items-end">
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
