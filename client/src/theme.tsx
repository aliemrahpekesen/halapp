import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import trTR from 'antd/locale/tr_TR';

/** Brand: cyan-600 primary ("fresh/water" for a fish market), refined neutrals. */
export const BRAND = '#0891b2';
export const BRAND_DARK = '#22d3ee';

type Mode = 'light' | 'dark';
interface Ctx { mode: Mode; toggle: () => void; brandBar: string }
const ThemeCtx = createContext<Ctx>({ mode: 'light', toggle: () => {}, brandBar: BRAND });
export const useThemeMode = () => useContext(ThemeCtx);

const KEY = 'halboxpro_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(KEY) as Mode) || 'light');

  useEffect(() => {
    localStorage.setItem(KEY, mode);
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    document.body.style.background = mode === 'dark' ? '#141414' : '#f5f7fa';
    document.body.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo<Ctx>(() => ({
    mode, toggle: () => setMode((m) => (m === 'light' ? 'dark' : 'light')),
    brandBar: mode === 'dark' ? BRAND_DARK : BRAND,
  }), [mode]);

  return (
    <ThemeCtx.Provider value={value}>
      <ConfigProvider
        locale={trTR}
        theme={{
          algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: BRAND,
            colorInfo: BRAND,
            borderRadius: 8,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontSize: 14,
            colorBgLayout: mode === 'dark' ? '#141414' : '#f5f7fa',
          },
          components: {
            Layout: { headerBg: mode === 'dark' ? '#1f1f1f' : '#ffffff', siderBg: mode === 'dark' ? '#1f1f1f' : '#ffffff' },
            Menu: { itemSelectedBg: mode === 'dark' ? 'rgba(34,211,238,0.15)' : 'rgba(8,145,178,0.10)' },
            Card: { borderRadiusLG: 12 },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeCtx.Provider>
  );
}
