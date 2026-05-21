import { Purchases, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

// ─── Config ────────────────────────────────────────────────────────────────
// After deploying to Cloudflare Pages, replace this with your Pages URL.
// Mobile apps make API calls to this absolute URL.
const DEPLOYED_API_URL = 'https://scorchedearth.pages.dev';

// Get your keys from https://app.revenuecat.com → Project → API Keys
const RC_IOS_KEY     = 'appl_DepsMmvSRDIWsYhpoieEDREHYUQ';
const RC_ANDROID_KEY = 'goog_YOUR_REVENUECAT_ANDROID_KEY';

// Must match the entitlement identifier in your RevenueCat dashboard
const ENTITLEMENT_ID = 'premium';

// ─── Runtime state ─────────────────────────────────────────────────────────
let isPremium  = false;
let selectedTone = 'witty';

const isNative = Capacitor.isNativePlatform();
const API_URL  = isNative ? `${DEPLOYED_API_URL}/api/comeback` : '/api/comeback';

// ─── Labels ────────────────────────────────────────────────────────────────
const INTENSITY_LABELS = {
  1: '1 — Barely a Flick',
  2: '2 — Light Jab',
  3: '3 — Solid Hit',
  4: '4 — Devastating Blow',
  5: '5 — Nuclear ✨',
};

const VULGARITY_LABELS = {
  1: '1 — Squeaky Clean',
  2: '2 — Mild',
  3: '3 — Moderate',
  4: '4 — Strong',
  5: '5 — Absolutely Unfiltered ✨',
};

// ─── Slider fill ───────────────────────────────────────────────────────────
function updateSliderFill(el) {
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty('--range-progress', `${pct}%`);
}

// ─── Element refs ──────────────────────────────────────────────────────────
const intensityEl    = document.getElementById('intensity');
const vulgarityEl    = document.getElementById('vulgarity');
const intensityLabel = document.getElementById('intensityLabel');
const vulgarityLabel = document.getElementById('vulgarityLabel');
const paywallOverlay = document.getElementById('paywallOverlay');
const unlockBtn      = document.getElementById('unlockBtn');
const restoreBtn     = document.getElementById('restoreBtn');

// ─── Premium UI ────────────────────────────────────────────────────────────
function updatePremiumUI() {
  document.querySelectorAll('.tone-btn--premium').forEach(btn => {
    btn.classList.toggle('unlocked', isPremium);
  });
}

function showPaywall() {
  paywallOverlay.classList.add('open');
  if (!isNative) {
    unlockBtn.textContent = 'Available on iOS & Android';
    unlockBtn.disabled    = true;
    restoreBtn.style.display = 'none';
  } else {
    unlockBtn.textContent = 'Unlock for $1.99';
    unlockBtn.disabled    = false;
    restoreBtn.style.display = '';
  }
}

function hidePaywall() {
  paywallOverlay.classList.remove('open');
  // Snap sliders back from premium range if user didn't purchase
  if (!isPremium) {
    if (parseInt(intensityEl.value) === 5) {
      intensityEl.value = 4;
      intensityLabel.textContent = INTENSITY_LABELS[4];
      updateSliderFill(intensityEl);
    }
    if (parseInt(vulgarityEl.value) === 5) {
      vulgarityEl.value = 4;
      vulgarityLabel.textContent = VULGARITY_LABELS[4];
      updateSliderFill(vulgarityEl);
    }
    // If the active tone is a premium one, revert to witty
    const activePremium = document.querySelector('.tone-btn--premium.active');
    if (activePremium) {
      activePremium.classList.remove('active');
      selectedTone = 'witty';
      document.querySelector('[data-tone="witty"]').classList.add('active');
    }
  }
}

// ─── RevenueCat ────────────────────────────────────────────────────────────
async function initRevenueCat() {
  if (!isNative) return;

  try {
    await Purchases.setLogLevel({ level: 'DEBUG' });
    await Purchases.configure({
      apiKey: Capacitor.getPlatform() === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY,
      appUserID: null,
    });
    const { customerInfo } = await Purchases.getCustomerInfo();
    isPremium = ENTITLEMENT_ID in customerInfo.entitlements.active;
    updatePremiumUI();
  } catch (e) {
    console.error('RevenueCat init error:', e);
  }
}

async function purchasePremium() {
  unlockBtn.disabled    = true;
  unlockBtn.textContent = 'Processing...';

  try {
    const { offerings } = await Purchases.getOfferings();
    const pkg = offerings?.current?.availablePackages?.[0];
    if (!pkg) throw new Error('No packages found. Please try again later.');

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    isPremium = ENTITLEMENT_ID in customerInfo.entitlements.active;
    updatePremiumUI();

    if (isPremium) hidePaywall();
  } catch (e) {
    if (e.code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      alert('Purchase failed: ' + (e.message || 'Please try again.'));
    }
    unlockBtn.disabled    = false;
    unlockBtn.textContent = 'Unlock for $1.99';
  }
}

async function restorePurchases() {
  restoreBtn.textContent = 'Restoring...';
  restoreBtn.disabled    = true;

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    isPremium = ENTITLEMENT_ID in customerInfo.entitlements.active;
    updatePremiumUI();

    if (isPremium) {
      hidePaywall();
    } else {
      alert('No previous purchase found on this account.');
    }
  } catch (e) {
    alert('Restore failed: ' + (e.message || 'Please try again.'));
  } finally {
    restoreBtn.textContent = 'Restore Purchases';
    restoreBtn.disabled    = false;
  }
}

// ─── Tone selection ─────────────────────────────────────────────────────────
document.getElementById('toneSection').addEventListener('click', (e) => {
  const btn = e.target.closest('.tone-btn');
  if (!btn) return;

  if ('premium' in btn.dataset && !isPremium) {
    showPaywall();
    return;
  }

  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedTone = btn.dataset.tone;
});

// ─── Sliders ───────────────────────────────────────────────────────────────
intensityEl.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  intensityLabel.textContent = INTENSITY_LABELS[val];
  updateSliderFill(e.target);
  if (val === 5 && !isPremium) showPaywall();
});

vulgarityEl.addEventListener('input', (e) => {
  const val = parseInt(e.target.value);
  vulgarityLabel.textContent = VULGARITY_LABELS[val];
  updateSliderFill(e.target);
  if (val === 5 && !isPremium) showPaywall();
});

// ─── Paywall controls ───────────────────────────────────────────────────────
document.getElementById('paywallClose').addEventListener('click', hidePaywall);

paywallOverlay.addEventListener('click', (e) => {
  if (e.target === paywallOverlay) hidePaywall();
});

unlockBtn.addEventListener('click', purchasePremium);
restoreBtn.addEventListener('click', restorePurchases);

// ─── Generate ──────────────────────────────────────────────────────────────
document.getElementById('generateBtn').addEventListener('click', async () => {
  const comment   = document.getElementById('comment').value.trim();
  const intensity = intensityEl.value;
  const vulgarity = vulgarityEl.value;
  const btn       = document.getElementById('generateBtn');
  const errorEl   = document.getElementById('errorText');
  const resultCard = document.getElementById('resultCard');

  errorEl.style.display = 'none';

  if (!comment) {
    errorEl.textContent   = 'Please enter the comment you received.';
    errorEl.style.display = 'block';
    return;
  }

  // Guard: don't send premium settings if user somehow got past the slider gate
  const safeIntensity = (!isPremium && parseInt(intensity) === 5) ? 4 : intensity;
  const safeVulgarity = (!isPremium && parseInt(vulgarity) === 5) ? 4 : vulgarity;
  const safeTone      = (!isPremium && document.querySelector(`[data-tone="${selectedTone}"]`)?.dataset.premium !== undefined)
    ? 'witty' : selectedTone;

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span>Loading your arsenal...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, tone: safeTone, intensity: safeIntensity, vulgarity: safeVulgarity }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    document.getElementById('comebackText').textContent = data.comeback;
    resultCard.classList.add('visible');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('copyBtn').textContent = 'Copy';
    document.getElementById('copyBtn').classList.remove('copied');
  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '🔥 Generate Comeback';
  }
});

// ─── Copy ──────────────────────────────────────────────────────────────────
document.getElementById('copyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('comebackText').textContent).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
});

// ─── Keyboard shortcut ─────────────────────────────────────────────────────
document.getElementById('comment').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    document.getElementById('generateBtn').click();
  }
});

// ─── Init ──────────────────────────────────────────────────────────────────
updateSliderFill(intensityEl);
updateSliderFill(vulgarityEl);
initRevenueCat();
