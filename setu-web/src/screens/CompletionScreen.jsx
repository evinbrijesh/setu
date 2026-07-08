import { useLocation } from "../components/ScreenContext";
import { useState } from "react";

export default function CompletionScreen({
  schemeName,
  beneficiaryName,
  pdfDownloadUrl,
  onStartNew,
}) {
  const { setScreen } = useLocation();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    if (pdfDownloadUrl) {
      setDownloading(true);
      // Open the signed URL in a new tab
      window.open(pdfDownloadUrl, "_blank");
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  const handleStartNew = () => {
    onStartNew?.();
    setScreen("welcome");
  };

  return (
    <main className="w-full max-w-[1440px] px-container-padding mx-auto flex-grow flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 pt-8 md:pt-0 pb-16 lg:pb-0">
      {/* Left: Hero */}
      <div className="flex flex-col items-center lg:items-start text-center lg:text-left flex-1 max-w-[600px]">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary-container flex items-center justify-center mb-6 shadow-sm">
          <span
            className="material-symbols-outlined text-on-primary-container text-[48px] md:text-[64px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <h1 className="text-headline-lg-mobile md:text-headline-xl text-primary mb-4">
          Your application is ready
        </h1>
        <p className="text-body-md md:text-body-lg text-on-surface-variant max-w-lg lg:max-w-md">
          We have generated the required forms based on the information provided.
        </p>
      </div>

      {/* Right: Summary Card + Actions */}
      <div className="flex flex-col items-center w-full flex-1 max-w-[720px]">
        {/* Summary Card */}
        <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-10 mb-8 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start pb-6 border-b border-surface-variant">
              <div>
                <p className="text-label-lg text-secondary mb-2">Scheme</p>
                <p className="text-body-lg md:text-[24px] md:leading-[32px] text-on-background font-semibold">
                  {schemeName || "PM Kisan Samman Nidhi"}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-start pb-6 border-b border-surface-variant">
              <div>
                <p className="text-label-lg text-secondary mb-2">Beneficiary</p>
                <p className="text-body-lg md:text-[24px] md:leading-[32px] text-on-background">
                  {beneficiaryName || "Applicant"}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-tertiary-container md:text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  task_alt
                </span>
                <p className="text-body-md md:text-body-lg text-on-background font-medium">
                  Ready to download
                </p>
              </div>
              <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-lg md:text-[16px] px-4 py-2 rounded-full">
                Complete
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-8">
          <button
            onClick={handleDownload}
            disabled={!pdfDownloadUrl || downloading}
            className="w-full md:w-auto bg-primary text-on-primary text-label-lg md:text-[16px] py-4 md:py-4 px-8 rounded-full shadow-sm hover:bg-primary-container transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">download</span>
            {downloading ? "Opening..." : "Download your form"}
          </button>
          <button
            onClick={handleStartNew}
            className="w-full md:w-auto bg-transparent text-primary border-2 border-primary md:border-transparent text-label-lg md:text-[16px] py-4 px-8 rounded-full hover:bg-surface-container hover:border-transparent transition-all"
          >
            Start another application
          </button>
        </div>

        {/* Footer Instructions */}
        <div className="w-full bg-surface-container-low rounded-xl p-6 md:p-8 text-center">
          <p className="text-body-md md:text-body-lg text-on-surface-variant flex flex-col md:flex-row items-center justify-center gap-3">
            <span
              className="material-symbols-outlined text-secondary md:text-[28px]"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              info
            </span>
            Take this printed form to your nearest Block Development Office.
          </p>
        </div>
      </div>
    </main>
  );
}
