import { createContext, useContext } from "react";

const ScreenContext = createContext(null);

export function useLocation() {
  const ctx = useContext(ScreenContext);
  if (!ctx) throw new Error("useLocation must be used within ScreenProvider");
  return ctx;
}

export function ScreenProvider({ children, value }) {
  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
}
