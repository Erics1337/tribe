import { useEffect } from 'react';
import { colors } from './ui';
export function useBrowserStyles() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html { background: ${colors.bg}; scrollbar-color: #9aafa3 ${colors.bg}; scrollbar-width: thin; }
      ::selection { background: ${colors.green}; color: white; }
      input, textarea { caret-color: ${colors.green}; }
      :focus-visible { outline: 2px solid ${colors.focus}; outline-offset: 3px; }
      input:focus-visible, textarea:focus-visible { outline: none; }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; } }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
}
