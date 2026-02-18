import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import pt from "./locales/pt.json";
import es from "./locales/es.json";

const STORAGE_KEY = "atlas_lang";

const savedLang = localStorage.getItem(STORAGE_KEY) ?? "pt";

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    es: { translation: es },
  },
  lng: savedLang,
  fallbackLng: "pt",
  interpolation: {
    escapeValue: false,
  },
});

// Persist language selection whenever it changes
i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
