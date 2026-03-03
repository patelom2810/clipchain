// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7XTrXlGWJT-RUQD5-Y5phtTVMBMzsrRs",
  authDomain: "clipsync-23d14.firebaseapp.com",
  projectId: "clipsync-23d14",
  storageBucket: "clipsync-23d14.firebasestorage.app",
  messagingSenderId: "582075116146",
  appId: "1:582075116146:web:697ac1e78d222ee351f0eb",
  measurementId: "G-ZLBH7EGM1E",
  databaseURL: "https://clipsync-23d14-default-rtdb.firebaseio.com"
};

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = "1vz5zVkhVqD42SfRt";
const EMAILJS_SERVICE_ID = "service_cothgmd";
const EMAILJS_TEMPLATE_ID = "template_wtdvvjr"; // Replace with your actual Template ID

// Initialize EmailJS
try {
  if (window.emailjs) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }
} catch (error) {
  console.error("EmailJS Initialization Error:", error);
}

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.database();
} catch (error) {
  console.error("Firebase Initialization Error:", error);
  // Ensure icons still load even if Firebase fails
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
const db = window.db; // Safe reference


// DOM Elements
const usernameInput = document.getElementById("username");
const setUsernameBtn = document.getElementById("setUsername");
const clipboardTextArea = document.getElementById("clipboard");
const clipboardLink = document.getElementById("clipboardLink");
const editClipboardBtn = document.getElementById("editClipboard");
const clearClipboardBtn = document.getElementById("clearClipboard");
const copyLinkBtn = document.getElementById("copyLink");
// Share buttons removed from individual constants to be query-selected below
const charCountEl = document.getElementById("charCount");

const feedbackForm = document.getElementById("feedbackForm");
const newsletterForm = document.getElementById("newsletterForm");
const usernameDisplay = document.getElementById("usernameDisplay");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const closeMenuBtn = document.getElementById("closeMenu");
const mobileThemeToggleBtn = document.getElementById("mobileThemeToggleBtn");
const mobileNavbarUsername = document.getElementById("mobileNavbarUsername");

// New DOM Elements
const showQrBtn = document.getElementById("showQrBtn");
const qrModal = document.getElementById("qrModal");
const closeQrModalBtn = document.getElementById("closeQrModal");
const qrcodeContainer = document.getElementById("qrcode");
const historyList = document.getElementById("historyList");

// Advanced Features DOM Elements
const searchInput = document.getElementById("searchInput");
const searchCountDiv = document.getElementById("searchCount");
const matchCountSpan = document.getElementById("matchCount");
const highlightOverlay = document.getElementById("highlightOverlay");
const lockToggleBtn = document.getElementById("lockToggleBtn");
const lockBtnText = document.getElementById("lockBtnText");
const passwordModal = document.getElementById("passwordModal");
const passwordForm = document.getElementById("passwordForm");
const passwordInput = document.getElementById("passwordInput");
const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
const lockOverlay = document.getElementById("lockOverlay");
const unlockBtn = document.getElementById("unlockBtn");
const passwordModalTitle = document.getElementById("passwordModalTitle");
const passwordModalDesc = document.getElementById("passwordModalDesc");

// State Variables
let currentPassword = null;
let isLocked = false;
let isPasswordModalOpen = false;
let passwordMode = 'unlock'; // 'unlock' | 'set'

// Mobile Menu Toggle (Removed as per user request)
if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.remove("translate-x-full");
  });
}

if (closeMenuBtn && mobileMenu) {
  closeMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.add("translate-x-full");
  });
}

// Initialize username from URL or localStorage
let username = getUsernameFromURL() || localStorage.getItem("clipUsername") || generateRandomID();
updateURL(username);
updateLinkDisplay(username);
localStorage.setItem("clipUsername", username);
usernameInput.value = username;
// usernameDisplay DOM element removed or needs update in HTML, checking if exists
if (usernameDisplay) usernameDisplay.textContent = username;

// History State
let clipHistory = JSON.parse(localStorage.getItem("clipHistory") || "[]");
renderHistory();

// Set up Firebase reference and listener
let clipboardRef = db.ref(`clipboards/${username}`);

// Initialize Clipboard Listener
function initClipboardListener() {
  clipboardRef.on("value", snapshot => {
    const data = snapshot.val() || {};
    const text = typeof data === 'object' ? (data.text || "") : data;
    const savedPassword = typeof data === 'object' ? data.password : null;
    const expiresAt = typeof data === 'object' ? data.expiresAt : null;

    // Check Expiration
    if (expiresAt && Date.now() > expiresAt) {
      // Expired! Delete it.
      clipboardRef.set(null);
      clipboardTextArea.value = "";
      showNotification("This clip has self-destructed due to timer expiry.", "error");
      return;
    }

    // Update Timer UI if needed (optional, or just keep user's selection)
    // Ideally we might want to sync the timer state, but for now we trust the user's local setting or default to 'never'
    // Let's not overwrite the user's dropdown unless we want to show "Timer Active"

    // Check if password exists
    if (savedPassword) {
      currentPassword = savedPassword;
      lockBtnText.textContent = "Locked";
      // If we haven't unlocked it locally, show lock screen
      if (!isLocked && clipboardTextArea.value === "") {
        isLocked = true;
        updateLockState();
      }
    } else {
      currentPassword = null;
      isLocked = false;
      lockBtnText.textContent = "Set Password";
      lockBtnText.textContent = "Set Password";
      updateLockState();
    }

    // Update Lock Button Text dynamically based on state
    if (currentPassword) {
      lockBtnText.textContent = "Locked";
      // Change icon to unlock?
    } else {
      lockBtnText.textContent = "Set Password";
    }

    // Only update content if unlocked
    if (!isLocked) {
      if (clipboardTextArea.value !== text) {
        clipboardTextArea.value = text;
        updateCharCount();
        updateHighlight();
        if (isMarkdownMode) markdownPreview.innerHTML = marked.parse(text); // Update preview if active
      }

      // Add to history if new and not empty
      if (text && (!clipHistory.length || clipHistory[0].text !== text)) {
        addToHistory(text);
      }
    } else {
      // Locked logic...
    }
  });
}

initClipboardListener();

// Update Lock State UI
function updateLockState() {
  if (isLocked) {
    lockOverlay.classList.remove("hidden");
    clipboardTextArea.classList.add("blur-sm");
    clipboardTextArea.readOnly = true;
  } else {
    lockOverlay.classList.add("hidden");
    clipboardTextArea.classList.remove("blur-sm");
    clipboardTextArea.readOnly = false;
  }
}

// Logic: Handle Lock/Unlock Button
lockToggleBtn.addEventListener("click", () => {
  if (currentPassword) {
    if (isLocked) {
      openPasswordModal('unlock');
    } else {
      // Open modal to remove password (securely)
      openPasswordModal('remove');
    }
  } else {
    // Set Password
    openPasswordModal('set');
  }
});

// New Remove Link Logic
const removePasswordBtn = document.getElementById('removePasswordBtn');
removePasswordBtn.addEventListener('click', () => {
  // Switch to remove mode
  openPasswordModal('remove');
});

unlockBtn.addEventListener("click", () => {
  openPasswordModal('unlock');
});

const submitPasswordBtn = passwordForm.querySelector('button[type="submit"]');

function openPasswordModal(mode) {
  passwordMode = mode;
  isPasswordModalOpen = true;
  passwordInput.value = "";
  passwordModal.classList.remove("hidden");
  setTimeout(() => passwordModal.classList.remove("opacity-0"), 10);

  cancelPasswordBtn.classList.remove("hidden");

  // Reset button styles
  submitPasswordBtn.classList.remove("bg-red-600", "hover:bg-red-700");
  submitPasswordBtn.classList.add("bg-primary-600", "hover:bg-primary-700");

  if (mode === 'set') {
    passwordModalTitle.textContent = "Set Password";
    passwordModalDesc.textContent = "Create a password to protect this clipboard.";
    submitPasswordBtn.textContent = "Protect";
    removePasswordBtn.classList.add("hidden");
  } else if (mode === 'remove') {
    passwordModalTitle.textContent = "Remove Password";
    passwordModalDesc.textContent = "Enter current password to remove protection.";
    submitPasswordBtn.textContent = "Remove";
    submitPasswordBtn.classList.remove("bg-primary-600", "hover:bg-primary-700");
    submitPasswordBtn.classList.add("bg-red-600", "hover:bg-red-700");
    removePasswordBtn.classList.add("hidden");
  } else {
    // Unlock Mode
    passwordModalTitle.textContent = "Unlock Clipboard";
    passwordModalDesc.textContent = "Enter password to view content.";
    submitPasswordBtn.textContent = "Unlock";
  }

  // Specific fix for user request: "add remove pasword button with set password it visible after seting password"
  // If we are in 'Unlock' mode, we are locked.
  // If we are in 'Remove' mode, we are trying to remove.
  // If we are in 'Set' mode, no password exists.

  if (currentPassword && mode === 'unlock') {
    removePasswordBtn.classList.remove("hidden");
  } else {
    removePasswordBtn.classList.add("hidden");
  }
  passwordInput.focus();
}

function closePasswordModal() {
  isPasswordModalOpen = false;
  passwordModal.classList.add("opacity-0");
  setTimeout(() => passwordModal.classList.add("hidden"), 300);
}

cancelPasswordBtn.addEventListener("click", closePasswordModal);

passwordForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const inputVal = passwordInput.value;

  if (passwordMode === 'set') {
    if (inputVal.length < 4) {
      showNotification("Password must be at least 4 characters", "error");
      return;
    }
    clipboardRef.update({ password: inputVal });
    showNotification("Password set successfully", "success");
    closePasswordModal();
  } else if (passwordMode === 'remove') {
    // Check if password matches before removing
    if (inputVal === currentPassword) {
      clipboardRef.update({ password: null });
      showNotification("Password removed", "success");
      closePasswordModal();
    } else {
      passwordInput.classList.add("shake-animation");
      passwordInput.style.borderColor = "#ef4444"; // Red
      showNotification("Incorrect password", "error");
      setTimeout(() => {
        passwordInput.classList.remove("shake-animation");
        passwordInput.style.borderColor = "";
      }, 500);
    }
  } else {
    // Unlock mode
    if (inputVal === currentPassword) {
      isLocked = false;
      updateLockState();
      closePasswordModal();
      // Force re-fetch text to show it
      clipboardRef.once('value').then(snap => {
        const data = snap.val() || {};
        const text = typeof data === 'object' ? (data.text || "") : data;
        clipboardTextArea.value = text;
        updateCharCount();
        updateHighlight();
      });
    } else {
      // Wrong password animation
      passwordInput.classList.add("shake-animation");
      passwordInput.style.borderColor = "#ef4444"; // Red
      showNotification("Incorrect password", "error");
      setTimeout(() => {
        passwordInput.classList.remove("shake-animation");
        passwordInput.style.borderColor = "";
      }, 500);
    }
  }
});


// Event Listeners for Clipboard Input
clipboardTextArea.addEventListener("input", () => {
  const text = clipboardTextArea.value;
  // If locked, we shouldn't be able to edit, but double check
  if (!isLocked) {
    clipboardRef.update({ text: text });
    updateCharCount();
    updateHighlight();
  }
});


// Debounce for history on input
let inputTimeout;
clipboardTextArea.addEventListener("keyup", () => {
  clearTimeout(inputTimeout);
  inputTimeout = setTimeout(() => {
    const text = clipboardTextArea.value;
    if (text && (!clipHistory.length || clipHistory[0].text !== text)) {
      addToHistory(text);
    }
  }, 2000);
});

// --- Search & Highlight Logic ---

// Sync Scroll
clipboardTextArea.addEventListener("scroll", () => {
  highlightOverlay.scrollTop = clipboardTextArea.scrollTop;
  highlightOverlay.scrollLeft = clipboardTextArea.scrollLeft;
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();

  if (query) {
    searchCountDiv.classList.remove("hidden");
    updateHighlight();
  } else {
    searchCountDiv.classList.add("hidden");
    highlightOverlay.innerHTML = ""; // Clear highlights
  }
});

function updateHighlight() {
  const text = clipboardTextArea.value;
  const query = searchInput.value.toLowerCase();

  // Logic: Escape HTML, then wrap matches in <mark>
  if (!query) {
    highlightOverlay.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
    matchCountSpan.textContent = "0";
    return;
  }

  // Escape basic HTML to prevent injection in overlay display
  // But we need to keep newlines for matching structural fidelity
  const escapedText = text.replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });

  // Simple Regex for case-insensitive match
  // Note: This simple regex replaces in the HTML string, might break if query contains special chars
  // Ideally use a more robust way, but for "Find in Text", this works for demo
  try {
    const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
    let matchCount = 0;

    const highlighted = escapedText.replace(regex, (match) => {
      matchCount++;
      // IMPORTANT: Use specific class for styling overlap
      return `<mark>${match}</mark>`;
    });

    // Fix: Replace newlines with <br> AND handle trailing newlines for perfect alignment
    let finalHtml = highlighted.replace(/\n/g, '<br>');
    if (text.endsWith('\n')) finalHtml += '<br>';

    highlightOverlay.innerHTML = finalHtml;
    matchCountSpan.textContent = matchCount;

  } catch (e) {
    console.error("Regex error", e);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// --- Previous Logic Updates ---

setUsernameBtn.addEventListener("click", () => {
  const newUsername = usernameInput.value.trim();
  if (!newUsername) return showNotification("Please enter a valid username", "error");

  db.ref(`clipboards/${newUsername}`).once("value", snapshot => {
    // Logic update: New username might have password
    const data = snapshot.val();
    const hasPass = data && typeof data === 'object' && data.password;

    if (data && (typeof data !== 'object' || data.text)) { // if exists
      const confirmUse = confirm("This clipboard already contains data. Join it?");
      if (!confirmUse) return;
    }

    if (hasPass) {
      // Prompt for password immediately? Or just switch and let the locked state handle it
      // Ideally switch and let locked state handle it
    }

    username = newUsername;
    localStorage.setItem("clipUsername", username);
    updateURL(username);
    updateLinkDisplay(username);
    // usernameDisplay is removed from new UI, so ignore

    clipboardRef.off(); // detach old listener
    clipboardRef = db.ref(`clipboards/${username}`);
    initClipboardListener();

    showNotification("Joined ID: " + username, "success");
  });
});

// Edit Clipboard
editClipboardBtn.addEventListener("click", () => {
  clipboardTextArea.disabled = false;
  clipboardTextArea.focus();
});

// Markdown Preview Logic
const toggleMarkdownBtn = document.getElementById("toggleMarkdown");
const markdownPreview = document.getElementById("markdownPreview");
let isMarkdownMode = false;

toggleMarkdownBtn.addEventListener("click", () => {
  isMarkdownMode = !isMarkdownMode;

  if (isMarkdownMode) {
    // Switch to Preview
    const text = clipboardTextArea.value;
    markdownPreview.innerHTML = marked.parse(text);
    markdownPreview.classList.remove("hidden");
    clipboardTextArea.classList.add("hidden");
    highlightOverlay.classList.add("hidden"); // Hide highlight in preview

    toggleMarkdownBtn.innerHTML = `<i data-lucide="edit-2" class="h-4 w-4 mr-1.5"></i> Editor`;
    toggleMarkdownBtn.classList.add("bg-primary-100", "text-primary-700");
  } else {
    // Switch to Editor
    markdownPreview.classList.add("hidden");
    clipboardTextArea.classList.remove("hidden");
    highlightOverlay.classList.remove("hidden");

    toggleMarkdownBtn.innerHTML = `<i data-lucide="file-text" class="h-4 w-4 mr-1.5"></i> Preview`;
    toggleMarkdownBtn.classList.remove("bg-primary-100", "text-primary-700");
  }
  lucide.createIcons();
});

// Clear Clipboard
// Clear Clipboard
const confirmModal = document.getElementById("confirmModal");
const confirmClearBtn = document.getElementById("confirmClearBtn");
const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");

clearClipboardBtn.addEventListener("click", () => {
  confirmModal.classList.remove("hidden");
  confirmModal.style.display = "flex";
  setTimeout(() => {
    confirmModal.classList.remove("opacity-0");
    confirmModal.style.opacity = "1";
  }, 10);
});

function closeConfirmModal() {
  confirmModal.classList.add("opacity-0");
  confirmModal.style.opacity = "0";
  setTimeout(() => {
    confirmModal.classList.add("hidden");
    confirmModal.style.display = "none";
  }, 300);
}

if (confirmClearBtn) {
  confirmClearBtn.addEventListener("click", () => {
    clipboardTextArea.value = "";
    if (typeof isMarkdownMode !== 'undefined' && isMarkdownMode && typeof markdownPreview !== 'undefined') {
      markdownPreview.innerHTML = "";
    }
    clipboardRef.set("");
    showNotification("Clipboard cleared", "success");
    updateCharCount(); // Fix: Update char count immediately
    closeConfirmModal();
  });
}

// Share Functionality
if (shareClipboardBtn) {
  shareClipboardBtn.addEventListener("click", () => {
    if (navigator.share) {
      navigator.share({
        title: 'ClipChain',
        text: clipboardLink.href, // Use href for full URL
        url: clipboardLink.href,
      })
        .then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
    } else {
      // Fallback
      const link = clipboardLink.textContent;
      navigator.clipboard.writeText(link).then(() => {
        showNotification("Link copied to clipboard (Share not supported)", "info");
      });
    }
  });
}

if (cancelConfirmBtn) {
  cancelConfirmBtn.addEventListener("click", closeConfirmModal);
}

// Copy Link with Feedback
copyLinkBtn.addEventListener("click", () => {
  const link = clipboardLink.textContent;
  navigator.clipboard.writeText(link).then(() => {
    // Show feedback
    const originalIcon = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = `
      <i data-lucide="check" class="h-4 w-4 text-green-600"></i>
    `;
    lucide.createIcons();
    setTimeout(() => {
      copyLinkBtn.innerHTML = originalIcon;
    }, 2000);


    showNotification("Link copied to clipboard!", "success");
  });
});

// Copy All Clipboard Content
const copyAllBtn = document.getElementById("copyAllBtn");
if (copyAllBtn) {
  copyAllBtn.addEventListener("click", () => {
    const text = clipboardTextArea.value;
    if (!text) return showNotification("Clipboard is empty", "info");

    navigator.clipboard.writeText(text).then(() => {
      // Visual feedback
      const originalHtml = copyAllBtn.innerHTML;
      copyAllBtn.innerHTML = `<i data-lucide="check" class="h-4 w-4 mr-1.5 text-green-600"></i> Copied!`;
      lucide.createIcons();

      showNotification("All content copied to clipboard!", "success");

      setTimeout(() => {
        copyAllBtn.innerHTML = originalHtml;
        lucide.createIcons();
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      showNotification("Failed to copy content", "error");
    });
  });
}

// Export as File Logic
const exportBtn = document.getElementById("exportBtn");
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const text = clipboardTextArea.value;
    if (!text) return showNotification("Nothing to export!", "info");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    // Format date for filename
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

    a.href = url;
    a.download = `clipchain-export-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification("Exporting file...", "success");
  });
}

// QR Code Logic


showQrBtn.addEventListener("click", () => {
  const link = clipboardLink.href;

  // Show modal successfully
  qrModal.classList.remove("hidden");
  qrModal.style.display = "flex"; // Force display

  if (typeof QRCode === 'undefined') {
    return showNotification("QR Code library not loaded", "error");
  }

  // Always clear and regenerate to avoid state issues
  qrcodeContainer.innerHTML = "";

  try {
    new QRCode(qrcodeContainer, {
      text: link,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (e) {
    console.error("QR Generation Error:", e);
    showNotification("Failed to generate QR Code", "error");
  }

  // Small delay for transition
  setTimeout(() => {
    qrModal.classList.remove("opacity-0");
    qrModal.style.opacity = "1";
  }, 10);
});

closeQrModalBtn.addEventListener("click", () => {
  qrModal.classList.add("opacity-0");
  qrModal.style.opacity = "0";
  setTimeout(() => {
    qrModal.classList.add("hidden");
    qrModal.style.display = "none";
  }, 300);
});

// Self-Destruct Timer Logic
const selfDestructSelect = document.getElementById("selfDestructTimer");

selfDestructSelect.addEventListener("change", () => {
  const value = selfDestructSelect.value;
  let expiresAt = null;

  if (value !== 'never') {
    const now = Date.now();
    if (value === '10m') expiresAt = now + 10 * 60 * 1000;
    if (value === '1h') expiresAt = now + 60 * 60 * 1000;
    if (value === '24h') expiresAt = now + 24 * 60 * 60 * 1000;
  }

  // Update Firebase with new expiry
  // Note: We need to preserve existing data (text, password)
  clipboardRef.once('value').then(snapshot => {
    const data = snapshot.val() || {};
    // If it's a string, convert to object
    const text = typeof data === 'object' ? (data.text || "") : data;
    const password = typeof data === 'object' ? data.password : null;

    clipboardRef.set({
      text: text,
      password: password,
      expiresAt: expiresAt
    });

    if (expiresAt) {
      showNotification(`Timer set: Destructs in ${value}`, "success");
    } else {
      showNotification("Timer disabled", "info");
    }
  });
});

// Close modal on outside click
qrModal.addEventListener("click", (e) => {
  if (e.target === qrModal) {
    qrModal.classList.add("opacity-0");
    qrModal.style.opacity = "0";
    setTimeout(() => {
      qrModal.classList.add("hidden");
      qrModal.style.display = "none";
    }, 300);
  }
});

// Share Clipboard / Link
const shareButtons = document.querySelectorAll(".share-button, #shareLinkInlineBtn");
shareButtons.forEach(btn => {
  if (btn) {
    btn.addEventListener("click", () => {
      const link = clipboardLink.textContent;

      if (navigator.share) {
        navigator.share({
          title: 'ClipChain - Shared Clipboard',
          text: 'Check out my clipboard content:',
          url: link,
        })
          .then(() => showNotification('Shared successfully!', 'success'))
          .catch((error) => console.log('Error sharing:', error));
      } else {
        navigator.clipboard.writeText(link).then(() => {
          showNotification("Link copied to clipboard! You can now share it.", "success");
        });
      }
    });
  }
});

// Theme Toggle
const themeToggle = document.getElementById("themeToggle");
const mobileThemeToggle = document.getElementById("mobileThemeToggle");

function setTheme(isDark) {
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    if (themeToggle) themeToggle.checked = true;
    if (mobileThemeToggle) mobileThemeToggle.checked = true;
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
    if (themeToggle) themeToggle.checked = false;
    if (mobileThemeToggle) mobileThemeToggle.checked = false;
    localStorage.setItem("theme", "light");
  }
}

if (themeToggle) {
  themeToggle.addEventListener("change", (e) => {
    setTheme(e.target.checked);
  });
}

if (mobileThemeToggleBtn) {
  mobileThemeToggleBtn.addEventListener("click", () => {
    // Current state check
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(!isDark);

    // Update icon
    const icon = mobileThemeToggleBtn.querySelector('i');
    if (icon) {
      // lucide icons are svg, so we replace content or toggle classes?
      // Lucide replaces the <i> tag. We need to check the SVG.
      // Easiest is to just re-render or let setTheme handle it if we had a unified render function.
      // But here we just toggle theme. Ideally we update the icon too.
      // Let's just rely on global theme set.
    }
  });
}

// Init Theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  setTheme(true);
} else {
  setTheme(false);
}

// Mobile Username Logic
const mobileSetUsernameBtn = document.getElementById("mobileSetUsername");
const mobileUsernameInput = document.getElementById("mobileUsername");

if (mobileNavbarUsername) {
  // Sync initial value
  mobileNavbarUsername.value = username || "";

  // On change (Enter pressed or focus lost)
  mobileNavbarUsername.addEventListener("change", () => {
    const newUsername = mobileNavbarUsername.value.trim();
    if (!newUsername) return; // Silent return or notification

    if (usernameInput) usernameInput.value = newUsername;
    if (setUsernameBtn) setUsernameBtn.click(); // Trigger main logic

    mobileNavbarUsername.blur(); // Remove focus
  });

  // Also on Enter key specifically if 'change' isn't enough for immediate feel
  mobileNavbarUsername.addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
      mobileNavbarUsername.blur(); // Trigger change
    }
  });
}

// Mobile Menu Username Logic
if (mobileSetUsernameBtn && mobileUsernameInput) {
  mobileSetUsernameBtn.addEventListener("click", () => {
    const newUsername = mobileUsernameInput.value.trim();
    if (!newUsername) return showNotification("Please enter a valid username", "error");

    if (usernameInput) usernameInput.value = newUsername;
    if (setUsernameBtn) setUsernameBtn.click();
  });

  mobileUsernameInput.addEventListener("keydown", (e) => {
    if (e.key === 'Enter') {
      mobileSetUsernameBtn.click();
    }
  });
}



// History Functions
function addToHistory(text) {
  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newItem = {
    text: text,
    time: timeString,
    id: Date.now()
  };

  clipHistory.unshift(newItem);

  // Keep only last 5
  if (clipHistory.length > 5) {
    clipHistory.pop();
  }

  localStorage.setItem("clipHistory", JSON.stringify(clipHistory));
  renderHistory();
}

// Render history list
function renderHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

  historyList.innerHTML = '';

  if (clipHistory.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state-container">
        <div class="empty-state-icon"></div>
        <p class="text-sm text-secondary-400 italic">No recent clips found.</p>
      </div>`;
    return;
  }

  clipHistory.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'history-item flex justify-between items-center group';

    // Create text preview
    const textSpan = document.createElement('span');
    textSpan.className = 'truncate text-sm text-secondary-700 font-mono w-full';
    textSpan.textContent = item.text; // Use item.text

    // Action buttons container (visible on hover)
    const actionsDelay = document.createElement('div');
    actionsDelay.className = 'flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2';

    // Copy btn
    const copyBtn = document.createElement('button');
    copyBtn.innerHTML = '<i data-lucide="copy" class="w-3 h-3"></i>';
    copyBtn.className = 'p-1.5 glass-button rounded-md hover:text-primary-600';
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(item.text); // Use item.text
      showNotification('Copied to clipboard!', 'success'); // Corrected type
    };

    actionsDelay.appendChild(copyBtn);

    div.appendChild(textSpan);
    div.appendChild(actionsDelay);

    div.onclick = () => {
      clipboardTextArea.value = item.text; // Corrected variable name
      clipboardRef.set(item.text); // Added to update Firebase
      updateCharCount();
      showNotification('Restored from history', 'success'); // Corrected type
    };

    historyList.appendChild(div);
  });
  lucide.createIcons();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
  return div.innerHTML;
}

// Clear History Logic
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const historyClearOverlay = document.getElementById("historyClearOverlay");
const cancelHistoryClearBtn = document.getElementById("cancelHistoryClearBtn");
const confirmHistoryClearBtn = document.getElementById("confirmHistoryClearBtn");

if (clearHistoryBtn && historyClearOverlay) {
  // Show Overlay
  clearHistoryBtn.addEventListener("click", () => {
    if (clipHistory.length === 0) return; // Don't show if empty
    historyClearOverlay.classList.remove("hidden");
    setTimeout(() => historyClearOverlay.classList.remove("opacity-0"), 10);
  });

  // Cancel Handler
  cancelHistoryClearBtn.addEventListener("click", () => {
    historyClearOverlay.classList.add("opacity-0");
    setTimeout(() => historyClearOverlay.classList.add("hidden"), 200);
  });

  // Confirm Handler
  confirmHistoryClearBtn.addEventListener("click", () => {
    clipHistory = [];
    localStorage.setItem("clipHistory", JSON.stringify(clipHistory));
    renderHistory();
    showNotification("History cleared", "success");

    // Hide Overlay
    historyClearOverlay.classList.add("opacity-0");
    setTimeout(() => historyClearOverlay.classList.add("hidden"), 200);
  });
}

// Feedback Form Submission
feedbackForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("feedbackName").value;
  const email = document.getElementById("feedbackEmail").value;
  const rating = document.querySelector('input[name="rating"]:checked').value;
  const message = document.getElementById("feedbackMessage").value;

  // Save feedback to Firebase
  const feedbackRef = db.ref('feedback').push();
  feedbackRef.set({
    name: name,
    email: email,
    rating: rating,
    message: message,
    timestamp: Date.now()
  }).then(() => {
    // Send Email via EmailJS
    if (window.emailjs) {
      const templateParams = {
        name: name,
        email: email,
        rating: rating,
        message: message
      };

      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(function (response) {
          console.log('SUCCESS!', response.status, response.text);
          showNotification("Feedback sent successfully!", "success");
        }, function (error) {
          console.log('FAILED...', error);
          showNotification("Feedback saved, but email failed.", "warning");
        });
    } else {
      showNotification("Thank you for your feedback!", "success");
    }

    feedbackForm.reset();
  }).catch(error => {
    showNotification("Error submitting feedback. Please try again.", "error");
    console.error("Error submitting feedback:", error);
  });
});

// Newsletter Form Submission
if (newsletterForm) {
  newsletterForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("newsletterEmail");
    const email = emailInput ? emailInput.value : "";

    if (!email) return;

    // Save email to Firebase
    const newsletterRef = db.ref('newsletter').push();
    newsletterRef.set({
      email: email,
      timestamp: Date.now()
    }).then(() => {
      showNotification("Thank you for subscribing to our newsletter!", "success");
      newsletterForm.reset();
    }).catch(error => {
      showNotification("Error subscribing. Please try again.", "error");
      console.error("Error subscribing:", error);
    });
  });
}

// Helper Functions
function updateURL(user) {
  // Instead of changing the actual URL path, use URL hash or query parameter
  // Option 1: Using hash (preferred for static sites)
  window.history.replaceState({}, "", `#${user}`);

  // Option 2: Using query parameter (alternative approach)
  // window.history.replaceState({}, "", `?username=${user}`);
}

// Replace the getUsernameFromURL function with this:
function getUsernameFromURL() {
  // Get username from hash
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    return hash.substring(1); // Remove the # character
  }

  // Alternative: Get username from query parameter
  // const params = new URLSearchParams(window.location.search);
  // return params.get('username');

  return null;
}

// Update the updateLinkDisplay function:
function updateLinkDisplay(user) {
  // Update to show the URL with hash format
  const baseUrl = window.location.origin;
  const fullLink = `${baseUrl}/#${user}`;
  // Alternative: const fullLink = `${baseUrl}/?username=${user}`;

  clipboardLink.textContent = fullLink;
  clipboardLink.href = fullLink;
}

// Initialize Icons
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  } else {
    console.error("Lucide library not loaded!");
  }
});

function generateRandomID() {
  return Math.random().toString(36).substring(2, 10);
}

function updateCharCount() {
  const count = clipboardTextArea.value.length;
  charCountEl.textContent = `${count} character${count !== 1 ? 's' : ''}`;
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification cursor-pointer ${type === 'success' ? 'bg-primary-600' :
    type === 'error' ? 'bg-red-600' :
      'bg-secondary-700'
    }`;

  notification.innerHTML = message;

  // Click to dismiss
  notification.onclick = () => {
    notification.classList.add('hide');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  };

  document.body.appendChild(notification);

  // Animate and remove
  setTimeout(() => {
    // Only remove if still attached (wasn't clicked)
    if (document.body.contains(notification) && !notification.classList.contains('hide')) {
      notification.classList.add('hide');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

// Initialize character count
updateCharCount();

// Handle smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();

    const targetId = this.getAttribute('href');
    if (targetId === '#') return;

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 80, // Offset for header
        behavior: 'smooth'
      });
    }
  });
});

// Add resize listener to handle mobile menu state
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768 && !mobileMenu.classList.contains('translate-x-full')) {
    mobileMenu.classList.add('translate-x-full');
    document.body.style.overflow = '';
  }
});
