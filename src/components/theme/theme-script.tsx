/**
 * Fija data-theme="light|dark" en <html> antes del primer pintado, según la preferencia guardada
 * ("light" | "dark" | "system"; por defecto "system"). Va en <head>; no depende de React.
 */
export const THEME_STORAGE_KEY = "crece-tema";

const SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k)||"system";var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");document.documentElement.setAttribute("data-theme-pref",p);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
