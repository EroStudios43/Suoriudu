import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Haetaan tallennettu teema tai käytetään oletuksena tummaa ("dark")
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("app_theme") || "dark";
  });

  useEffect(() => {
    // Tallennettaan teema localStorageen
    localStorage.setItem("app_theme", theme);
    
    // Päivitetään luokka document.bodyyn, jotta CSS-muuttujat toimivat kaikilla sivuilla
    document.body.className = theme === "dark" ? "dark" : "light";
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);