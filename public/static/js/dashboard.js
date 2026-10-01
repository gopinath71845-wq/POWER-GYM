/**
 * THE POWER GYM - DASHBOARD JAVASCRIPT
 * Tabs, Image Upload Previews, Search Filters & Dynamic UPI Auto-Pricing
 */

document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Tab Navigation
  const tabLinks = document.querySelectorAll('.sidebar-link[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');

  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTabId = link.getAttribute('data-tab');

      // Update active links
      tabLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update active tab content
      tabContents.forEach(tab => {
        if (tab.id === targetTabId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // Update URL hash without scroll
      history.replaceState(null, null, `#${targetTabId}`);
    });
  });

  // Activate tab from URL hash if present
  if (window.location.hash) {
    const hashTab = window.location.hash.substring(1);
    const matchedLink = document.querySelector(`.sidebar-link[data-tab="${hashTab}"]`);
    if (matchedLink) {
      matchedLink.click();
    }
  }

  // Profile Image Upload Preview
  const imageInputs = document.querySelectorAll('input[type="file"][data-preview-target]');
  imageInputs.forEach(input => {
    input.addEventListener('change', function () {
      const targetId = this.getAttribute('data-preview-target');
      const targetImg = document.getElementById(targetId);
      if (targetImg && this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          targetImg.src = e.target.result;
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
  });

  // Search Members filter in Staff Dashboard
  const memberSearchInput = document.getElementById('memberSearchInput');
  if (memberSearchInput) {
    memberSearchInput.addEventListener('keyup', function () {
      const filter = this.value.toLowerCase();
      const rows = document.querySelectorAll('#membersTable tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(filter)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // Dynamic Auto-Amount QR Handler in Customer Dashboard
  const payPlanSelect = document.getElementById('payPlanSelect');
  const customAdvanceGroup = document.getElementById('customAdvanceGroup');
  const customAdvanceInput = document.getElementById('customAdvanceInput');
  const dashboardDynamicQr = document.getElementById('dashboardDynamicQr');
  const dashboardQrAmountDisplay = document.getElementById('dashboardQrAmountDisplay');
  const dashboardDirectUpiLink = document.getElementById('dashboardDirectUpiLink');
  const upiBtnAmount = document.getElementById('upiBtnAmount');

  function updatePaymentQr() {
    if (!payPlanSelect || !dashboardDynamicQr) return;
    const selectedOpt = payPlanSelect.options[payPlanSelect.selectedIndex];
    let price = parseFloat(selectedOpt.getAttribute('data-price')) || 999;
    let planName = selectedOpt.getAttribute('data-name') || 'Membership';

    if (selectedOpt.value === '0') {
      if (customAdvanceGroup) customAdvanceGroup.style.display = 'block';
      if (customAdvanceInput) {
        const customVal = parseFloat(customAdvanceInput.value);
        if (customVal && customVal > 0) {
          price = customVal;
          planName = 'Advance Payment';
        }
      }
    } else {
      if (customAdvanceGroup) customAdvanceGroup.style.display = 'none';
    }

    const formattedPrice = Number(price).toLocaleString('en-IN');
    if (dashboardQrAmountDisplay) dashboardQrAmountDisplay.textContent = formattedPrice;
    if (upiBtnAmount) upiBtnAmount.textContent = formattedPrice;

    // Update QR Code image automatically
    const newQrUrl = `/api/upi-qr?amount=${price}&plan=${encodeURIComponent(planName)}&t=${Date.now()}`;
    dashboardDynamicQr.src = newQrUrl;

    // Update Direct UPI App link
    if (dashboardDirectUpiLink) {
      dashboardDirectUpiLink.href = `upi://pay?pa=gopinath71845@oksbi&pn=The%20Power%20Gym&am=${Number(price).toFixed(2)}&cu=INR&tn=The%20Power%20Gym%20${encodeURIComponent(planName)}`;
    }
  }

  if (payPlanSelect) {
    payPlanSelect.addEventListener('change', updatePaymentQr);
  }
  if (customAdvanceInput) {
    customAdvanceInput.addEventListener('input', updatePaymentQr);
  }
});
