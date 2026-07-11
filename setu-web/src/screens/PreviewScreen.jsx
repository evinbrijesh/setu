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

  // Render blank form mockup based on scheme type
  const renderBlankFormMockup = () => {
    if (schemeId === "pm_kisan") {
      return (
        <div className="flex flex-col gap-6 text-on-surface/80">
          <div className="text-center border-b pb-4 border-outline-variant/50">
            <span className="material-symbols-outlined text-4xl text-primary mb-1">agriculture</span>
            <h4 className="font-bold text-lg text-primary">PM Kisan Samman Nidhi</h4>
            <span className="text-xs text-secondary tracking-widest uppercase">Application Form</span>
          </div>
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-semibold text-secondary uppercase">1. Beneficiary Information</span>
              <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-full"></div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-secondary uppercase">2. Landholding Details</span>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <div className="h-6 bg-surface-container rounded opacity-50"></div>
                <div className="h-6 bg-surface-container rounded opacity-50"></div>
              </div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-secondary uppercase">3. Banking & Aadhaar</span>
              <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-3/4"></div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-secondary uppercase">4. District Registry</span>
              <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-1/2"></div>
            </div>
          </div>
          <div className="mt-8 border-t pt-4 border-outline-variant/30 text-center text-[10px] text-secondary">
            GOVERNMENT OF INDIA • DEPARTMENT OF AGRICULTURE & FARMERS WELFARE
          </div>
        </div>
      );
    }

    if (schemeId === "caste_cert") {
      return (
        <div className="flex flex-col gap-6 text-on-surface/80">
          <div className="text-center border-b pb-4 border-outline-variant/50">
            <span className="material-symbols-outlined text-4xl text-primary mb-1">description</span>
            <h4 className="font-bold text-lg text-primary">Caste Certificate</h4>
            <span className="text-xs text-secondary tracking-widest uppercase">Declaration Form</span>
          </div>
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-semibold text-secondary uppercase">1. Personal Information</span>
              <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-full"></div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-secondary uppercase">2. State of Residence</span>
              <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-2/3"></div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-secondary uppercase">3. Caste Category & Sub-caste</span>
              <div className="grid grid-cols-2 gap-4 mt-1">
                <div className="h-6 bg-surface-container rounded opacity-50"></div>
                <div className="h-6 bg-surface-container rounded opacity-50"></div>
              </div>
            </div>
            <div>
              <span className="block text-xs font-semibold text-secondary uppercase">4. Annual Household Income</span>
              <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-1/2"></div>
            </div>
          </div>
          <div className="mt-8 border-t pt-4 border-outline-variant/30 text-center text-[10px] text-secondary">
            REVENUE DEPARTMENT • OFFICIAL CITIZENSHIP CERTIFICATION
          </div>
        </div>
      );
    }

    // Default: Income Certificate
    return (
      <div className="flex flex-col gap-6 text-on-surface/80">
        <div className="text-center border-b pb-4 border-outline-variant/50">
          <span className="material-symbols-outlined text-4xl text-primary mb-1">account_balance_wallet</span>
          <h4 className="font-bold text-lg text-primary">Income Certificate</h4>
          <span className="text-xs text-secondary tracking-widest uppercase">Income Declaration</span>
        </div>
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-semibold text-secondary uppercase">1. Declarant Full Name</span>
            <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-full"></div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-secondary uppercase">2. District & Location</span>
            <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-3/4"></div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-secondary uppercase">3. Primary Occupation / Profession</span>
            <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-full"></div>
          </div>
          <div>
            <span className="block text-xs font-semibold text-secondary uppercase">4. Total Annual Household Earnings</span>
            <div className="h-6 bg-surface-container rounded mt-1 opacity-50 w-1/2"></div>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 border-outline-variant/30 text-center text-[10px] text-secondary">
          STATE REVENUE DEPARTMENT • TAXATION & WELFARE ASSESSMENT
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
            {/* Pulsing circular glow effects */}
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
        <div className="w-full max-w-sm mx-auto aspect-[1/1.3] bg-white border-2 border-dashed border-outline-variant/60 rounded-xl p-8 shadow-sm flex flex-col justify-between relative select-none hover:border-primary/50 transition-colors">
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
