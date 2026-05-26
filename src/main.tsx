import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './components/AuthProvider';
import { setupAlertPolyfill } from './lib/alert-polyfill';
import { ErrorBoundary } from './components/ErrorBoundary';

setupAlertPolyfill();


// PWA: Capture install prompt and show install banner
var deferredInstallPrompt: any = null;

function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  var banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.setAttribute('style', [
    'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:99999',
    'background:#18181b', 'color:#fff', 'padding:14px 16px',
    'display:flex', 'align-items:center', 'justify-content:space-between',
    'gap:12px', 'border-top:3px solid #52525b', 'font-family:sans-serif',
    'box-shadow:0 -4px 20px rgba(0,0,0,0.5)'
  ].join(';'));
  banner.innerHTML = [
    '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">',
    '<span style="font-size:26px;flex-shrink:0">📱</span>',
    '<div style="min-width:0">',
    '<div style="font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.5px">Install Mondal Coaching</div>',
    '<div style="font-size:11px;color:#a1a1aa;margin-top:2px">Add to home screen for instant access</div>',
    '</div></div>',
    '<div style="display:flex;gap:8px;flex-shrink:0">',
    '<button id="pwa-install-btn" style="background:#fff;color:#18181b;border:2px solid #fff;font-weight:900;font-size:12px;text-transform:uppercase;padding:8px 16px;cursor:pointer">Install</button>',
    '<button id="pwa-dismiss-btn" style="background:transparent;color:#a1a1aa;border:2px solid #52525b;font-size:12px;padding:8px 10px;cursor:pointer">x</button>',
    '</div>'
  ].join('');
  document.body.appendChild(banner);

  var installBtn = document.getElementById('pwa-install-btn');
  var dismissBtn = document.getElementById('pwa-dismiss-btn');
  if (installBtn) {
    installBtn.addEventListener('click', function() {
      banner.remove();
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(function(result: any) {
          console.log('[PWA] Install outcome:', result.outcome);
          deferredInstallPrompt = null;
        });
      }
    });
  }
  if (dismissBtn) {
    dismissBtn.addEventListener('click', function() {
      banner.remove();
      try { sessionStorage.setItem('pwa-banner-dismissed', '1'); } catch(_) {}
    });
  }
}

window.addEventListener('beforeinstallprompt', function(e: any) {
  e.preventDefault();
  deferredInstallPrompt = e;
  try { if (sessionStorage.getItem('pwa-banner-dismissed')) return; } catch(_) {}
  setTimeout(showInstallBanner, 3000);
});

window.addEventListener('appinstalled', function() {
  console.log('[PWA] App installed!');
  var b = document.getElementById('pwa-install-banner');
  if (b) b.remove();
  deferredInstallPrompt = null;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="tuition-theme">
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

