import { ACTIVE_THEME_KEY } from "@/lib/theme/active-theme"
import { DEFAULT_THEME_ID, THEME_IDS } from "@/lib/theme/themes"

/** Inline script to set data-theme before paint (FOUC guard). */
export const themeInitScript = `(()=>{try{var k=${JSON.stringify(ACTIVE_THEME_KEY)},v=localStorage.getItem(k),o=${JSON.stringify(THEME_IDS)},d=${JSON.stringify(DEFAULT_THEME_ID)};document.documentElement.dataset.theme=v&&o.indexOf(v)!==-1?v:d}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME_ID)}}})();`
