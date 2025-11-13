import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeCtx = createContext();
export const useTheme = () => useContext(ThemeCtx);

export default function ThemeProvider({ children }) {
  const saved = (typeof window !== "undefined" && window.localStorage) ? window.localStorage.getItem("app-theme") : null;
  const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [theme, setTheme] = useState(saved || (prefersDark ? "dark" : "light"));

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    if (typeof window !== "undefined" && window.localStorage) window.localStorage.setItem("app-theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return <ThemeCtx.Provider value={useMemo(()=>({theme,toggle,setTheme}),[theme])}>{children}</ThemeCtx.Provider>;
}
