/**
 * THE POWER GYM - MAIN JAVASCRIPT
 * Interactive features, UPI copy, BMI calculator, session navbar update & toasts
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Update dynamic navbar session (Members / Staff)
  updateNavbarSession();

  // Copy UPI ID button
  const copyUpiButtons = document.querySelectorAll('.btn-copy-upi');
  copyUpiButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const upiId = btn.getAttribute('data-upi') || 'gopinath71845@oksbi';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(upiId).then(() => {
          showToast(`UPI ID "${upiId}" copied to clipboard. Open GPay / PhonePe to pay.`);
        }).catch(() => {
          copyFallback(upiId);
        });
      } else {
        copyFallback(upiId);
      }
    });
  });

  function copyFallback(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
      document.execCommand('copy');
      showToast(`UPI ID "${text}" copied to clipboard.`);
    } catch (err) {
      showToast(`UPI ID: ${text}`);
    }
    document.body.removeChild(tempInput);
  }

  // Interactive BMI Calculator
  const bmiForm = document.getElementById('bmiForm');
  if (bmiForm) {
    bmiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const height = parseFloat(document.getElementById('bmiHeight').value);
      const weight = parseFloat(document.getElementById('bmiWeight').value);
      const resultDiv = document.getElementById('bmiResult');
      const numSpan = document.getElementById('bmiNumber');
      const catSpan = document.getElementById('bmiCategory');
      const adviceP = document.getElementById('bmiAdvice');

      if (!height || !weight || height <= 0 || weight <= 0) {
        showToast('Please enter valid positive values for height and weight.');
        return;
      }

      const heightM = height / 100;
      const bmi = (weight / (heightM * heightM)).toFixed(1);
      numSpan.textContent = bmi;

      let category = '';
      let color = '';
      let advice = '';

      if (bmi < 18.5) {
        category = 'Underweight';
        color = '#64B5F6';
        advice = 'Recommended: High-protein surplus diet + Hypertrophy Strength Training program at The Power Gym.';
      } else if (bmi >= 18.5 && bmi < 25) {
        category = 'Optimal Healthy Weight';
        color = '#00FF66';
        advice = 'Excellent condition. Recommended: Power Pro plan for muscle density and athletic conditioning.';
      } else if (bmi >= 25 && bmi < 30) {
        category = 'Overweight / Heavy Muscle';
        color = '#FFAA00';
        advice = 'Recommended: Progressive resistance training combined with HIIT and structured caloric intake.';
      } else {
        category = 'Obese';
        color = '#FF5252';
        advice = 'Recommended: 1-on-1 Personal Coaching transformation program with dedicated cardiovascular regimen.';
      }

      catSpan.textContent = category;
      catSpan.style.color = color;
      adviceP.textContent = advice;
      resultDiv.style.display = 'block';
    });
  }

  // Setup Password Visibility Toggles
  setupPasswordToggles();

  // Initialize Staff Portal Security Key Gate (Key: ASDFGF123456*)
  initStaffPortalKeyGate();
});

// Dynamic Navbar State
function updateNavbarSession() {
  if (typeof GymStore === 'undefined') return;
  const session = GymStore.getCurrentSession();
  const navActions = document.querySelector('.nav-actions');
  const navLinks = document.getElementById('navLinks');
  if (!navActions) return;

  if (session) {
    const isStaff = session.role === 'staff';
    const targetUrl = isStaff ? 'staff-dashboard.html' : 'dashboard.html';
    const portalLabel = isStaff ? 'Staff Console' : `${session.full_name ? session.full_name.split(' ')[0] : 'My'} Portal`;

    // Update nav links
    if (navLinks) {
      const loginItems = navLinks.querySelectorAll('li a');
      loginItems.forEach(a => {
        const href = a.getAttribute('href') || '';
        if (href === 'login.html' || href === '/login' || href === 'dashboard.html') {
          if (!isStaff) {
            a.setAttribute('href', targetUrl);
            a.textContent = 'Member Portal';
            a.style.color = '#00FF66';
            a.style.fontWeight = '700';
          }
        }
        if (href.includes('staff-login.html') || href.includes('staff-dashboard.html') || href.includes('/staff/login')) {
          if (isStaff) {
            a.setAttribute('href', targetUrl);
            a.textContent = 'Staff Console';
            a.style.color = '#FFAA00';
            a.style.fontWeight = '700';
          }
        }
      });
    }

    // Update nav actions (buttons)
    const mobileBtn = navActions.querySelector('.mobile-toggle');
    navActions.innerHTML = `
      <a href="${targetUrl}" class="btn btn-primary btn-sm" style="${isStaff ? 'background: #FFAA00; color: #000; border-color: #FFAA00; font-weight: 700;' : ''}">${portalLabel}</a>
      <button id="navLogoutBtn" class="btn btn-outline btn-sm" style="color: #ff7777; border-color: rgba(255, 100, 100, 0.4);">Log Out</button>
    `;
    if (mobileBtn) navActions.appendChild(mobileBtn);

    const logoutBtn = document.getElementById('navLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        GymStore.clearSession();
        if (typeof GymStore.lockStaffPortal === 'function') GymStore.lockStaffPortal();
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        showToast('Logged out successfully.');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);
      });
    }
  } else {
    // Unauthenticated: Keep only Join Now in nav-actions (Member Portal and Staff Portal stay in nav-links with cover highlight bar)
    const mobileBtn = navActions.querySelector('.mobile-toggle');
    navActions.innerHTML = `
      <a href="register.html" class="btn btn-primary btn-sm">Join Now</a>
    `;
    if (mobileBtn) navActions.appendChild(mobileBtn);
  }
}

// Setup Password Visibility Toggles
function setupPasswordToggles() {
  const eyeSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const eyeOffSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

  const toggleButtons = document.querySelectorAll('.btn-toggle-eye');
  toggleButtons.forEach(btn => {
    if (btn.dataset.boundEye) return;
    btn.dataset.boundEye = 'true';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = eyeOffSvg;
        btn.setAttribute('title', 'Hide text');
        btn.style.color = '#FFAA00';
      } else {
        input.type = 'password';
        btn.innerHTML = eyeSvg;
        btn.setAttribute('title', 'Show text');
        btn.style.color = '';
      }
    });
  });
}

// Toast notification helper (Zero emojis)
function showToast(message, duration = 4000) {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '24px';
    toastContainer.style.right = '24px';
    toastContainer.style.zIndex = '9999';
    toastContainer.style.display = 'flex';
    toastContainer.style.flexDirection = 'column';
    toastContainer.style.gap = '10px';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.style.background = '#0E1712';
  toast.style.border = '1px solid #00FF66';
  toast.style.color = '#FFFFFF';
  toast.style.padding = '14px 22px';
  toast.style.borderRadius = '10px';
  toast.style.boxShadow = '0 0 20px rgba(0, 255, 102, 0.35)';
  toast.style.fontSize = '0.92rem';
  toast.style.fontWeight = '600';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.animation = 'slideDown 0.3s ease-out';
  toast.innerHTML = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #00FF66;"></span> ${message}`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s ease';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

window.showToast = showToast;

// ==========================================================================
// STAFF PORTAL SECURITY KEY GATE
// Required key to touch/enter staff portal: ASDFGF123456*
// ==========================================================================
function initStaffPortalKeyGate() {
  const MASTER_KEY = "ASDFGF123456*";

  // Create gate modal if not present
  let modalOverlay = document.getElementById('staffKeyModal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'staffKeyModal';
    modalOverlay.className = 'staff-key-modal-overlay';
    modalOverlay.innerHTML = `
      <div class="staff-key-modal-card">
        <button type="button" class="staff-key-modal-close" id="staffModalCloseBtn" aria-label="Close modal">&times;</button>
        <div style="text-align: center; margin-bottom: 22px;">
          <div class="staff-key-shield-icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFAA00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <circle cx="12" cy="11" r="2.5"></circle>
              <line x1="12" y1="13.5" x2="12" y2="16.5"></line>
            </svg>
          </div>
          <span class="staff-key-badge">RESTRICTED ACCESS</span>
          <h2 style="font-size: 1.55rem; color: #FFFFFF; margin: 8px 0 6px 0;">Staff Portal <span style="color: #FFAA00;">Security Key</span></h2>
          <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45;">
            Please enter the authorization key to enter the Staff Portal:
          </p>
        </div>

        <form id="staffModalGateForm" autocomplete="off">
          <div class="form-group" style="margin-bottom: 16px;">
            <label class="form-label" for="staffGateInput" style="display: flex; justify-content: space-between;">
              <span>Staff Security Key</span>
              <span style="font-size: 0.78rem; color: var(--text-muted);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 3px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>Confidential</span>
            </label>
            <div class="input-password-wrapper">
              <input 
                type="password" 
                id="staffGateInput" 
                class="form-control" 
                placeholder="Enter Staff Portal Key" 
                autocomplete="off" 
                required 
                style="font-family: monospace; letter-spacing: 1.5px; font-size: 1rem; border-color: rgba(255, 170, 0, 0.45);"
              >
              <button type="button" class="btn-toggle-eye" data-target="staffGateInput" title="Toggle visibility" aria-label="Toggle password visibility">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
            <div id="staffGateError" style="display: none; padding: 8px 12px; border-radius: 6px; font-size: 0.84rem; margin-top: 10px; font-weight: 600;"></div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button type="button" id="staffGateCancelBtn" class="btn btn-outline" style="flex: 1; padding: 10px 14px; font-size: 0.9rem;">Cancel</button>
            <button type="submit" id="staffGateSubmitBtn" class="btn btn-primary" style="flex: 2; padding: 10px 14px; background: #FFAA00; color: #000; border-color: #FFAA00; font-weight: 800; font-size: 0.92rem; box-shadow: 0 0 20px rgba(255, 170, 0, 0.4);">
              Enter Staff Portal &rarr;
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modalOverlay);
    setupPasswordToggles();
  }

  let pendingTargetUrl = null;

  function openGate(targetUrl = 'staff-login.html') {
    pendingTargetUrl = targetUrl;
    const input = document.getElementById('staffGateInput');
    const err = document.getElementById('staffGateError');
    if (err) err.style.display = 'none';
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
    modalOverlay.classList.add('active');
  }

  function closeGate() {
    modalOverlay.classList.remove('active');
    const err = document.getElementById('staffGateError');
    if (err) err.style.display = 'none';

    // If user cancels while directly on staff auth page without unlock, go back to home
    const isDirectAuthPage = window.location.pathname.includes('staff-login') || 
                             window.location.pathname.includes('staff-register') ||
                             window.location.href.includes('staff-login.html') ||
                             window.location.href.includes('staff-register.html');
    const session = typeof GymStore !== 'undefined' ? GymStore.getCurrentSession() : null;
    const isUnlocked = typeof GymStore !== 'undefined' ? GymStore.isStaffPortalUnlocked() : (sessionStorage.getItem('the_power_gym_staff_unlocked') === 'true');
    if (isDirectAuthPage && !isUnlocked && (!session || session.role !== 'staff')) {
      window.location.href = 'index.html';
    }
  }

  window.openStaffPortalGate = openGate;
  window.closeStaffPortalGate = closeGate;

  const closeBtn = document.getElementById('staffModalCloseBtn');
  const cancelBtn = document.getElementById('staffGateCancelBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeGate);
  if (cancelBtn) cancelBtn.addEventListener('click', closeGate);

  // Close on backdrop click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeGate();
    }
  });

  // Handle ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
      closeGate();
    }
  });

  // Gate Form Submission
  const gateForm = document.getElementById('staffModalGateForm');
  const gateInput = document.getElementById('staffGateInput');
  const gateError = document.getElementById('staffGateError');
  const card = modalOverlay.querySelector('.staff-key-modal-card');

  if (gateForm) {
    gateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = (gateInput.value || '').trim();
      const clean = entered.toUpperCase().replace(/\s+/g, '');

      // Verify key
      const isValid = clean === MASTER_KEY || clean === 'ASDFGF123456' || (typeof GymStore !== 'undefined' && GymStore.verifyStaffPortalKey(entered));

      if (isValid) {
        if (typeof GymStore !== 'undefined') {
          GymStore.unlockStaffPortal();
        } else {
          sessionStorage.setItem('the_power_gym_staff_unlocked', 'true');
        }
        sessionStorage.setItem('the_power_gym_verified_key', entered.trim());

        gateError.style.display = 'block';
        gateError.style.background = 'rgba(0, 255, 102, 0.15)';
        gateError.style.border = '1px solid #00FF66';
        gateError.style.color = '#00FF66';
        gateError.textContent = 'Pass Key verified! Opening Staff Login...';

        setTimeout(() => {
          modalOverlay.classList.remove('active');
          window.location.href = 'staff-login.html';
        }, 350);
      } else {
        if (card) {
          card.classList.remove('shake');
          void card.offsetWidth; // re-trigger animation
          card.classList.add('shake');
        }
        gateError.style.display = 'block';
        gateError.style.background = 'rgba(255, 82, 82, 0.15)';
        gateError.style.border = '1px solid #FF5252';
        gateError.style.color = '#FF5252';
        gateError.textContent = 'Access Denied: Invalid Security Key. Please enter the correct Staff Portal key.';
        gateInput.focus();
        gateInput.select();
      }
    });
  }

  // Intercept touches/clicks on "Staff Portal" links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const text = (link.textContent || '').trim().toLowerCase();

    const isStaffLink = href.includes('staff-login.html') || 
                        href.includes('/staff/login') ||
                        href.includes('staff-register.html') ||
                        href.includes('staff-dashboard.html') ||
                        href.includes('/staff/dashboard') ||
                        text === 'staff portal' ||
                        text === 'staff console' ||
                        text.includes('staff & trainer portal') ||
                        text.includes('staff login');

    if (isStaffLink) {
      // If staff member is actively authenticated, let them access console directly
      const session = typeof GymStore !== 'undefined' ? GymStore.getCurrentSession() : null;
      if (session && session.role === 'staff') {
        return;
      }

      // Not logged in as staff -> ALWAYS prompt for the Master Security Pass Key!
      e.preventDefault();
      openGate('staff-login.html');
    }
  });

  // Direct Page Check: if user opened staff-login.html or staff-register.html directly
  const currentSession = typeof GymStore !== 'undefined' ? GymStore.getCurrentSession() : null;
  const isDirectStaffAuthPage = window.location.pathname.includes('staff-login') || 
                                window.location.pathname.includes('staff-register') ||
                                window.location.href.includes('staff-login.html') ||
                                window.location.href.includes('staff-register.html');
  if (isDirectStaffAuthPage) {
    const isUnlocked = typeof GymStore !== 'undefined' ? GymStore.isStaffPortalUnlocked() : (sessionStorage.getItem('the_power_gym_staff_unlocked') === 'true');
    if (!isUnlocked && (!currentSession || currentSession.role !== 'staff')) {
      openGate(window.location.href);
    } else {
      const pageKeyInput = document.getElementById('staffKey') || document.getElementById('staffRegKey');
      const verifiedKey = sessionStorage.getItem('the_power_gym_verified_key') || MASTER_KEY;
      if (pageKeyInput && !pageKeyInput.value) {
        pageKeyInput.value = verifiedKey;
      }
    }
  } else {
    // On home or public pages: if not logged in as staff, lock staff portal immediately
    // so clicking Staff Portal from home will ALWAYS require the authentication pass key!
    if (!currentSession || currentSession.role !== 'staff') {
      sessionStorage.removeItem('the_power_gym_staff_unlocked');
    }
  }
}
