import { useState, useEffect } from "react";

export type CardSettings = {
  cardNumber: string;
  totalLimit: number | null;
  bankName: string;
};

const defaultSettings: CardSettings = {
  cardNumber: "•••• •••• •••• ••••",
  totalLimit: null,
  bankName: "Flipkart · Axis Bank",
};

export function useCardSettings() {
  const [settings, setSettings] = useState<CardSettings>(defaultSettings);

  useEffect(() => {
    const stored = localStorage.getItem("vault_card_settings");
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse card settings", e);
      }
    }
  }, []);

  const saveSettings = (newSettings: CardSettings) => {
    setSettings(newSettings);
    localStorage.setItem("vault_card_settings", JSON.stringify(newSettings));
  };

  return { settings, saveSettings };
}
