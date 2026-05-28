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
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.database();
  } else {
    console.warn("Firebase library not detected. Running in offline/local-only mode.");
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error);
  // Ensure icons still load even if Firebase fails
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Fallback Mock Database for Offline/Local-only Resiliency
let db = window.db;
if (!db) {
  const mockRef = {
    on: () => {},
    off: () => {},
    once: () => Promise.resolve({ val: () => null }),
    update: () => Promise.resolve(),
    set: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    push: () => {
      const ref = {
        set: () => Promise.resolve(),
        key: "mock-key",
        then: (cb) => { cb(); return ref; },
        catch: () => ref
      };
      return ref;
    },
    onDisconnect: () => ({
      remove: () => Promise.resolve(),
      cancel: () => Promise.resolve()
    })
  };
  db = {
    ref: () => mockRef
  };
}



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
let sessionPassword = null; // Verified passcode for this session
let isLocked = false;
let isPasswordModalOpen = false;
let passwordMode = 'unlock'; // 'unlock' | 'set'
let currentViewMode = 'edit'; // 'edit' | 'preview' | 'split'
let lastKnownRemoteText = "";
let floatingNotes = {};
let activeNoteId = null;

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
const dockSessionId = document.getElementById("dockSessionId");
if (dockSessionId) dockSessionId.textContent = "#" + username;
if (usernameDisplay) usernameDisplay.textContent = username;

// History State
let clipHistory = JSON.parse(localStorage.getItem("clipHistory") || "[]");
renderHistory();

// Set up Firebase reference and listener
let clipboardRef = db.ref(`clipboards/${username}`);

// Countdown Timer State & Functions
let countdownInterval = null;

function startCountdown(expiresAt) {
  if (countdownInterval) clearInterval(countdownInterval);

  const expiryBadge = document.getElementById("expiryBadge");
  const expiryTimeText = document.getElementById("expiryTimeText");
  const expiryProgressBar = document.getElementById("expiryProgressBar");

  if (!expiryBadge || !expiryTimeText) return;

  // Determine baseline total duration for progress percentage
  let remaining = expiresAt - Date.now();
  if (remaining <= 0) return;

  let totalDuration = 10 * 60 * 1000; // 10m
  if (remaining > 60 * 60 * 1000) {
    totalDuration = 24 * 60 * 60 * 1000; // 24h
  } else if (remaining > 10 * 60 * 1000) {
    totalDuration = 60 * 60 * 1000; // 1h
  }

  expiryBadge.classList.remove("hidden");
  expiryBadge.classList.add("flex");
  if (expiryProgressBar) expiryProgressBar.classList.remove("hidden");

  function update() {
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      expiryBadge.classList.add("hidden");
      expiryBadge.classList.remove("flex");
      if (expiryProgressBar) {
        expiryProgressBar.classList.add("hidden");
        expiryProgressBar.style.width = "0%";
      }
      clipboardTextArea.value = "";
      renderMarkdownPreview();
      showNotification("This clip has self-destructed.", "error");
      return;
    }

    let seconds = Math.floor((timeLeft / 1000) % 60);
    let minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
    let hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);

    let timeString = "";
    if (hours > 0) {
      timeString = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    expiryTimeText.textContent = timeString;

    if (expiryProgressBar) {
      const percentage = Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100));
      expiryProgressBar.style.width = `${percentage}%`;
    }
  }

  update();
  countdownInterval = setInterval(update, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  const expiryBadge = document.getElementById("expiryBadge");
  const expiryProgressBar = document.getElementById("expiryProgressBar");
  if (expiryBadge) {
    expiryBadge.classList.add("hidden");
    expiryBadge.classList.remove("flex");
  }
  if (expiryProgressBar) {
    expiryProgressBar.classList.add("hidden");
    expiryProgressBar.style.width = "0%";
  }
}

// Initialize Clipboard Listener
let textListenerActive = false;

function initClipboardListener() {
  // Clear any existing listeners
  clipboardRef.off();
  db.ref(`clipboards/${username}/password`).off();
  db.ref(`clipboards/${username}/expiresAt`).off();
  db.ref(`clipboards/${username}/text`).off();
  db.ref(`clipboards/${username}/stickyText`).off();
  db.ref(`clipboards/${username}/floatingNotes`).off();

  let passwordVal = null;
  let expiresAtVal = null;
  textListenerActive = false;

  clipboardTextArea.placeholder = "Type or paste your text here... It will sync instantly across all devices.";

  if (!textListenerActive) {
    textListenerActive = true;
    db.ref(`clipboards/${username}/text`).on("value", textSnapshot => {
      const text = textSnapshot.val() || "";
      
      // Only update content if unlocked
      if (!isLocked) {
        if (clipboardTextArea.value !== text) {
          applyRemoteChange(text);
        } else {
          lastKnownRemoteText = text;
        }
      }
    });

    db.ref(`clipboards/${username}/stickyText`).on("value", stickySnapshot => {
      const stickyText = stickySnapshot.val() || "";
      const stickyTextArea = document.getElementById("stickyTextArea");
      if (stickyTextArea && !isLocked) {
        if (stickyTextArea.value !== stickyText) {
          stickyTextArea.value = stickyText;
          if (currentViewMode === 'sticky') {
            updateCharCount();
          }
        }
      }
      const floatingNoteTextArea = document.getElementById("floatingNoteTextArea");
      if (floatingNoteTextArea && !isLocked) {
        if (floatingNoteTextArea.value !== stickyText) {
          floatingNoteTextArea.value = stickyText;
        }
      }
    });

    db.ref(`clipboards/${username}/floatingNotes`).on("value", snapshot => {
      const remoteNotes = snapshot.val() || {};
      floatingNotes = remoteNotes;
      
      // Sync active note state
      if (activeNoteId && !floatingNotes[activeNoteId]) {
        // If active note was deleted, switch to first remaining or close panel
        activeNoteId = Object.keys(floatingNotes)[0] || null;
        if (activeNoteId) {
          loadActiveNoteData();
        } else {
          closeFloatingNotePanelDirectly();
        }
      } else if (activeNoteId) {
        const curNote = floatingNotes[activeNoteId];
        const titleInput = document.getElementById("floatingNoteTitle");
        const textArea = document.getElementById("floatingNoteTextArea");
        if (titleInput && titleInput.value !== (curNote.title || "")) {
          titleInput.value = curNote.title || "";
        }
        if (textArea && textArea.value !== (curNote.content || "")) {
          textArea.value = curNote.content || "";
        }
        updateNotePanelColorClass(curNote.color || "babyyellow");
      }
      
      renderPinnedNotes();
    });
  }

  db.ref(`clipboards/${username}/password`).on("value", snap => {
    passwordVal = snap.val();
    currentPassword = passwordVal;
    
    if (passwordVal) {
      lockBtnText.textContent = "Locked";
      // Lock if locally stored password doesn't match database password
      if (sessionPassword !== passwordVal) {
        isLocked = true;
        clipboardTextArea.value = "";
        const stickyTextArea = document.getElementById("stickyTextArea");
        if (stickyTextArea) stickyTextArea.value = "";
        const floatingNoteTextArea = document.getElementById("floatingNoteTextArea");
        if (floatingNoteTextArea) floatingNoteTextArea.value = "";
        updateCharCount();
        updateHighlight();
        if (currentViewMode !== 'edit') renderMarkdownPreview();
        updateLockState();
      }
    } else {
      isLocked = false;
      sessionPassword = null;
      lockBtnText.textContent = "Set Password";
      updateLockState();
      
      // Fetch text if it was locked before
      clipboardRef.once('value').then(snap => {
        const data = snap.val() || {};
        const text = typeof data === 'object' ? (data.text || "") : data;
        const stickyText = typeof data === 'object' ? (data.stickyText || "") : "";
        if (clipboardTextArea.value !== text) {
          clipboardTextArea.value = text;
          updateCharCount();
          updateHighlight();
          if (currentViewMode !== 'edit') renderMarkdownPreview();
        }
        const stickyTextArea = document.getElementById("stickyTextArea");
        if (stickyTextArea && stickyTextArea.value !== stickyText) {
          stickyTextArea.value = stickyText;
          if (currentViewMode === 'sticky') {
            updateCharCount();
          }
        }
        const floatingNoteTextArea = document.getElementById("floatingNoteTextArea");
        if (floatingNoteTextArea && floatingNoteTextArea.value !== stickyText) {
          floatingNoteTextArea.value = stickyText;
        }
      });
    }
  });

  db.ref(`clipboards/${username}/expiresAt`).on("value", snap => {
    expiresAtVal = snap.val();
    const selfDestructSelect = document.getElementById("selfDestructTimer");
    if (expiresAtVal) {
      if (Date.now() > expiresAtVal) {
        db.ref(`clipboards/${username}`).set(null);
        clipboardTextArea.value = "";
        const stickyTextArea = document.getElementById("stickyTextArea");
        if (stickyTextArea) stickyTextArea.value = "";
        const floatingNoteTextArea = document.getElementById("floatingNoteTextArea");
        if (floatingNoteTextArea) floatingNoteTextArea.value = "";
        if (currentViewMode !== 'edit') renderMarkdownPreview();
        stopCountdown();
        showNotification("This clip has self-destructed.", "error");
      } else {
        startCountdown(expiresAtVal);
        let remaining = expiresAtVal - Date.now();
        let selectedOption = 'never';
        if (remaining > 60 * 60 * 1000) selectedOption = '24h';
        else if (remaining > 10 * 60 * 1000) selectedOption = '1h';
        else if (remaining > 0) selectedOption = '10m';
        if (selfDestructSelect) {
          selfDestructSelect.value = selectedOption;
          selfDestructSelect.dataset.currentValue = selectedOption;
        }
      }
    } else {
      stopCountdown();
      if (selfDestructSelect) {
        selfDestructSelect.value = 'never';
        selfDestructSelect.dataset.currentValue = 'never';
      }
    }
  });
}

initClipboardListener();

// Update Lock State UI
function updateLockState() {
  const selfDestructSelect = document.getElementById("selfDestructTimer");
  const lockToggleBtn = document.getElementById("lockToggleBtn");
  
  if (isLocked) {
    lockOverlay.classList.remove("hidden");
    clipboardTextArea.classList.add("blur-sm");
    clipboardTextArea.readOnly = true;
    if (selfDestructSelect) selfDestructSelect.disabled = true;
    
    // Change lock icon to locked red state
    if (lockToggleBtn) {
      lockToggleBtn.innerHTML = '<i data-lucide="lock" class="h-4 w-4"></i>';
      lockToggleBtn.className = "w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center transition-all tooltip";
    }
  } else {
    lockOverlay.classList.add("hidden");
    clipboardTextArea.classList.remove("blur-sm");
    clipboardTextArea.readOnly = false;
    if (selfDestructSelect) selfDestructSelect.disabled = false;
    
    // Change lock icon to unlocked emerald state if a password is set, otherwise default
    if (lockToggleBtn) {
      if (currentPassword) {
        lockToggleBtn.innerHTML = '<i data-lucide="unlock" class="h-4 w-4"></i>';
        lockToggleBtn.className = "w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center transition-all tooltip";
      } else {
        lockToggleBtn.innerHTML = '<i data-lucide="lock" class="h-4 w-4"></i>';
        lockToggleBtn.className = "w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-all tooltip";
      }
    }
  }
  if (window.lucide) {
    lucide.createIcons();
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
    sessionPassword = inputVal; // Authorize this local session immediately
    clipboardRef.update({ password: inputVal });
    showNotification("Password set successfully", "success");
    closePasswordModal();
  } else if (passwordMode === 'remove') {
    // Check if password matches before removing
    if (inputVal === currentPassword) {
      sessionPassword = null;
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
      sessionPassword = inputVal; // Authorize local session
      isLocked = false;
      updateLockState();
      closePasswordModal();
      // Force re-fetch text to show it
      clipboardRef.once('value').then(snap => {
        const data = snap.val() || {};
        const text = typeof data === 'object' ? (data.text || "") : data;
        const stickyText = typeof data === 'object' ? (data.stickyText || "") : "";
        clipboardTextArea.value = text;
        const stickyTextArea = document.getElementById("stickyTextArea");
        if (stickyTextArea) stickyTextArea.value = stickyText;
        const floatingNoteTextArea = document.getElementById("floatingNoteTextArea");
        if (floatingNoteTextArea) floatingNoteTextArea.value = stickyText;
        updateCharCount();
        updateHighlight();
        if (currentViewMode !== 'edit') renderMarkdownPreview();
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
let syncTimeout;
clipboardTextArea.addEventListener("input", () => {
  const text = clipboardTextArea.value;
  
  // Dynamic sync status indicator feedback
  const statusIndicator = document.getElementById("statusIndicator");
  if (statusIndicator) {
    statusIndicator.innerHTML = `
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
      </span>
      Syncing...
    `;
  }

  // If locked, we shouldn't be able to edit, but double check
  if (!isLocked) {
    // Normal collaborative editing
    db.ref(`clipboards/${username}`).update({ text: text });
    lastKnownRemoteText = text;
    updateCharCount();
    updateHighlight();
    if (currentViewMode !== 'edit') renderMarkdownPreview();
  }

  // Debounce status change back to Synced
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (statusIndicator) {
      statusIndicator.innerHTML = `
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Synced
      `;
    }
  }, 600);
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
    // Clear highlight overlay but keep it in sync with textarea scroll
    highlightOverlay.innerHTML = "";
  }
});

// Search fix: sync overlay styles to textarea so highlights align pixel-perfectly
function syncOverlayStyles() {
  const ta = clipboardTextArea;
  const ov = highlightOverlay;
  const cs = window.getComputedStyle(ta);
  ov.style.fontFamily = cs.fontFamily;
  ov.style.fontSize = cs.fontSize;
  ov.style.fontWeight = cs.fontWeight;
  ov.style.lineHeight = cs.lineHeight;
  ov.style.letterSpacing = cs.letterSpacing;
  ov.style.padding = cs.padding;
  ov.style.paddingTop = cs.paddingTop;
  ov.style.paddingRight = cs.paddingRight;
  ov.style.paddingBottom = cs.paddingBottom;
  ov.style.paddingLeft = cs.paddingLeft;
  ov.style.whiteSpace = 'pre-wrap';
  ov.style.wordBreak = 'break-word';
  ov.style.overflowWrap = 'break-word';
  ov.style.boxSizing = cs.boxSizing;
}
// Run once after DOM is ready and again if fonts/size could change
document.addEventListener('DOMContentLoaded', syncOverlayStyles);
syncOverlayStyles();

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
      // B6 fix: use a toast notification instead of blocking confirm()
      // Simply join — the user explicitly typed the ID and pressed Go.
      // The lock overlay will protect password-protected clipboards automatically.
      showNotification("Joining existing clipboard: " + newUsername, "info");
    }

    if (hasPass) {
      // Prompt for password immediately? Or just switch and let the locked state handle it
      // Ideally switch and let locked state handle it
    }

    username = newUsername;
    localStorage.setItem("clipUsername", username);
    updateURL(username);
    updateLinkDisplay(username);
    const dockSessionId = document.getElementById("dockSessionId");
    if (dockSessionId) dockSessionId.textContent = "#" + username;

    clipboardRef.off(); // detach old listener
    clipboardRef = db.ref(`clipboards/${username}`);
    initClipboardListener();

    showNotification("Joined ID: " + username, "success");
  });
});

// Edit Clipboard
if (editClipboardBtn) {
  editClipboardBtn.addEventListener("click", () => {
    clipboardTextArea.disabled = false;
    clipboardTextArea.focus();
  });
}

// Markdown Editor Integration & View Modes
const editPane = document.getElementById("editPane");
const previewPane = document.getElementById("previewPane");
const editorContentGrid = document.getElementById("editorContentGrid");
const btnViewEdit = document.getElementById("btnViewEdit");
const btnViewPreview = document.getElementById("btnViewPreview");
const btnViewSplit = document.getElementById("btnViewSplit");
const markdownPreview = document.getElementById("markdownPreview");

function renderMarkdownPreview() {
  const text = clipboardTextArea.value;
  if (typeof marked !== 'undefined') {
    const renderedHtml = marked.parse(text);
    if (markdownPreview) {
      markdownPreview.innerHTML = renderedHtml;
      // Trigger highlight.js syntax highlighting
      if (typeof hljs !== 'undefined') {
        markdownPreview.querySelectorAll('pre code').forEach(block => {
          hljs.highlightElement(block);
        });
      }
    }
  }
}

function setViewMode(mode) {
  currentViewMode = mode;

  const btnViewSticky = document.getElementById("btnViewSticky");
  const stickyPane = document.getElementById("stickyPane");

  // Reset tab button styles
  const tabs = [btnViewEdit, btnViewPreview, btnViewSplit, btnViewSticky];
  tabs.forEach(tab => {
    if (tab) {
      tab.className = "px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 focus:outline-none text-secondary-500 hover:text-secondary-800 dark:hover:text-white";
    }
  });

  // Active tab styles
  const activeTab = mode === 'edit' ? btnViewEdit : mode === 'preview' ? btnViewPreview : mode === 'split' ? btnViewSplit : btnViewSticky;
  if (activeTab) {
    activeTab.className = "px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 focus:outline-none bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm";
  }

  // Toggle grid and layout columns
  if (mode === 'edit') {
    if (editPane) {
      editPane.classList.remove("hidden");
      editPane.classList.add("block");
    }
    if (previewPane) {
      previewPane.classList.add("hidden");
      previewPane.classList.remove("block");
    }
    if (stickyPane) {
      stickyPane.classList.add("hidden");
      stickyPane.classList.remove("flex");
    }
    if (editorContentGrid) {
      editorContentGrid.classList.remove("grid-cols-2", "md:grid-cols-2");
      editorContentGrid.classList.add("grid-cols-1");
    }
  } else if (mode === 'preview') {
    if (editPane) {
      editPane.classList.add("hidden");
      editPane.classList.remove("block");
    }
    if (previewPane) {
      previewPane.classList.remove("hidden");
      previewPane.classList.add("block");
    }
    if (stickyPane) {
      stickyPane.classList.add("hidden");
      stickyPane.classList.remove("flex");
    }
    if (editorContentGrid) {
      editorContentGrid.classList.remove("grid-cols-2", "md:grid-cols-2");
      editorContentGrid.classList.add("grid-cols-1");
    }
    renderMarkdownPreview();
  } else if (mode === 'split') {
    if (editPane) {
      editPane.classList.remove("hidden");
      editPane.classList.add("block");
    }
    if (previewPane) {
      previewPane.classList.remove("hidden");
      previewPane.classList.add("block");
    }
    if (stickyPane) {
      stickyPane.classList.add("hidden");
      stickyPane.classList.remove("flex");
    }
    if (editorContentGrid) {
      // B14 fix: on mobile use stacked layout, side-by-side only on md+
      editorContentGrid.classList.remove("grid-cols-1");
      editorContentGrid.classList.add("grid-cols-1", "md:grid-cols-2");
    }
    renderMarkdownPreview();
  } else if (mode === 'sticky') {
    if (editPane) {
      editPane.classList.add("hidden");
      editPane.classList.remove("block");
    }
    if (previewPane) {
      previewPane.classList.add("hidden");
      previewPane.classList.remove("block");
    }
    if (stickyPane) {
      stickyPane.classList.remove("hidden");
      stickyPane.classList.add("flex");
    }
    if (editorContentGrid) {
      editorContentGrid.classList.remove("grid-cols-2", "md:grid-cols-2");
      editorContentGrid.classList.add("grid-cols-1");
    }
  }

  // Hide/show formatting toolbar based on mode
  const formattingToolbar = document.getElementById("formattingToolbar");
  if (formattingToolbar) {
    if (mode === 'edit' || mode === 'split') {
      formattingToolbar.classList.remove("hidden");
    } else {
      formattingToolbar.classList.add("hidden");
    }
  }

  updateCharCount();
}

if (btnViewEdit) btnViewEdit.addEventListener("click", () => setViewMode('edit'));
if (btnViewPreview) btnViewPreview.addEventListener("click", () => setViewMode('preview'));
if (btnViewSplit) btnViewSplit.addEventListener("click", () => setViewMode('split'));
if (document.getElementById("btnViewSticky")) {
  document.getElementById("btnViewSticky").addEventListener("click", () => setViewMode('sticky'));
}

// Formatting Shortcuts Toolbar Logic
const fmtBold = document.getElementById("fmtBold");
const fmtItalic = document.getElementById("fmtItalic");
const fmtUnderline = document.getElementById("fmtUnderline");
const fmtStrikethrough = document.getElementById("fmtStrikethrough");
const fmtHeading = document.getElementById("fmtHeading");
const fmtListBullet = document.getElementById("fmtListBullet");
const fmtListCheck = document.getElementById("fmtListCheck");
const fmtCode = document.getElementById("fmtCode");
const fmtQuote = document.getElementById("fmtQuote");
const fmtLink = document.getElementById("fmtLink");
const fmtTable = document.getElementById("fmtTable");
const fmtColor = document.getElementById("fmtColor");
const fmtColorDropdown = document.getElementById("fmtColorDropdown");
const fmtColorPicker = document.getElementById("fmtColorPicker");
const fmtFont = document.getElementById("fmtFont");
const fmtFontDropdown = document.getElementById("fmtFontDropdown");
const fmtRemove = document.getElementById("fmtRemove");

function insertMarkdown(beforeText, afterText = "") {
  if (isLocked) return;
  const textarea = clipboardTextArea;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);
  const replacement = beforeText + selectedText + afterText;

  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  textarea.focus();
  textarea.selectionStart = start + beforeText.length;
  textarea.selectionEnd = start + beforeText.length + selectedText.length;

  // Trigger input event to sync to Firebase and update highlight overlay
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
  renderMarkdownPreview();
}

if (fmtBold) fmtBold.addEventListener("click", () => insertMarkdown("**", "**"));
if (fmtItalic) fmtItalic.addEventListener("click", () => insertMarkdown("*", "*"));
// Underline: uses HTML <u> tag (rendered by marked.js in preview)
if (fmtUnderline) fmtUnderline.addEventListener("click", () => insertMarkdown("<u>", "</u>"));
// Strikethrough: standard GFM ~~text~~ syntax
if (fmtStrikethrough) fmtStrikethrough.addEventListener("click", () => insertMarkdown("~~", "~~"));
if (fmtHeading) fmtHeading.addEventListener("click", () => insertMarkdown("# "));
if (fmtListBullet) fmtListBullet.addEventListener("click", () => insertMarkdown("- "));
if (fmtListCheck) fmtListCheck.addEventListener("click", () => insertMarkdown("- [ ] "));
if (fmtCode) fmtCode.addEventListener("click", () => insertMarkdown("```\n", "\n```"));
if (fmtQuote) fmtQuote.addEventListener("click", () => insertMarkdown("> "));
if (fmtLink) fmtLink.addEventListener("click", () => insertMarkdown("[", "](url)"));

// Remove Formatting: strips common markdown & HTML inline formatting from selected text
if (fmtRemove) {
  fmtRemove.addEventListener("click", () => {
    if (isLocked) return;
    const textarea = clipboardTextArea;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    if (!selected) {
      showNotification("Select text first to remove formatting.", "info");
      return;
    }

    // Strip markdown: **bold**, *italic*, ~~strike~~, `code`, # headings, > quotes,
    // HTML tags like <u>, <span style=...>, <b>, <i>, <em>, <strong>
    let cleaned = selected
      .replace(/\*\*(.+?)\*\*/gs, '$1')       // bold
      .replace(/\*(.+?)\*/gs, '$1')            // italic
      .replace(/~~(.+?)~~/gs, '$1')            // strikethrough
      .replace(/`{1,3}([^`]+)`{1,3}/gs, '$1') // inline code / code blocks
      .replace(/^#{1,6}\s+/gm, '')            // headings
      .replace(/^>\s+/gm, '')                 // blockquotes
      .replace(/^-\s+\[[ x]\]\s+/gm, '')     // checklists
      .replace(/^-\s+/gm, '')                 // bullet lists
      .replace(/<[^>]+>/g, '');               // all HTML tags

    textarea.value = text.substring(0, start) + cleaned + text.substring(end);
    textarea.focus();
    textarea.selectionStart = start;
    textarea.selectionEnd = start + cleaned.length;

    // Sync to Firebase and update overlay
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);
    renderMarkdownPreview();
    showNotification("Formatting removed.", "success");
  });
}

// Table format shortcut
if (fmtTable) {
  fmtTable.addEventListener("click", () => {
    insertMarkdown("| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |");
  });
}

// Text Color Dropdown Logic
if (fmtColor && fmtColorDropdown) {
  fmtColor.addEventListener("click", (e) => {
    e.stopPropagation();
    fmtColorDropdown.classList.toggle("hidden");
    if (fmtFontDropdown) fmtFontDropdown.classList.add("hidden");
  });
}

// Text Font Dropdown Logic
if (fmtFont && fmtFontDropdown) {
  fmtFont.addEventListener("click", (e) => {
    e.stopPropagation();
    fmtFontDropdown.classList.toggle("hidden");
    if (fmtColorDropdown) fmtColorDropdown.classList.add("hidden");
  });
}

// Close dropdowns on click outside
document.addEventListener("click", () => {
  if (fmtColorDropdown) fmtColorDropdown.classList.add("hidden");
  if (fmtFontDropdown) fmtFontDropdown.classList.add("hidden");
});

// Prevent dropdown close on clicking inside the dropdown container
if (fmtColorDropdown) {
  fmtColorDropdown.addEventListener("click", (e) => e.stopPropagation());
}
if (fmtFontDropdown) {
  fmtFontDropdown.addEventListener("click", (e) => e.stopPropagation());
}

// Color preset listeners
document.querySelectorAll(".color-preset").forEach(btn => {
  btn.addEventListener("click", () => {
    const color = btn.getAttribute("data-color");
    insertMarkdown(`<span style="color: ${color}">`, '</span>');
    if (fmtColorDropdown) fmtColorDropdown.classList.add("hidden");
  });
});

// Custom color picker listener
if (fmtColorPicker) {
  fmtColorPicker.addEventListener("change", (e) => {
    const color = e.target.value;
    insertMarkdown(`<span style="color: ${color}">`, '</span>');
    if (fmtColorDropdown) fmtColorDropdown.classList.add("hidden");
  });
}

// Font preset listeners
document.querySelectorAll(".font-preset").forEach(btn => {
  btn.addEventListener("click", () => {
    const font = btn.getAttribute("data-font");
    insertMarkdown(`<span style="font-family: ${font}">`, '</span>');
    if (fmtFontDropdown) fmtFontDropdown.classList.add("hidden");
  });
});

// Clear Clipboard
// Clear Clipboard
const confirmModal = document.getElementById("confirmModal");
const confirmClearBtn = document.getElementById("confirmClearBtn");
const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");

clearClipboardBtn.addEventListener("click", () => {
  if (isLocked) {
    showNotification("Clipboard is locked. Please unlock first.", "error");
    return;
  }
  
  // Dynamically update confirm modal text depending on mode
  const confirmTitle = document.querySelector("#confirmModal h3");
  const confirmDesc = document.querySelector("#confirmModal p");
  if (currentViewMode === 'sticky') {
    if (confirmTitle) confirmTitle.textContent = "Clear Sticky Note?";
    if (confirmDesc) confirmDesc.textContent = "This will clear your sticky note content.";
  } else {
    if (confirmTitle) confirmTitle.textContent = "Clear Clipboard?";
    if (confirmDesc) confirmDesc.textContent = "This action cannot be undone.";
  }

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
    if (currentViewMode === 'sticky') {
      const stickyTextArea = document.getElementById("stickyTextArea");
      if (stickyTextArea) stickyTextArea.value = "";
      const floatingNoteTextArea = document.getElementById("floatingNoteTextArea");
      if (floatingNoteTextArea) floatingNoteTextArea.value = "";
      clipboardRef.update({ stickyText: "" });
      showNotification("Sticky note cleared", "success");
    } else {
      clipboardTextArea.value = "";
      if (typeof currentViewMode !== 'undefined' && currentViewMode !== 'edit' && typeof markdownPreview !== 'undefined' && markdownPreview) {
        markdownPreview.innerHTML = "";
      }
      clipboardRef.update({ text: "" });
      showNotification("Clipboard cleared", "success");
    }
    updateCharCount(); // Fix: Update char count immediately
    closeConfirmModal();
  });
}

// Share Functionality
// Duplicate shareClipboardBtn click handler removed (handled by .share-button listeners below)

if (cancelConfirmBtn) {
  cancelConfirmBtn.addEventListener("click", closeConfirmModal);
}

// Copy Link with Feedback
copyLinkBtn.addEventListener("click", () => {
  // B11 fix: use clipboardLink.href instead of .textContent which may be truncated by CSS
  const link = clipboardLink.href || clipboardLink.textContent;
  navigator.clipboard.writeText(link).then(() => {
    // Show feedback
    const originalIcon = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = `
      <i data-lucide="check" class="h-4 w-4 text-green-600"></i>
    `;
    lucide.createIcons();
    setTimeout(() => {
      copyLinkBtn.innerHTML = originalIcon;
      lucide.createIcons(); // B11 fix: re-render icon after restoring original HTML
    }, 2000);
    showNotification("Link copied to clipboard!", "success");
  });
});

// Copy All Clipboard Content
const copyAllBtn = document.getElementById("copyAllBtn");
if (copyAllBtn) {
  copyAllBtn.addEventListener("click", () => {
    if (isLocked) {
      showNotification("Clipboard is locked. Please unlock first.", "error");
      return;
    }
    const stickyTextArea = document.getElementById("stickyTextArea");
    const text = (currentViewMode === 'sticky' && stickyTextArea) ? stickyTextArea.value : clipboardTextArea.value;
    if (!text) {
      return showNotification(currentViewMode === 'sticky' ? "Sticky note is empty" : "Clipboard is empty", "info");
    }

    navigator.clipboard.writeText(text).then(() => {
      // Visual feedback
      const originalHtml = copyAllBtn.innerHTML;
      copyAllBtn.innerHTML = `<i data-lucide="check" class="h-4 w-4 mr-1.5 text-green-600"></i> Copied!`;
      lucide.createIcons();

      showNotification(currentViewMode === 'sticky' ? "Sticky note copied!" : "All content copied to clipboard!", "success");

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
    if (isLocked) {
      showNotification("Clipboard is locked. Please unlock first.", "error");
      return;
    }
    const stickyTextArea = document.getElementById("stickyTextArea");
    const text = (currentViewMode === 'sticky' && stickyTextArea) ? stickyTextArea.value : clipboardTextArea.value;
    if (!text) return showNotification("Nothing to export!", "info");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    // Format date for filename
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

    a.href = url;
    a.download = currentViewMode === 'sticky' ? `clipchain-sticky-${timestamp}.txt` : `clipchain-export-${timestamp}.md`;
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

  // Preserve the last known good value for reverting on unauthorised attempts
  selfDestructSelect.dataset.currentValue = value;

  // Update Firebase with new expiry, preserving all other fields
  clipboardRef.update({ expiresAt: expiresAt }).then(() => {
    if (expiresAt) {
      showNotification(`Timer set: Destructs in ${value}`, "success");
    } else {
      showNotification("Timer disabled", "info");
    }
  }).catch(err => {
    console.error("Error setting timer:", err);
    showNotification("Failed to update timer.", "error");
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
      const link = clipboardLink.href || clipboardLink.textContent;

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
  const hljsLight = document.getElementById("hljs-light-theme");
  const hljsDark = document.getElementById("hljs-dark-theme");

  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    if (themeToggle) themeToggle.checked = true;
    if (mobileThemeToggle) mobileThemeToggle.checked = true;
    if (hljsLight) hljsLight.disabled = true;
    if (hljsDark) hljsDark.disabled = false;
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
    if (themeToggle) themeToggle.checked = false;
    if (mobileThemeToggle) mobileThemeToggle.checked = false;
    if (hljsLight) hljsLight.disabled = false;
    if (hljsDark) hljsDark.disabled = true;
    localStorage.setItem("theme", "light");
  }

  // Sync mobile toggle button icon
  const mobileThemeBtn = document.getElementById("mobileThemeToggleBtn");
  if (mobileThemeBtn) {
    mobileThemeBtn.innerHTML = isDark
      ? '<i data-lucide="sun" class="h-5 w-5"></i>'
      : '<i data-lucide="moon" class="h-5 w-5"></i>';
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

if (themeToggle) {
  themeToggle.addEventListener("change", (e) => {
    setTheme(e.target.checked);
  });
}

if (mobileThemeToggleBtn) {
  mobileThemeToggleBtn.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(!isDark);
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

  saveHistory();
}

function saveHistory() {
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
      if (isLocked) {
        showNotification("Clipboard is locked. Please unlock first.", "error");
        return;
      }
      clipboardTextArea.value = item.text;
      clipboardRef.update({ text: item.text });
      updateCharCount();
      updateHighlight();
      if (currentViewMode !== 'edit') renderMarkdownPreview();
      showNotification('Restored from history', 'success');
    };

    historyList.appendChild(div);
  });
  lucide.createIcons();
}

function escapeHtml(text) {
  // B1 fix: removed duplicate return statement
  const div = document.createElement('div');
  div.textContent = text;
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
    saveHistory();
    showNotification("History cleared", "success");

    // Hide Overlay
    historyClearOverlay.classList.add("opacity-0");
    setTimeout(() => historyClearOverlay.classList.add("hidden"), 200);
  });
}

// Feedback Form Submission
if (feedbackForm) {
  feedbackForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("feedbackName").value;
    const email = document.getElementById("feedbackEmail").value;
    // B9 fix: null-check before accessing .value to prevent TypeError crash
    const ratingEl = document.querySelector('input[name="rating"]:checked');
    if (!ratingEl) {
      showNotification("Please select a star rating before submitting.", "error");
      return;
    }
    const rating = ratingEl.value;
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
}

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
  const stickyTextArea = document.getElementById("stickyTextArea");
  const count = (currentViewMode === 'sticky' && stickyTextArea) ? stickyTextArea.value.length : clipboardTextArea.value.length;
  charCountEl.textContent = `${count} character${count !== 1 ? 's' : ''}`;
  const dockCharCount = document.getElementById("dockCharCount");
  if (dockCharCount) {
    dockCharCount.textContent = `${count} character${count !== 1 ? 's' : ''}`;
  }
}

function showNotification(message, type = 'info', title = null) {
  // Context-aware smart titles
  if (!title) {
    const msgLower = message.toLowerCase();
    if (type === 'success') {
      if (msgLower.includes('joined') || msgLower.includes('room')) {
        title = 'Room Connected';
      } else if (msgLower.includes('copy') || msgLower.includes('copied')) {
        title = 'Copied to Clipboard';
      } else if (msgLower.includes('export')) {
        title = 'Export Successful';
      } else if (msgLower.includes('note') || msgLower.includes('sticky')) {
        title = 'Note Configured';
      } else if (msgLower.includes('password') || msgLower.includes('protect')) {
        title = 'Security Updated';
      } else {
        title = 'Action Completed';
      }
    } else if (type === 'error') {
      if (msgLower.includes('password') || msgLower.includes('lock')) {
        title = 'Access Denied';
      } else if (msgLower.includes('fail') || msgLower.includes('error')) {
        title = 'System Alert';
      } else {
        title = 'Alert';
      }
    } else if (type === 'warning') {
      title = 'Warning';
    } else {
      if (msgLower.includes('timer') || msgLower.includes('destruct')) {
        title = 'Destruct Timer';
      } else if (msgLower.includes('history')) {
        title = 'Clipboard History';
      } else {
        title = 'Notice';
      }
    }
  }

  // Bug 2 fix: Stack notifications above existing ones
  const existingNotifications = document.querySelectorAll('.notification');
  const stackOffset = existingNotifications.length * 88; // ~88px per card height + gap

  // Create notification container
  const notification = document.createElement('div');
  notification.className = 'notification hide';
  notification.style.bottom = `${24 + stackOffset}px`;

  // Bug 3 fix: map warning to an accent class, fallback info
  const accentClass = (type === 'success' || type === 'error' || type === 'info' || type === 'warning') ? type : 'info';
  
  // Embed specific status SVGs matching the designs
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(16, 185, 129, 0.25));">
        <circle cx="12" cy="12" r="10" fill="#10b981" stroke="#10b981"></circle>
        <polyline points="16 9 11 14 8 11" stroke="#ffffff" stroke-width="2.5"></polyline>
      </svg>
    `;
  } else if (type === 'error') {
    iconSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(239, 68, 68, 0.25));">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#ef4444" stroke="#ef4444"></path>
        <line x1="12" y1="9" x2="12" y2="13" stroke="#ffffff" stroke-width="2.5"></line>
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="#ffffff" stroke-width="3"></line>
      </svg>
    `;
  } else if (type === 'warning') {
    iconSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(245, 158, 11, 0.25));">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#f59e0b" stroke="#f59e0b"></path>
        <line x1="12" y1="9" x2="12" y2="13" stroke="#ffffff" stroke-width="2.5"></line>
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="#ffffff" stroke-width="3"></line>
      </svg>
    `;
  } else {
    // Info / Notice
    iconSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.25));">
        <circle cx="12" cy="12" r="10" fill="#6366f1" stroke="#6366f1"></circle>
        <line x1="12" y1="16" x2="12" y2="12" stroke="#ffffff" stroke-width="2.5"></line>
        <line x1="12" y1="8" x2="12.01" y2="8" stroke="#ffffff" stroke-width="3"></line>
      </svg>
    `;
  }

  notification.innerHTML = `
    <div class="notification-accent-bg ${accentClass}"></div>
    <div class="notification-grid"></div>
    <div class="notification-icon-badge">
      ${iconSvg}
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-desc">${message}</div>
    </div>
    <button class="notification-close" aria-label="Close notification">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;

  // Dismiss animation handler
  let isDismissed = false;
  const dismiss = () => {
    if (isDismissed) return;
    isDismissed = true;
    notification.classList.add('hide');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 450);
  };

  // Close button click listener
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      dismiss();
    };
  }

  // Click card to dismiss
  notification.onclick = () => {
    dismiss();
  };

  document.body.appendChild(notification);

  // Trigger visual transition from hide
  setTimeout(() => {
    notification.classList.remove('hide');
  }, 20);

  // Auto dismiss after duration
  setTimeout(() => {
    if (document.body.contains(notification) && !isDismissed) {
      dismiss();
    }
  }, 4000);
}

// Initialize character count
updateCharCount();

// Handle smooth scrolling for anchor links
// B5 fix: only intercept links whose target hash maps to a real DOM element.
// Clipboard IDs (e.g. /#myid) would have no matching element so they are
// now left alone and the browser handles normal navigation.
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (!targetId || targetId === '#') return;

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      e.preventDefault(); // Only prevent default when there IS a matching element
      window.scrollTo({
        top: targetElement.offsetTop - 80, // Offset for header
        behavior: 'smooth'
      });
    }
    // If no matching element found, let the browser handle the hash change naturally
  });
});

// Add resize listener to handle mobile menu state
window.addEventListener('resize', () => {
  if (mobileMenu && window.innerWidth >= 768 && !mobileMenu.classList.contains('translate-x-full')) {
    mobileMenu.classList.add('translate-x-full');
    document.body.style.overflow = '';
  }
});

// Auth presence and multiplayer collaboration disabled.

// Diff-Match concurrent merging implementation
function findDiff(oldStr, newStr) {
  let start = 0;
  while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
    start++;
  }
  
  let oldEnd = oldStr.length;
  let newEnd = newStr.length;
  while (oldEnd > start && newEnd > start && oldStr[oldEnd - 1] === newStr[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  
  return {
    start: start,
    removed: oldStr.slice(start, oldEnd),
    added: newStr.slice(start, newEnd),
    oldEnd: oldEnd,
    newEnd: newEnd
  };
}

function applyRemoteChange(remoteText) {
  const textarea = clipboardTextArea;
  if (!textarea) return;
  
  const localText = textarea.value;
  if (localText === remoteText) {
    lastKnownRemoteText = remoteText;
    return;
  }
  
  const diff = findDiff(lastKnownRemoteText, remoteText);
  
  // Apply diff to local text
  let cursorStart = textarea.selectionStart;
  let cursorEnd = textarea.selectionEnd;
  
  const localBefore = localText.slice(0, diff.start);
  const localAfter = localText.slice(diff.start + diff.removed.length);
  
  const newLocalText = localBefore + diff.added + localAfter;
  
  // Adjust cursor positions
  const addedLen = diff.added.length;
  const removedLen = diff.removed.length;
  const netShift = addedLen - removedLen;
  
  if (cursorStart >= diff.start + removedLen) {
    cursorStart += netShift;
  } else if (cursorStart > diff.start) {
    cursorStart = diff.start;
  }
  
  if (cursorEnd >= diff.start + removedLen) {
    cursorEnd += netShift;
  } else if (cursorEnd > diff.start) {
    cursorEnd = diff.start;
  }
  
  textarea.value = newLocalText;
  textarea.setSelectionRange(cursorStart, cursorEnd);
  

  
  lastKnownRemoteText = remoteText;
  updateCharCount();
  updateHighlight();
  if (currentViewMode !== 'edit') renderMarkdownPreview();
}

// Premium History Drawer toggle handler (with responsive slide open support)
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const historyDrawer = document.getElementById("historyDrawer");

if (toggleHistoryBtn && historyDrawer) {
  toggleHistoryBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    historyDrawer.classList.toggle("open");
  });
}

// Close history drawer when clicking outside
document.addEventListener("click", (e) => {
  if (historyDrawer && historyDrawer.classList.contains("open") && !historyDrawer.contains(e.target)) {
    if (e.target !== toggleHistoryBtn) {
      historyDrawer.classList.remove("open");
    }
  }
});

// Sticky Note Text Input Listener (Syncs back to database)
const stickyNoteTextarea = document.getElementById("stickyTextArea");
if (stickyNoteTextarea) {
  stickyNoteTextarea.addEventListener("input", () => {
    if (isLocked) {
      showNotification("Clipboard is locked. Please unlock first.", "error");
      return;
    }
    
    // Trigger database update for stickyText
    clipboardRef.update({ stickyText: stickyNoteTextarea.value });
    updateCharCount();
  });
}

// Sticky Note Color Picker & localStorage persistence
const stickyColorBtns = document.querySelectorAll(".sticky-color-btn");
const stickyNoteCard = document.getElementById("stickyNoteCard");

if (stickyColorBtns.length > 0 && stickyNoteCard && stickyNoteTextarea) {
  stickyColorBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Remove previous color gradients and border classes
      stickyNoteCard.className = stickyNoteCard.className.replace(/from-\S+ to-\S+/g, "");
      stickyNoteCard.className = stickyNoteCard.className.replace(/dark:from-\S+ dark:to-\S+/g, "");
      stickyNoteCard.className = stickyNoteCard.className.replace(/border-\S+/g, "");
      stickyNoteCard.className = stickyNoteCard.className.replace(/dark:border-\S+/g, "");
      
      stickyNoteTextarea.className = stickyNoteTextarea.className.replace(/text-\S+/g, "");
      stickyNoteTextarea.className = stickyNoteTextarea.className.replace(/dark:text-\S+/g, "");
      
      // Get config from button attributes
      const lightFrom = btn.getAttribute("data-light-from");
      const lightTo = btn.getAttribute("data-light-to");
      const darkFrom = btn.getAttribute("data-dark-from");
      const darkTo = btn.getAttribute("data-dark-to");
      const textLight = btn.getAttribute("data-text-light");
      const textDark = btn.getAttribute("data-text-dark");
      const borderLight = btn.getAttribute("data-border-light");
      const borderDark = btn.getAttribute("data-border-dark");
      const colorName = btn.getAttribute("data-color");
      
      // Apply new styling classes
      stickyNoteCard.classList.add(lightFrom, lightTo, `dark:${darkFrom}`, `dark:${darkTo}`, borderLight, `dark:${borderDark}`);
      stickyNoteTextarea.classList.add(textLight, `dark:${textDark}`);
      
      // Persist choice
      localStorage.setItem("stickyColor", colorName);
    });
  });
  
  // Apply saved sticky color choice
  const savedColor = localStorage.getItem("stickyColor") || "yellow";
  const activeBtn = Array.from(stickyColorBtns).find(btn => btn.getAttribute("data-color") === savedColor);
  if (activeBtn) {
    activeBtn.click();
  }
}

// ==========================================
// FLOATING STICKY NOTE SYSTEM LOGIC
// ==========================================

// Global functions for floating sticky note system (hoisted and globally accessible)
function loadActiveNoteData() {
  if (!activeNoteId || !floatingNotes[activeNoteId]) return;
  const curNote = floatingNotes[activeNoteId];
  
  const titleInput = document.getElementById("floatingNoteTitle");
  const textArea = document.getElementById("floatingNoteTextArea");
  
  if (titleInput) titleInput.value = curNote.title || "";
  if (textArea) textArea.value = curNote.content || "";
  
  updateNotePanelColorClass(curNote.color || "babyyellow");
  updateFloatingNoteCharCount();
}

function closeFloatingNotePanelDirectly() {
  const panel = document.getElementById("floatingStickyNote");
  if (panel) panel.classList.add("closed");
  const overlay = document.getElementById("floatingNoteOverlay");
  if (overlay) {
    overlay.classList.add("opacity-0");
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 350);
  }
}

function updateNotePanelColorClass(color) {
  const panel = document.getElementById("floatingStickyNote");
  if (!panel) return;
  
  panel.classList.remove(
    "note-theme-yellow", "note-theme-blue", "note-theme-green", "note-theme-pink", "note-theme-purple",
    "note-theme-babyblue", "note-theme-babyred", "note-theme-babypink", "note-theme-babypurple", "note-theme-babygreen", "note-theme-babyyellow"
  );
  panel.classList.add(`note-theme-${color}`);
}

function renderPinnedNotes() {
  const container = document.getElementById("pinnedNotesContainer");
  const panel = document.getElementById("floatingStickyNote");
  if (!container || !panel) return;
  
  container.innerHTML = "";
  
  const isPanelOpen = !panel.classList.contains("closed");
  
  Object.values(floatingNotes).forEach(note => {
    // If the panel is open, do not show the active note as a pinned badge
    if (isPanelOpen && note.id === activeNoteId) return;
    
    const tab = document.createElement("div");
    tab.className = `pinned-mini-note pointer-events-auto flex items-center justify-center w-12 h-14 rounded-l-2xl border border-r-0 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15)] cursor-pointer note-theme-${note.color || "babyyellow"}`;
    tab.dataset.noteId = note.id;
    tab.title = note.title || "Untitled Note";
    
    // Custom content inside side tab (first letter of heading or a note icon)
    const firstLetter = note.title ? note.title.trim().charAt(0) : "";
    if (firstLetter) {
      tab.innerHTML = `<span class="text-sm font-bold uppercase select-none text-current">${firstLetter}</span>`;
    } else {
      tab.innerHTML = `<i data-lucide="sticky-note" class="h-4.5 w-4.5 text-current"></i>`;
    }
    
    tab.addEventListener("click", () => {
      activeNoteId = note.id;
      loadActiveNoteData();
      openFloatingNotePanel();
    });
    
    container.appendChild(tab);
  });
  
  if (window.lucide) {
    lucide.createIcons();
  }
}

function updateFloatingNoteCharCount() {
  const textArea = document.getElementById("floatingNoteTextArea");
  const charCountSpan = document.getElementById("floatingNoteCharCount");
  if (textArea && charCountSpan) {
    const count = textArea.value.length;
    charCountSpan.textContent = `${count} character${count !== 1 ? 's' : ''}`;
  }
}

// Open the floating note editor panel
function openFloatingNotePanel() {
  if (isLocked) {
    showNotification("Clipboard is locked. Please unlock first.", "error");
    return;
  }
  
  const floatingStickyNote = document.getElementById("floatingStickyNote");
  const floatingNoteOverlay = document.getElementById("floatingNoteOverlay");
  
  if (!floatingStickyNote || !floatingNoteOverlay) return;
  
  // Slide note open
  floatingStickyNote.classList.remove("closed", "pinning");
  
  // Show overlay
  floatingNoteOverlay.classList.remove("hidden");
  setTimeout(() => {
    floatingNoteOverlay.classList.remove("opacity-0");
    floatingNoteOverlay.style.opacity = "1";
  }, 10);
  
  // Refresh side docked tabs (hiding the current active note tab)
  renderPinnedNotes();
  
  const textArea = document.getElementById("floatingNoteTextArea");
  if (textArea) {
    setTimeout(() => textArea.focus(), 100);
  }
}

// Done Button click (Pin the current note)
function pinActiveNote() {
  if (isLocked) {
    showNotification("Clipboard is locked. Please unlock first.", "error");
    return;
  }
  
  const floatingStickyNote = document.getElementById("floatingStickyNote");
  const floatingNoteOverlay = document.getElementById("floatingNoteOverlay");
  if (!floatingStickyNote || !floatingNoteOverlay) return;
  
  // Trigger fly-away / pinning collapse animation
  floatingStickyNote.classList.add("pinning");
  
  // Fade out backdrop blur overlay
  floatingNoteOverlay.classList.add("opacity-0");
  floatingNoteOverlay.style.opacity = "0";
  
  // Update state database
  if (activeNoteId) {
    const titleInput = document.getElementById("floatingNoteTitle");
    const textArea = document.getElementById("floatingNoteTextArea");
    db.ref(`clipboards/${username}/floatingNotes/${activeNoteId}`).update({
      title: titleInput ? titleInput.value.trim() : "",
      content: textArea ? textArea.value : ""
    });
  }
  
  setTimeout(() => {
    floatingStickyNote.classList.add("closed");
    floatingStickyNote.classList.remove("pinning");
    floatingNoteOverlay.classList.add("hidden");
    
    // Re-render sidebar to show all notes as tabs (including this one)
    renderPinnedNotes();
  }, 450);
  
  showNotification("Note pinned to side edge", "success");
}

// Controller Initialization
document.addEventListener("DOMContentLoaded", () => {
  const dockStickyBtn = document.getElementById("dockStickyBtn");
  const dockAddStickyBtn = document.getElementById("dockAddStickyBtn");
  const closeFloatingNoteBtn = document.getElementById("closeFloatingNoteBtn");
  const doneFloatingNoteBtn = document.getElementById("doneFloatingNoteBtn");
  const deleteFloatingNoteBtn = document.getElementById("deleteFloatingNoteBtn");
  const floatingNoteTitle = document.getElementById("floatingNoteTitle");
  const floatingNoteTextArea = document.getElementById("floatingNoteTextArea");
  const colorPresetsDiv = document.getElementById("noteColorPresets");
  const floatingNoteOverlay = document.getElementById("floatingNoteOverlay");

  if (!dockStickyBtn) return;

  // Toggle notes manager from dock
  dockStickyBtn.addEventListener("click", () => {
    if (isLocked) {
      showNotification("Clipboard is locked. Please unlock first.", "error");
      return;
    }
    
    // If no notes exist, spin a default one up
    const noteIds = Object.keys(floatingNotes);
    if (noteIds.length === 0) {
      const newId = "note_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const defaultNote = {
        id: newId,
        title: "Ideas",
        content: "",
        color: "babyyellow"
      };
      activeNoteId = newId;
      db.ref(`clipboards/${username}/floatingNotes/${newId}`).set(defaultNote).then(() => {
        loadActiveNoteData();
        openFloatingNotePanel();
      });
    } else {
      // Open the first note, or current active one
      if (!activeNoteId || !floatingNotes[activeNoteId]) {
        activeNoteId = noteIds[0];
      }
      loadActiveNoteData();
      openFloatingNotePanel();
    }
  });

  // "+ Add Sticky Note" click handler directly on the dock button
  if (dockAddStickyBtn) {
    dockAddStickyBtn.addEventListener("click", () => {
      if (isLocked) {
        showNotification("Clipboard is locked. Please unlock first.", "error");
        return;
      }
      
      // Save changes of the currently open note if the panel is open
      const panel = document.getElementById("floatingStickyNote");
      const isPanelOpen = panel && !panel.classList.contains("closed");
      if (isPanelOpen && activeNoteId) {
        db.ref(`clipboards/${username}/floatingNotes/${activeNoteId}`).update({
          title: floatingNoteTitle ? floatingNoteTitle.value.trim() : "",
          content: floatingNoteTextArea ? floatingNoteTextArea.value : ""
        });
      }

      // Create new note
      const newId = "note_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      const newNote = {
        id: newId,
        title: "Heading " + (Object.keys(floatingNotes).length + 1),
        content: "",
        color: "babyblue"
      };
      
      activeNoteId = newId;
      db.ref(`clipboards/${username}/floatingNotes/${newId}`).set(newNote).then(() => {
        loadActiveNoteData();
        openFloatingNotePanel();
        showNotification("New sticky note created", "success");
      });
    });
  }

  // Close floating notes panel
  if (closeFloatingNoteBtn) {
    closeFloatingNoteBtn.addEventListener("click", () => {
      // Save changes before closing
      if (activeNoteId) {
        db.ref(`clipboards/${username}/floatingNotes/${activeNoteId}`).update({
          title: floatingNoteTitle ? floatingNoteTitle.value.trim() : "",
          content: floatingNoteTextArea ? floatingNoteTextArea.value : ""
        });
      }
      closeFloatingNotePanelDirectly();
    });
  }

  // Done button pins the note
  if (doneFloatingNoteBtn) {
    doneFloatingNoteBtn.addEventListener("click", pinActiveNote);
  }

  // Overlay click closes panel and saves note
  if (floatingNoteOverlay) {
    floatingNoteOverlay.addEventListener("click", () => {
      if (activeNoteId) {
        db.ref(`clipboards/${username}/floatingNotes/${activeNoteId}`).update({
          title: floatingNoteTitle ? floatingNoteTitle.value.trim() : "",
          content: floatingNoteTextArea ? floatingNoteTextArea.value : ""
        });
      }
      closeFloatingNotePanelDirectly();
    });
  }

  // "Delete Note" click
  if (deleteFloatingNoteBtn) {
    deleteFloatingNoteBtn.addEventListener("click", () => {
      if (!activeNoteId) return;
      if (isLocked) {
        showNotification("Clipboard is locked. Please unlock first.", "error");
        return;
      }
      
      const targetId = activeNoteId;
      db.ref(`clipboards/${username}/floatingNotes/${targetId}`).set(null).then(() => {
        showNotification("Sticky note deleted", "info");
      });
    });
  }

  // Sync inputs locally in realtime to Firebase
  let syncNoteDebounce;
  const syncLocalNoteInputs = () => {
    if (!activeNoteId || isLocked) return;
    clearTimeout(syncNoteDebounce);
    syncNoteDebounce = setTimeout(() => {
      db.ref(`clipboards/${username}/floatingNotes/${activeNoteId}`).update({
        title: floatingNoteTitle ? floatingNoteTitle.value.trim() : "",
        content: floatingNoteTextArea ? floatingNoteTextArea.value : ""
      });
    }, 400); // 400ms debounce
    updateFloatingNoteCharCount();
  };

  if (floatingNoteTitle) {
    floatingNoteTitle.addEventListener("input", syncLocalNoteInputs);
  }
  if (floatingNoteTextArea) {
    floatingNoteTextArea.addEventListener("input", syncLocalNoteInputs);
  }

  // Color presets click listener
  if (colorPresetsDiv) {
    colorPresetsDiv.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || !activeNoteId || isLocked) return;
      
      const newColor = btn.getAttribute("data-color");
      if (newColor) {
        db.ref(`clipboards/${username}/floatingNotes/${activeNoteId}`).update({
          color: newColor
        });
      }
    });
  }
});

// ==========================================================================
// FLOATING COMMAND PALETTE SYSTEM (Notion & Linear Inspired Glassmorphism)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const backdrop = document.getElementById("commandPaletteBackdrop");
  const card = document.getElementById("commandPaletteCard");
  const paletteSearchInput = document.getElementById("paletteSearchInput");
  const commandsList = document.getElementById("paletteCommandsList");
  const navBtn = document.getElementById("navCommandPaletteBtn");
  const mobileNavBtn = document.getElementById("mobileNavCommandPaletteBtn");
  
  const calcView = document.getElementById("paletteCalculatorView");
  const calendarView = document.getElementById("paletteCalendarView");
  
  if (!card) return;

  let activeView = 'main'; // 'main' | 'calculator' | 'calendar'
  let selectedItem = null;
  
  // Toggle palette visibility
  const openCommandPalette = () => {
    backdrop.classList.add("open");
    card.classList.add("open");
    switchView('main');
    paletteSearchInput.value = "";
    filterCommands();
    setTimeout(() => {
      paletteSearchInput.focus();
    }, 50);
  };

  const closeCommandPalette = () => {
    backdrop.classList.remove("open");
    card.classList.remove("open");
    paletteSearchInput.blur();
  };

  const toggleCommandPalette = () => {
    if (card.classList.contains("open")) {
      closeCommandPalette();
    } else {
      openCommandPalette();
    }
  };

  // Switch Sub-View (Widgets or Commands List)
  const switchView = (view) => {
    activeView = view;
    
    // Reset displays
    commandsList.style.display = "block";
    calcView.classList.remove("open");
    calendarView.classList.remove("open");
    
    const header = card.querySelector(".palette-header");
    if (header) header.style.display = "flex";
    
    if (view === 'calculator') {
      commandsList.style.display = "none";
      calcView.classList.add("open");
      if (header) header.style.display = "none";
      resetCalculator();
    } else if (view === 'calendar') {
      commandsList.style.display = "none";
      calendarView.classList.add("open");
      if (header) header.style.display = "none";
      initCalendar();
    } else {
      // Main View
      paletteSearchInput.value = "";
      filterCommands();
      setTimeout(() => {
        paletteSearchInput.focus();
      }, 50);
    }
  };

  // Keyboard and Button triggers for open/close
  if (navBtn) navBtn.addEventListener("click", openCommandPalette);
  if (mobileNavBtn) mobileNavBtn.addEventListener("click", openCommandPalette);
  if (backdrop) backdrop.addEventListener("click", closeCommandPalette);

  // Global Keydown Listener for Cmd+K / Ctrl+K & Hotkeys
  document.addEventListener("keydown", (e) => {
    const isMeta = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    
    // Toggle command palette: Cmd/Ctrl + K
    if (isMeta && key === 'k') {
      e.preventDefault();
      toggleCommandPalette();
      return;
    }
    
    // Global action shortcuts, only if user is not actively typing in an input/textarea
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    
    if (isMeta && !isTyping) {
      if (key === 'n') {
        e.preventDefault();
        executeAction('create-note');
      } else if (key === 'g') {
        e.preventDefault();
        executeAction('switch-room');
      } else if (key === 'e') {
        e.preventDefault();
        executeAction('export');
      } else if (key === 'f') {
        e.preventDefault();
        executeAction('search');
      } else if (key === 'd') {
        e.preventDefault();
        executeAction('theme');
      } else if (key === 'l') {
        e.preventDefault();
        executeAction('lock');
      }
    }
  });

  // Filter commands on search input (Fuzzy Match / Substring Match)
  const filterCommands = () => {
    const query = paletteSearchInput.value.toLowerCase().trim();
    const categories = card.querySelectorAll(".palette-category");
    let firstVisibleItem = null;
    
    categories.forEach(category => {
      const items = category.querySelectorAll(".command-item");
      let hasVisible = false;
      items.forEach(item => {
        const name = item.querySelector(".command-item-name").textContent.toLowerCase();
        const desc = item.querySelector(".command-item-desc").textContent.toLowerCase();
        if (name.includes(query) || desc.includes(query)) {
          item.style.display = "flex";
          hasVisible = true;
          if (!firstVisibleItem) {
            firstVisibleItem = item;
          }
        } else {
          item.style.display = "none";
        }
      });
      
      if (hasVisible) {
        category.style.display = "block";
      } else {
        category.style.display = "none";
      }
    });
    
    updateSelection(firstVisibleItem);
  };

  paletteSearchInput.addEventListener("input", filterCommands);

  // Keyboard navigation & inputs inside the Command Palette
  card.addEventListener("keydown", (e) => {
    if (!card.classList.contains("open")) return;
    
    const key = e.key;
    
    if (activeView === 'main') {
      if (key === "ArrowDown") {
        e.preventDefault();
        navigateCommands("down");
      } else if (key === "ArrowUp") {
        e.preventDefault();
        navigateCommands("up");
      } else if (key === "Enter") {
        e.preventDefault();
        if (selectedItem) {
          selectedItem.click();
        }
      } else if (key === "Escape") {
        e.preventDefault();
        closeCommandPalette();
      }
    } else if (activeView === 'calculator') {
      if (key === "Escape") {
        e.preventDefault();
        switchView('main');
      } else if (key === "Enter") {
        e.preventDefault();
        evaluateCalculator();
      } else if (key === "Backspace") {
        e.preventDefault();
        handleCalculatorInput("back");
      } else if (/^[0-9+\-*/.c=]$/i.test(key)) {
        e.preventDefault();
        let val = key;
        if (val.toLowerCase() === 'c') val = 'C';
        handleCalculatorInput(val);
      }
    } else if (activeView === 'calendar') {
      if (key === "Escape") {
        e.preventDefault();
        switchView('main');
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        changeCalendarMonth(-1);
      } else if (key === "ArrowRight") {
        e.preventDefault();
        changeCalendarMonth(1);
      }
    }
  });

  // Update selection highlight
  const updateSelection = (item) => {
    if (selectedItem) {
      selectedItem.classList.remove("selected");
    }
    selectedItem = item;
    if (selectedItem) {
      selectedItem.classList.add("selected");
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  };

  const navigateCommands = (direction) => {
    const items = Array.from(card.querySelectorAll(".command-item"))
                       .filter(item => item.style.display !== "none");
    if (items.length === 0) return;
    
    let index = items.indexOf(selectedItem);
    if (direction === "down") {
      index = (index + 1) % items.length;
    } else if (direction === "up") {
      index = (index - 1 + items.length) % items.length;
    }
    updateSelection(items[index]);
  };

  // Command Item Click events
  card.querySelectorAll(".command-item").forEach(item => {
    item.addEventListener("click", () => {
      const action = item.getAttribute("data-action");
      executeAction(action);
    });
  });

  // Execute Action Router
  const executeAction = (action) => {
    // Close command palette before running standard actions to prevent overlays/modals overlapping
    if (action !== 'widget-calculator' && action !== 'widget-calendar') {
      closeCommandPalette();
    }

    // Bug 1 fix: wrap each case that declares variables in its own block scope
    switch (action) {
      case 'create-note': {
        const dockAddStickyBtn = document.getElementById("dockAddStickyBtn");
        if (dockAddStickyBtn) {
          dockAddStickyBtn.click();
        } else {
          showNotification("Could not create sticky note", "error");
        }
        break;
      }
      case 'switch-room': {
        setTimeout(() => {
          const newRoom = prompt("Enter room ID to join or create:", username);
          if (newRoom && newRoom.trim() && newRoom.trim() !== username) {
            if (usernameInput && setUsernameBtn) {
              usernameInput.value = newRoom.trim();
              setUsernameBtn.click();
            }
          }
        }, 150);
        break;
      }
      case 'export': {
        const exportBtn = document.getElementById("exportBtn");
        if (exportBtn) {
          exportBtn.click();
        } else {
          showNotification("Export failed", "error");
        }
        break;
      }
      case 'search': {
        if (searchInput) {
          setTimeout(() => {
            searchInput.focus();
            searchInput.select();
          }, 150);
        }
        break;
      }
      case 'theme': {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        setTheme(!isDark);
        showNotification(`Theme switched to ${!isDark ? 'Dark' : 'Light'}`, "success");
        break;
      }
      case 'lock': {
        const lockToggleBtn = document.getElementById("lockToggleBtn");
        if (lockToggleBtn) {
          lockToggleBtn.click();
        }
        break;
      }
      case 'widget-calculator':
        switchView('calculator');
        break;
      case 'widget-calendar':
        switchView('calendar');
        break;
      default:
        console.warn("Unknown palette action:", action);
    }
  };

  // --- Calculator Logic ---
  let calcExpression = "";
  
  const resetCalculator = () => {
    calcExpression = "";
    document.getElementById("calcExpr").textContent = "";
    document.getElementById("calcResult").textContent = "0";
  };

  const handleCalculatorInput = (val) => {
    const exprEl = document.getElementById("calcExpr");
    const resEl = document.getElementById("calcResult");
    
    if (val === "C") {
      resetCalculator();
    } else if (val === "back") {
      calcExpression = calcExpression.slice(0, -1);
      exprEl.textContent = calcExpression;
      updateCalcLivePreview();
    } else if (val === "=") {
      evaluateCalculator();
    } else {
      if (/^[0-9+\-*/.]$/.test(val)) {
        calcExpression += val;
        exprEl.textContent = calcExpression;
        updateCalcLivePreview();
      }
    }
  };

  const updateCalcLivePreview = () => {
    const resEl = document.getElementById("calcResult");
    if (!calcExpression) {
      resEl.textContent = "0";
      return;
    }
    try {
      const sanitized = calcExpression.replace(/[^0-9+\-*/.]/g, "");
      if (sanitized) {
        const res = Function(`"use strict"; return (${sanitized})`)();
        if (res !== undefined && !isNaN(res) && isFinite(res)) {
          resEl.textContent = res;
        }
      }
    } catch (err) {}
  };

  const evaluateCalculator = () => {
    const resEl = document.getElementById("calcResult");
    const exprEl = document.getElementById("calcExpr");
    if (!calcExpression) return;
    
    try {
      const sanitized = calcExpression.replace(/[^0-9+\-*/.]/g, "");
      const res = Function(`"use strict"; return (${sanitized})`)();
      if (res !== undefined && !isNaN(res) && isFinite(res)) {
        resEl.textContent = res;
        calcExpression = res.toString();
        exprEl.textContent = "";
      } else {
        resEl.textContent = "Error";
      }
    } catch (err) {
      resEl.textContent = "Error";
    }
  };

  // Calculator mouse click binds
  const calcViewEl = document.getElementById("paletteCalculatorView");
  if (calcViewEl) {
    calcViewEl.querySelectorAll(".calc-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-val");
        handleCalculatorInput(val);
      });
    });
  }
  
  const calcBackBtn = document.getElementById("calcBackBtn");
  if (calcBackBtn) calcBackBtn.addEventListener("click", () => switchView('main'));

  // --- Calendar Logic ---
  let calendarDate = new Date();
  
  const initCalendar = () => {
    calendarDate = new Date(); // Reset to current month
    renderCalendar();
  };

  const renderCalendar = () => {
    const monthYearEl = document.getElementById("calendarMonthYear");
    const gridEl = document.getElementById("calendarGrid");
    if (!monthYearEl || !gridEl) return;
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
    
    gridEl.innerHTML = "";
    
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    dayNames.forEach(day => {
      const headerEl = document.createElement("div");
      headerEl.className = "calendar-day-header";
      headerEl.textContent = day;
      gridEl.appendChild(headerEl);
    });
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const cell = document.createElement("div");
      cell.className = "calendar-day-cell other-month";
      cell.textContent = prevMonthTotalDays - i;
      gridEl.appendChild(cell);
    }
    
    const today = new Date();
    for (let d = 1; d <= totalDays; d++) {
      const cell = document.createElement("div");
      cell.className = "calendar-day-cell";
      cell.textContent = d;
      
      if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        cell.classList.add("today");
      }
      
      gridEl.appendChild(cell);
    }
    
    // Bug 5 fix: use Math.max to ensure remainingCells is never negative
    const totalCellsSoFar = firstDayIndex + totalDays;
    const totalRows = Math.ceil(totalCellsSoFar / 7);
    const totalCells = totalRows * 7;
    const remainingCells = Math.max(0, totalCells - totalCellsSoFar);
    for (let n = 1; n <= remainingCells; n++) {
      const cell = document.createElement("div");
      cell.className = "calendar-day-cell other-month";
      cell.textContent = n;
      gridEl.appendChild(cell);
    }
  };

  const changeCalendarMonth = (offset) => {
    calendarDate.setMonth(calendarDate.getMonth() + offset);
    renderCalendar();
  };

  const prevMonthBtn = document.getElementById("calendarPrevMonthBtn");
  const nextMonthBtn = document.getElementById("calendarNextMonthBtn");
  const calendarBackBtn = document.getElementById("calendarBackBtn");
  
  if (prevMonthBtn) prevMonthBtn.addEventListener("click", () => changeCalendarMonth(-1));
  if (nextMonthBtn) nextMonthBtn.addEventListener("click", () => changeCalendarMonth(1));
  if (calendarBackBtn) calendarBackBtn.addEventListener("click", () => switchView('main'));
});


