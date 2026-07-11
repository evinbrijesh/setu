import { useState } from "react";
import { useLocation } from "../components/ScreenContext";

const SERVICE_CATEGORIES = [
  {
    id: "personal",
    title: "Personal Documents",
    description: "Access and apply for essential identification and certificates issued by state authorities.",
    icon: "person_outline",
    bgClass: "bg-primary-fixed text-on-primary-fixed",
    services: [
      { id: "caste_cert", label: "Caste Certificate", desc: "Category verification", supported: true },
      { id: "income_cert", label: "Income Certificate", desc: "Revenue department", supported: true },
      { id: "birth_cert", label: "Birth Certificate", desc: "Municipal records", supported: false },
    ],
  },
  {
    id: "welfare",
    title: "Welfare Schemes",
    description: "Find and register for government support and direct benefit schemes.",
    icon: "volunteer_activism",
    bgClass: "bg-tertiary-fixed text-on-tertiary-fixed",
    services: [
      { id: "pm_kisan", label: "PM Kisan", desc: "Income support for farmers", supported: true, badge: "Active" },
      { id: "ayushman", label: "Ayushman Bharat", desc: "Health protection mission", supported: false },
    ],
  },
  {
    id: "agriculture",
    title: "Agricultural Services",
    description: "Explore farm support services, irrigation resources, and soil health programs.",
    icon: "agriculture",
    bgClass: "bg-secondary-fixed text-on-secondary-fixed",
    services: [
      { id: "soil", label: "Soil Testing", desc: "Soil health card registry", supported: false },
      { id: "irrigation", label: "Irrigation Support", desc: "Water resource allocation", supported: false },
    ],
  },
];

export default function ServicesScreen({ onStartChat }) {
  const { setScreen } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState("");

  const handleServiceClick = (service) => {
    if (service.supported) {
      onStartChat?.(service.id, service.label);
      setScreen("chat");
    } else {
      setNotification(`"${service.label}" is planned for Phase 7 of Setu and will be available soon!`);
      setTimeout(() => setNotification(""), 4000);
    }
  };

  // Filter services by search query
  const filteredCategories = SERVICE_CATEGORIES.map((cat) => {
    const services = cat.services.filter((s) =>
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...cat, services };
  }).filter((cat) => cat.services.length > 0);

  return (
    <main className="flex-grow w-full max-w-[1280px] mx-auto px-container-padding md:px-section-margin py-stack-gap">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-tertiary-fixed">info</span>
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header Section */}
      <section className="mb-stack-gap">
        <h2 className="font-headline-xl text-headline-xl text-on-surface mb-2">
          Service Directory
        </h2>
        <p className="text-on-surface-variant font-body-lg text-body-lg max-w-2xl mb-8">
          Empowering citizens with seamless access to government documents, welfare schemes, and essential public resources.
        </p>
        <div className="relative max-w-2xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 rounded-lg border-2 border-surface-variant focus:border-primary focus:ring-0 bg-surface-container-low transition-all"
            placeholder="Search for a service (e.g. Caste Certificate)"
          />
        </div>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {filteredCategories.map((cat, idx) => {
          // Adjust span size dynamically to create an asymmetric bento grid
          // Category 1: span 8 (large), Category 2: span 6 (medium), Category 3: span 6 (medium)
          let colSpan = "col-span-12 md:col-span-6";
          if (idx === 0) colSpan = "col-span-12 md:col-span-8";

          return (
            <div
              key={cat.id}
              className={`glass-card p-stack-gap rounded-lg hover:shadow-lg transition-shadow group flex flex-col justify-between ${colSpan}`}
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${cat.bgClass}`}>
                      <span className="material-symbols-outlined">{cat.icon}</span>
                    </div>
                    <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-semibold">
                      {cat.title}
                    </h3>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">
                    arrow_forward_ios
                  </span>
                </div>
                <p className="text-on-surface-variant mb-6 text-body-md max-w-lg">
                  {cat.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cat.services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceClick(service)}
                    className="flex flex-col p-4 bg-surface-container-low rounded-lg border border-transparent hover:border-primary hover:shadow-sm text-left transition-all justify-between h-24"
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="font-label-lg text-label-lg text-primary font-semibold">
                        {service.label}
                      </span>
                      {service.badge && (
                        <span className="bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          {service.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-on-surface-variant text-xs mt-1 line-clamp-2">
                      {service.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Dynamic Verified Trust Card - Bento Fill */}
        {filteredCategories.length > 0 && (
          <div className="col-span-12 md:col-span-4 relative rounded-lg overflow-hidden bg-primary shadow-inner min-h-[250px] flex items-center justify-center text-center p-gutter">
            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary to-tertiary"></div>
            <div className="relative z-10 text-white p-4">
              <span className="material-symbols-outlined text-4xl mb-4 text-tertiary-fixed">
                verified_user
              </span>
              <h4 className="font-label-lg text-label-lg mb-2 text-white">Trust Verified</h4>
              <p className="text-sm opacity-80 max-w-[250px] mx-auto">
                All services on Setu are directly integrated with official government databases.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Landscape Help Card */}
      <section className="mt-section-margin max-w-4xl mx-auto">
        <div className="bg-surface-container-highest rounded-lg p-container-padding flex flex-col md:flex-row items-center gap-stack-gap shadow-sm">
          <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden relative shadow-sm shrink-0 bg-surface-variant flex items-center justify-center">
            {/* Minimalist administrative vector mockup */}
            <span className="material-symbols-outlined text-6xl text-primary opacity-40">gavel</span>
          </div>
          <div className="flex-grow">
            <h4 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2">
              Need assistance?
            </h4>
            <p className="text-on-surface-variant mb-6 text-body-md">
              Our voice assistant Setu is here to guide you through any application process in your native language.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  onStartChat?.("pm_kisan", "PM Kisan");
                  setScreen("chat");
                }}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-label-lg text-label-lg active:scale-95 transition-all shadow-md hover:bg-primary-container"
              >
                <span className="material-symbols-outlined">mic</span>
                Talk to Setu
              </button>
              <button
                onClick={() => {
                  setNotification("Video tutorials are planned for Phase 8.");
                  setTimeout(() => setNotification(""), 3000);
                }}
                className="px-6 py-3 border border-outline text-on-surface rounded-full font-label-lg text-label-lg hover:bg-surface-container-low transition-colors"
              >
                View Tutorials
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
