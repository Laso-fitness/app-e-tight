(() => {
 let pending;
 const buttons = [...document.querySelectorAll('[data-install-app]')];
 const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
 const refresh = () => buttons.forEach(b => b.hidden = installed());
 const dialog = document.createElement('dialog');
 dialog.id = 'installAppDialog'; dialog.setAttribute('aria-labelledby','installAppTitle');
 dialog.innerHTML = `<img src="/pilot/laso-icon-v2-180.png" alt="LasO 360"><h2 id="installAppTitle">App-E-Tight on your Home Screen</h2><div id="installAppInstructions"></div><p>Your existing account and journal stay the same. Internet is required. You may need to sign in the first time you open the installed app.</p><button type="button" id="closeInstallApp">Close</button>`;
 document.body.append(dialog);
 dialog.querySelector('#closeInstallApp').onclick = () => dialog.close();
 async function install() {
  if(pending) { const prompt = pending; pending = null; try { await prompt.prompt(); await prompt.userChoice; refresh(); return; } catch {} }
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  dialog.querySelector('#installAppInstructions').innerHTML = apple
   ? '<ol><li>Open this page in <strong>Safari</strong>.</li><li>Tap <strong>Share</strong> (the square with an upward arrow).</li><li>Choose <strong>Add to Home Screen</strong>. Scroll down if needed.</li><li>Keep <strong>Open as Web App</strong> on if shown, then tap <strong>Add</strong>.</li></ol>'
   : '<ol><li>Open this page in <strong>Chrome or Edge</strong>.</li><li>Open the browser menu.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>, then confirm.</li></ol>';
  if(!dialog.open) dialog.showModal();
 }
 buttons.forEach(b => b.addEventListener('click',install));
 window.addEventListener('beforeinstallprompt',e => { e.preventDefault(); pending = e; });
 window.addEventListener('appinstalled',() => { pending = null; buttons.forEach(b => b.hidden = true); if(dialog.open) dialog.close(); });
 refresh();
 if('serviceWorker' in navigator) navigator.serviceWorker.register('/pilot/sw.js',{scope:'/pilot/'}).catch(() => {});
})();
