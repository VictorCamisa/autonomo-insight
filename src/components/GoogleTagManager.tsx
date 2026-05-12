import { useEffect } from 'react';
import { useSiteSetting } from '@/hooks/useSiteSettings';

const SCRIPT_ID = 'gtm-script';
const NOSCRIPT_ID = 'gtm-noscript';

function injectGTM(id: string) {
  if (document.getElementById(SCRIPT_ID)) return;

  // dataLayer init
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).dataLayer = (window as any).dataLayer || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${id}`;
  document.head.appendChild(script);

  const noscript = document.createElement('noscript');
  noscript.id = NOSCRIPT_ID;
  noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
  document.body.insertBefore(noscript, document.body.firstChild);
}

function removeGTM() {
  document.getElementById(SCRIPT_ID)?.remove();
  document.getElementById(NOSCRIPT_ID)?.remove();
}

export function GoogleTagManager() {
  const { data: gtmId } = useSiteSetting('gtm_id');

  useEffect(() => {
    const id = (gtmId || '').trim();
    if (id) {
      injectGTM(id);
    }
    // Não remover ao desmontar — GTM permanece carregado durante a sessão.
    // Mudanças de ID exigem reload (avisado na UI).
  }, [gtmId]);

  return null;
}

export { removeGTM };
