// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDdkDejbR5xip6kFfYWFmme4mdwyfRqpM8",
    authDomain: "hybrid-chat-ff673.firebaseapp.com",
    databaseURL: "https://hybrid-chat-ff673-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hybrid-chat-ff673",
    storageBucket: "hybrid-chat-ff673.firebasestorage.app",
    messagingSenderId: "51085027070",
    appId: "1:51085027070:web:50ec55523721cea9c9a7af",
    measurementId: "G-TLN2LCLMXC"
};

// Users Configuration
const USERS = {
    'anik': { id: 'anik', name: 'Anik', color: '#FF6B6B' },
    'priya': { id: 'priya', name: 'Priya', color: '#4FACFE' }
};

// Application State
let currentUserId = null;
let otherUserId = null;
let isFirstVisit = true;
let isAtBottom = true;
let unreadCount = 0;
let lastMessageTypeType = null;
let typingTimeout = null;

// Firebase References
let app, db, storage;
let messagesRef, otherUserStatusRef, currentUserStatusRef, currentUserTypingRef;

// DOM Elements
const els = {
    homepage: document.getElementById('homepage'),
    chatscreen: document.getElementById('chatscreen'),
    homeHeader: document.getElementById('homeHeader'),
    homeLogo: document.getElementById('homeLogo'),
    homeWelcome: document.getElementById('homeWelcome'),
    userCards: document.querySelectorAll('.user-card'),

    // Chat Header
    chatHeaderAvatar: document.getElementById('chatHeaderAvatar'),
    chatHeaderName: document.getElementById('chatHeaderName'),
    chatStatusWrapper: document.getElementById('chatStatusWrapper'),
    chatHeaderStatus: document.getElementById('chatHeaderStatus'),
    chatHeaderStatusNext: document.getElementById('chatHeaderStatusNext'),
    onlineDot: document.getElementById('onlineDot'),
    backBtn: document.getElementById('backBtn'),
    menuBtn: document.getElementById('menuBtn'),

    // Chat Area
    chatWallpaper: document.getElementById('chatWallpaper'),
    messagesArea: document.getElementById('messagesArea'),
    messagesContainer: document.getElementById('messagesContainer'),
    messagesTopGlow: document.getElementById('messagesTopGlow'),
    skeletonLoader: document.getElementById('skeletonLoader'),
    typingIndicator: document.getElementById('typingIndicator'),
    scrollBottomBtn: document.getElementById('scrollBottomBtn'),
    unreadBadge: document.getElementById('unreadBadge'),

    // Input Area
    chatInputArea: document.getElementById('chatInputArea'),
    inputContainer: document.getElementById('inputContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    attachBtn: document.getElementById('attachBtn'),
    emojiBtn: document.getElementById('emojiBtn'),

    // Modals
    blurOverlay: document.getElementById('blurOverlay'),
    transparentOverlay: document.getElementById('transparentOverlay'),
    dropdownMenu: document.getElementById('dropdownMenu'),
    attachmentMenu: document.getElementById('attachmentMenu'),
    confirmDialog: document.getElementById('confirmDialog'),
    toastContainer: document.getElementById('toastContainer')
};

// ==========================================
// 1. RIPPLE ENGINE (Part I)
// ==========================================
document.addEventListener('mousedown', createRipple);
document.addEventListener('touchstart', createRipple, { passive: true });

function createRipple(event) {
    const target = event.target.closest('.ripple-effect-js');
    if (!target) return;

    // Check if element is disabled or read-only
    if (target.disabled) return;

    const rect = target.getBoundingClientRect();

    // Get touch or click coordinates
    let clientX, clientY;
    if (event.type === 'touchstart') {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Calculate maximum distance to corners for ripple size
    const corners = [
        { x: 0, y: 0 },
        { x: rect.width, y: 0 },
        { x: 0, y: rect.height },
        { x: rect.width, y: rect.height }
    ];
    let maxDist = 0;
    for (const corner of corners) {
        const dist = Math.sqrt(Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2));
        if (dist > maxDist) maxDist = dist;
    }

    const ripple = document.createElement('span');
    ripple.className = 'ripple';

    // Determine color based on element background context (approximate)
    if (target.classList.contains('delete-btn')) {
        ripple.style.setProperty('--ripple-color', 'rgba(255, 0, 0, 0.2)');
    } else if (target.closest('.chat-header') || target.classList.contains('action-btn-container')) {
        ripple.style.setProperty('--ripple-color', 'rgba(255, 255, 255, 0.3)');
    } else {
        ripple.style.setProperty('--ripple-color', 'rgba(0, 0, 0, 0.08)');
    }

    const size = maxDist * 2;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;

    target.appendChild(ripple);

    // Remove span after animation completes
    setTimeout(() => ripple.remove(), 600);
}


// ==========================================
// 2. INITIALIZATION & ENTRANCE (Part B)
// ==========================================
window.onload = () => {
    initFirebase();
    triggerHomepageEntrance();
};

function triggerHomepageEntrance() {
    if (!isFirstVisit) {
        els.homepage.classList.add('quick-fade-in');
        return;
    }

    // Staggered sequence
    els.homeHeader.classList.add('animate-in');
    els.homeLogo.classList.add('animate-in');
    els.homeWelcome.classList.add('animate-in');

    els.userCards.forEach(card => card.classList.add('animate-in'));
    els.userCards.forEach(card => {
        const avatar = card.querySelector('.avatar-ph');
        if (avatar) avatar.classList.add('animate-in');
    });

    isFirstVisit = false;
}

// ==========================================
// 3. NAVIGATION (Part A)
// ==========================================
function selectUser(userId) {
    if (!app) {
        showToast("Waiting for Firebase Connection...", "error");
        return;
    }

    currentUserId = userId;
    otherUserId = userId === 'anik' ? 'priya' : 'anik';

    // Visual Tap Bounce
    const selectedCard = document.querySelector(`.user-${userId}`);
    if (selectedCard) {
        selectedCard.classList.add('tap-bounce');
        setTimeout(() => selectedCard.classList.remove('tap-bounce'), 200);
    }

    // Setup Chat UI
    const otherUser = USERS[otherUserId];
    els.chatHeaderAvatar.textContent = otherUser.name.charAt(0);
    els.chatHeaderAvatar.className = `chat-avatar avatar-${otherUserId}`;
    els.chatHeaderName.childNodes[0].textContent = otherUser.name + " ";

    // Wait for card tap animation to finish (0.15s), then transition
    setTimeout(() => {
        transitionToChat();
        setupFirebaseListeners();
        setupUserPresence();
    }, 150);
}

function transitionToChat() {
    // Both screens animating
    els.homepage.classList.add('animating');
    els.chatscreen.classList.add('animating');
    els.chatscreen.classList.add('active'); // Needs to be display block

    // Apply animation classes
    els.homepage.classList.add('screen-exit-to-left');
    els.chatscreen.classList.add('screen-enter-from-right');

    // Clean up classes after animation (0.45s)
    setTimeout(() => {
        els.homepage.classList.remove('animating', 'screen-exit-to-left', 'active');
        els.chatscreen.classList.remove('animating', 'screen-enter-from-right');

        triggerChatscreenEntrance();
    }, 450);
}

function goBack() {
    els.backBtn.classList.add('bounce-back');

    setTimeout(() => {
        els.homepage.classList.add('animating', 'active');
        els.chatscreen.classList.add('animating');

        els.homepage.classList.add('screen-enter-from-left');
        els.chatscreen.classList.add('screen-exit-to-right');

        setTimeout(() => {
            els.chatscreen.classList.remove('animating', 'screen-exit-to-right', 'active');
            els.homepage.classList.remove('animating', 'screen-enter-from-left');

            // Clean up chat state safely
            cleanupUserPresence();

            // Re-trigger quick fade for home if necessary
            els.homepage.classList.add('quick-fade-in');
            setTimeout(() => els.homepage.classList.remove('quick-fade-in'), 300);

            // Reset chat entrance classes
            resetChatscreenEntrance();
        }, 400);
    }, 100);
}

// ==========================================
// 4. CHAT SCREEN CHOREOGRAPHY (Part C)
// ==========================================
function triggerChatscreenEntrance() {
    els.backBtn.classList.add('animate-in');
    els.chatHeaderAvatar.classList.add('animate-in');
    els.chatHeaderName.classList.add('animate-in');
    els.chatStatusWrapper.classList.add('animate-in');
    els.menuBtn.classList.add('animate-in');

    els.chatWallpaper.classList.add('animate-in');
    els.chatInputArea.classList.add('animate-in');

    // Load messages is called from firebase listener, but we show skeleton immediately
}

function resetChatscreenEntrance() {
    const arr = [els.backBtn, els.chatHeaderAvatar, els.chatHeaderName, els.chatStatusWrapper,
    els.menuBtn, els.chatWallpaper, els.chatInputArea];
    arr.forEach(el => el.classList.remove('animate-in'));
    els.messagesContainer.innerHTML = '';
    els.messagesContainer.classList.remove('batch-animate-in');
    els.skeletonLoader.classList.remove('fade-out');
    els.skeletonLoader.style.display = 'flex';
    els.messagesContainer.appendChild(els.skeletonLoader);

    // Clear listeners
    if (messagesRef) messagesRef.off();
    if (otherUserStatusRef) otherUserStatusRef.off();
    if (currentUserStatusRef) currentUserStatusRef.onDisconnect().cancel();
}

// ==========================================
// 5. OBSERVER AND SCROLL ANIMATIONS (Part H)
// ==========================================
const messageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            if (entry.target.classList.contains('message-bubble') && !entry.target.classList.contains('history-reveal')) {
                // Wait for batch load before revealing
                if (els.messagesContainer.classList.contains('batch-animate-in')) {
                    entry.target.classList.add('history-reveal');
                    messageObserver.unobserve(entry.target);
                }
            }
        }
    });
}, { root: els.messagesArea, threshold: 0.1 });

els.messagesArea.addEventListener('scroll', () => {
    // 1. Scroll-to-bottom button visibility
    const distanceFromBottom = els.messagesArea.scrollHeight - els.messagesArea.scrollTop - els.messagesArea.clientHeight;
    isAtBottom = distanceFromBottom < 50;

    if (distanceFromBottom > 200) {
        els.scrollBottomBtn.classList.add('show');
    } else {
        els.scrollBottomBtn.classList.remove('show');
        if (unreadCount > 0) {
            unreadCount = 0;
            updateUnreadBadge();
            markVisibleMessagesAsRead();
        }
    }

    // 2. Header shadow
    if (els.messagesArea.scrollTop > 5) {
        els.chatHeader.classList.add('scrolled');
    } else {
        els.chatHeader.classList.remove('scrolled');
    }

    // 3. Overscroll top glow
    if (els.messagesArea.scrollTop < 0) {
        // Safari/iOS overscroll
        const opacity = Math.min(Math.abs(els.messagesArea.scrollTop) / 100, 1);
        els.messagesTopGlow.style.opacity = opacity;
    } else {
        els.messagesTopGlow.style.opacity = 0;
    }
});

function scrollToBottom(smooth = false) {
    if (smooth) {
        els.messagesArea.scrollTo({ top: els.messagesArea.scrollHeight, behavior: 'smooth' });
    } else {
        els.messagesArea.scrollTop = els.messagesArea.scrollHeight;
    }
    isAtBottom = true;
    unreadCount = 0;
    updateUnreadBadge();
}

function updateUnreadBadge() {
    if (unreadCount > 0) {
        els.unreadBadge.textContent = unreadCount;
        els.unreadBadge.classList.add('show');
        // Quick flip anim
        els.unreadBadge.classList.remove('flip');
        void els.unreadBadge.offsetWidth; // reflow
        els.unreadBadge.classList.add('flip');
    } else {
        els.unreadBadge.classList.remove('show');
    }
}

// ==========================================
// 6. INPUT BAR MICRO-ANIMATIONS (Part E)
// ==========================================
els.messageInput.addEventListener('input', () => {
    // Clean html issues from contenteditable 
    if (els.messageInput.innerHTML === '<br>') els.messageInput.innerHTML = '';

    const text = els.messageInput.textContent.trim();

    // Auto-expand
    els.messageInput.style.maxHeight = '120px';

    // Morph Mic/Send Pattern
    if (text.length > 0) {
        if (!els.sendBtn.classList.contains('send-mode')) {
            els.sendBtn.classList.add('send-mode');
            els.sendBtn.classList.add('focused-pulse');
            setTimeout(() => els.sendBtn.classList.remove('focused-pulse'), 300);
        }
        setTypingStatus(true);
    } else {
        if (els.sendBtn.classList.contains('send-mode')) {
            els.sendBtn.classList.remove('send-mode');
        }
        setTypingStatus(false);
    }
});

els.messageInput.addEventListener('focus', () => els.inputContainer.classList.add('focused'));
els.messageInput.addEventListener('blur', () => els.inputContainer.classList.remove('focused'));

els.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendAction();
    }
});

els.emojiBtn.addEventListener('click', () => {
    els.emojiBtn.classList.add('wiggle');
    setTimeout(() => els.emojiBtn.classList.remove('wiggle'), 500);
});

// Close emoji picker when user taps the text input
els.messageInput.addEventListener('focus', () => {
    if (document.getElementById('emojiPickerPanel').classList.contains('show')) {
        toggleEmojiPicker(); // Close the picker
    }
});

// ==========================================
// 7. FIREBASE INTEGRATION & MESSAGING
// ==========================================
function initFirebase() {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        storage = firebase.storage();
    }
    showToast("Connected to Firebase", "success");
}

function handleSendAction() {
    if (els.sendBtn.classList.contains('send-mode')) {
        const text = els.messageInput.textContent.trim();
        if (text) {
            // Animate button launch
            els.sendBtn.classList.add('fly-away');
            setTimeout(() => els.sendBtn.classList.remove('fly-away'), 300);

            sendMessage(text, 'text');
            els.messageInput.innerHTML = '';
            els.sendBtn.classList.remove('send-mode');
            setTypingStatus(false);
        }
    } else {
        // Mic action placeholder
        showToast("Hold to record audio (Demo)", "");
    }
}

function sendMessage(text, type, imageUrl = '') {
    if (!db || !currentUserId) return;
    const scrollSmoothly = isAtBottom; // Check BEFORE adding to DOM to know if we should scroll smooth

    const msgData = {
        senderId: currentUserId,
        receiverId: otherUserId,
        text: type === 'text' ? text : '',
        imageUrl: type === 'image' ? imageUrl : '',
        type: type,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        read: false
    };

    db.ref('messages').push(msgData).then(() => {
        if (scrollSmoothly) scrollToBottom(true);
    });
}

// Single listener that handles both initial batch rendering and new messages
function setupFirebaseListeners() {
    if (!db) return;

    messagesRef = db.ref('messages');
    let isInitialLoad = true;
    let initialMessages = [];

    messagesRef.once('value').then(snapshot => {
        els.skeletonLoader.classList.add('fade-out');
        setTimeout(() => els.skeletonLoader.style.display = 'none', 200);

        snapshot.forEach(child => {
            const msg = child.val();
            if ((msg.senderId === currentUserId && msg.receiverId === otherUserId) ||
                (msg.senderId === otherUserId && msg.receiverId === currentUserId)) {
                initialMessages.push({ key: child.key, data: msg });
            }
        });

        // Render batch
        let lastDate = null;
        initialMessages.forEach(item => {
            const dateStr = new Date(item.data.timestamp).toDateString();
            if (dateStr !== lastDate) {
                appendDateSeparator(dateStr);
                lastDate = dateStr;
            }
            appendMessageNode(item.data, item.key, false);
        });

        // Trigger batch fade in
        els.messagesContainer.classList.add('batch-animate-in');
        setTimeout(() => scrollToBottom(), 50); // Jump instantly on load

        isInitialLoad = false;

        // Now listen for NEW messages in real-time
        const liveQuery = messagesRef.orderByChild('timestamp').startAt(Date.now());
        liveQuery.on('child_added', (childSnap) => {
            if (isInitialLoad) return; // Prevent dupes on first hook
            const msg = childSnap.val();

            if ((msg.senderId === currentUserId && msg.receiverId === otherUserId) ||
                (msg.senderId === otherUserId && msg.receiverId === currentUserId)) {

                const dateStr = new Date(msg.timestamp).toDateString();
                if (dateStr !== lastDate) {
                    appendDateSeparator(dateStr);
                    lastDate = dateStr;
                }

                // Add with entrance animation
                appendMessageNode(msg, childSnap.key, true);

                if (msg.senderId === otherUserId) {
                    if (isAtBottom) {
                        scrollToBottom(true);
                        markMessageAsRead(childSnap.key);
                    } else {
                        unreadCount++;
                        updateUnreadBadge();
                        showNewMessageToast(msg);
                    }
                } else {
                    scrollToBottom(true);
                }
            }
        });

        // Listen for read receipts
        messagesRef.on('child_changed', (child) => {
            const msg = child.val();
            if (msg.senderId === currentUserId && msg.receiverId === otherUserId && msg.read) {
                updateTicks(child.key, true);
            }
        });
    });
}

function appendDateSeparator(dateString) {
    const div = document.createElement('div');
    div.className = 'date-separator';
    const displayDate = dateString === new Date().toDateString() ? 'TODAY' : dateString;
    div.textContent = displayDate;
    els.messagesContainer.appendChild(div);
}

// BUBBLE GENERATOR (Part D)
let lastMsgTime = 0;
function appendMessageNode(msg, msgId, animate) {
    const isSent = msg.senderId === currentUserId;
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
    bubble.dataset.id = msgId;
    bubble.dataset.read = msg.read;

    // Consecutive speed check
    if (animate) {
        const now = Date.now();
        if (now - lastMsgTime < 2000 && lastMessageTypeType === msg.senderId) {
            bubble.classList.add('animate-fast');
        } else {
            bubble.classList.add('animate-in');
        }
        lastMsgTime = now;
        lastMessageTypeType = msg.senderId;
    } else {
        bubble.classList.add('history-load');
        messageObserver.observe(bubble);
    }

    let timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let contentHtml = '';
    if (msg.type === 'text') {
        contentHtml = `<span class="text-content">${escapeHtml(msg.text)}</span>`;
    } else if (msg.type === 'image') {
        contentHtml = `<img src="${msg.imageUrl}" class="message-image" alt="Shared image" onload="this.classList.add('loaded')" onclick="openImagePreview('${msg.imageUrl}')">`;
    }

    let ticksHtml = '';
    if (isSent) {
        const tickClass = msg.read ? 'read' : '';
        ticksHtml = `<span class="message-ticks ${tickClass}" id="tick-${msgId}"><svg viewBox="0 0 16 15" width="16" height="15"><path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.51zm-4.12 4.144L8.666 9.88a.32.32 0 0 1-.484.032L5.89 7.78a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l3.638 3.493c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.51l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88z"></path></svg></span>`;
    }

    // No extra whitespace — pre-wrap renders it as visible newlines!
    bubble.innerHTML = contentHtml + `<span class="message-meta"><span class="message-time">${timeStr}</span>${ticksHtml}</span>`;

    els.messagesContainer.appendChild(bubble);
}

function updateTicks(msgId, isRead) {
    const ticks = document.getElementById(`tick-${msgId}`);
    if (ticks && isRead) {
        ticks.classList.add('read');
    }
}

function markMessageAsRead(msgId) {
    if (!db) return;
    db.ref(`messages/${msgId}`).update({ read: true });
}

function markVisibleMessagesAsRead() {
    const unreadElements = els.messagesContainer.querySelectorAll('.message-bubble.received[data-read="false"]');
    unreadElements.forEach(el => {
        const msgId = el.dataset.id;
        if (msgId) {
            markMessageAsRead(msgId);
            el.dataset.read = "true";
        }
    });
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 8. ONLINE STATUS & TYPING (Part K & G)
// ==========================================
function setupUserPresence() {
    if (!db) return;

    currentUserStatusRef = db.ref(`status/${currentUserId}`);
    otherUserStatusRef = db.ref(`status/${otherUserId}`);
    currentUserTypingRef = db.ref(`typing/${currentUserId}_to_${otherUserId}`);
    const otherUserTypingRef = db.ref(`typing/${otherUserId}_to_${currentUserId}`);

    db.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === false) return;
        currentUserStatusRef.onDisconnect().set({ online: false, last_changed: firebase.database.ServerValue.TIMESTAMP });
        currentUserStatusRef.set({ online: true, last_changed: firebase.database.ServerValue.TIMESTAMP });
    });

    otherUserStatusRef.on('value', (snapshot) => {
        const status = snapshot.val();
        if (status && status.online) {
            updateStatusUI('online', true);
            els.onlineDot.classList.add('show');
        } else {
            els.onlineDot.classList.remove('show');
            const timeStr = status && status.last_changed ? formatTimestamp(status.last_changed) : 'recently';
            updateStatusUI(`last seen ${timeStr}`, false);
        }
    });

    otherUserTypingRef.on('value', (snapshot) => {
        const isTyping = snapshot.val() === true;

        // Ensure they are online to be typing
        otherUserStatusRef.once('value').then(s => {
            const online = s.val() && s.val().online;
            if (isTyping && online) {
                updateStatusUI('typing...', true, true);
                showTypingIndicator();
            } else {
                // Determine what to revert to
                if (online) updateStatusUI('online', true);
                else {
                    const timeStr = s.val() && s.val().last_changed ? formatTimestamp(s.val().last_changed) : 'recently';
                    updateStatusUI(`last seen ${timeStr}`, false);
                }
                hideTypingIndicator();
            }
        });
    });
}

// "Slot Machine" Header logic
function updateStatusUI(text, isOnline, isTyping = false) {
    // Current is chatHeaderStatus
    // Next is chatHeaderStatusNext

    const curr = els.chatHeaderStatus;
    const next = els.chatHeaderStatusNext;

    if (curr.textContent === text) return;

    next.className = 'chat-status slot-hidden-down';
    next.innerHTML = isTyping ? `<span class="typing-ellipsis">typing</span>` : text;

    if (isOnline) next.classList.add('is-online');
    if (isTyping) next.classList.add('is-typing');

    // Trigger paint
    void next.offsetWidth;

    // Animate
    curr.classList.remove('slot-visible');
    curr.classList.add('slot-hidden-up');

    next.classList.remove('slot-hidden-down');
    next.classList.add('slot-visible');

    // Swap IDs for next run
    curr.id = 'chatHeaderStatusNext';
    next.id = 'chatHeaderStatus';

    // Update global refs
    els.chatHeaderStatus = next;
    els.chatHeaderStatusNext = curr;
}

function showTypingIndicator() {
    if (els.typingIndicator.style.display !== 'none') return;
    els.messagesArea.appendChild(els.typingIndicator); // move to bottom
    els.typingIndicator.style.display = 'flex';
    els.typingIndicator.classList.remove('morphing-out');
    if (isAtBottom) scrollToBottom(true);
}

function hideTypingIndicator() {
    if (els.typingIndicator.style.display === 'none') return;
    els.typingIndicator.classList.add('morphing-out');
    setTimeout(() => {
        els.typingIndicator.style.display = 'none';
        els.typingIndicator.classList.remove('morphing-out');
    }, 150);
}

function setTypingStatus(isTyping) {
    if (!db) return;
    clearTimeout(typingTimeout);
    currentUserTypingRef.set(isTyping);
    if (isTyping) {
        typingTimeout = setTimeout(() => { currentUserTypingRef.set(false); }, 2000);
    }
}

function cleanupUserPresence() {
    if (currentUserStatusRef) currentUserStatusRef.set({ online: false, last_changed: firebase.database.ServerValue.TIMESTAMP });
    if (currentUserTypingRef) currentUserTypingRef.set(false);
}

window.addEventListener('beforeunload', cleanupUserPresence);

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return `today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// ==========================================
// 9. MODALS, TOASTS & ATTACHMENTS (Part F & J)
// ==========================================
function toggleMenu(e) {
    if (e) e.stopPropagation();
    const isShowing = els.dropdownMenu.classList.contains('show');
    closeAllModals();
    if (!isShowing) {
        els.blurOverlay.classList.add('show');
        els.blurOverlay.classList.remove('no-blur'); // assure blur
        els.dropdownMenu.classList.add('show');
    }
}

function toggleAttachmentMenu(e) {
    if (e) e.stopPropagation();
    const isShowing = els.attachmentMenu.classList.contains('show');
    closeAllModals();
    if (!isShowing) {
        els.transparentOverlay.classList.add('show', 'no-blur');
        els.attachmentMenu.classList.add('show');
        els.attachBtn.classList.add('active'); // Rotate icon
    }
}

function closeAllModals() {
    els.blurOverlay.classList.remove('show');
    els.transparentOverlay.classList.remove('show');
    els.dropdownMenu.classList.remove('show');
    els.attachmentMenu.classList.remove('show');
    els.confirmDialog.classList.remove('show');
    els.attachBtn.classList.remove('active');
}

function clearMessagesDialog() {
    els.dropdownMenu.classList.remove('show');
    els.blurOverlay.classList.add('show');
    els.blurOverlay.classList.remove('no-blur');
    els.confirmDialog.classList.add('show');
}

function executeClearChat() {
    if (!db) return;
    messagesRef.once('value').then(snapshot => {
        const updates = {};
        snapshot.forEach(child => {
            const msg = child.val();
            if ((msg.senderId === currentUserId && msg.receiverId === otherUserId) ||
                (msg.senderId === otherUserId && msg.receiverId === currentUserId)) {
                updates[child.key] = null;
            }
        });
        messagesRef.update(updates).then(() => {
            els.messagesContainer.innerHTML = '';
            closeAllModals();
            showToast("Chat cleared", "success");
        });
    });
}

// Toast Mechanism
function showToast(message, type = "") {
    const toast = document.createElement('div');
    toast.className = 'toast animate-in';
    toast.innerHTML = `<div class="toast-status ${type === 'error' ? 'toast-error' : 'toast-success'}">${message}</div>`;

    els.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.replace('animate-in', 'animate-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// New Message Toast (Scroll up)
let currentMsgToast = null;
function showNewMessageToast(msg) {
    if (currentMsgToast) currentMsgToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast animate-in';
    const otherUser = USERS[otherUserId];

    const preview = msg.type === 'text' ? escapeHtml(msg.text) : '📷 Photo';

    toast.innerHTML = `
        <div class="toast-avatar avatar-${otherUserId}">${otherUser.name.charAt(0)}</div>
        <div class="toast-content">
            <span class="toast-name">${otherUser.name}</span>
            <span class="toast-preview">${preview}</span>
        </div>
    `;

    toast.onclick = () => {
        scrollToBottom(true);
        toast.classList.replace('animate-in', 'animate-out');
    };

    els.toastContainer.appendChild(toast);
    currentMsgToast = toast;

    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.replace('animate-in', 'animate-out');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// Image handling
function handleImageSelection(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        closeAllModals();

        // Demo upload directly to bubble to show SVG progress wheel
        const reader = new FileReader();
        reader.onload = (e) => {
            simulateAndUploadImage(file, e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function simulateAndUploadImage(file, base64Preview) {
    if (!db || !storage) {
        showToast("Firebase required for images", "error");
        return;
    }

    // Create optimistic bubble with SVGs
    const bubbleId = 'temp_' + Date.now();
    const msg = {
        senderId: currentUserId, receiverId: otherUserId, type: 'image',
        imageUrl: base64Preview, timestamp: Date.now(), read: false
    };

    appendMessageNode(msg, bubbleId, true);
    scrollToBottom(true);

    const bubble = document.querySelector(`.message-bubble[data-id="${bubbleId}"]`);
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'image-uploading-overlay';
    imgWrapper.innerHTML = `
        <svg class="progress-ring" width="40" height="40">
            <circle stroke="white" stroke-width="3" fill="transparent" r="16" cx="20" cy="20" class="progress-ring__circle" />
        </svg>
    `;
    bubble.insertBefore(imgWrapper, bubble.firstChild);

    const circle = imgWrapper.querySelector('.progress-ring__circle');
    const circumference = 16 * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    // Firebase Upload
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = storage.ref(`images/${fileName}`);
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes);
            circle.style.strokeDashoffset = circumference - progress * circumference;
        },
        (error) => {
            showToast("Upload failed", "error");
            bubble.remove();
        },
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                // Upload complete visuals
                circle.style.stroke = "var(--wa-teal-green-light)";
                imgWrapper.classList.add('complete-fade');
                setTimeout(() => imgWrapper.remove(), 300);

                // Replace temp ID with real DB entry
                bubble.remove();
                sendMessage('', 'image', downloadURL);
            });
        }
    );
}

// ==========================================
// 10. EMOJI PICKER ENGINE (Phase 3)
// ==========================================

const EMOJIS = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗'],
    gestures: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍'],
    animals: ['🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴'],
    food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑'],
    activities: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳️'],
    travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵'],
    objects: ['⌚️', '📱', '📲', '💻', '⌨️', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️'],
    flags: ['🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇫', '🇦🇽', '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼']
};

let recentEmojis = JSON.parse(localStorage.getItem('whatsapp_recent_emojis')) || [];

function toggleEmojiPicker() {
    const isShowing = els.emojiPickerPanel.classList.contains('show');

    if (isShowing) {
        // Close the picker
        els.emojiPickerPanel.classList.remove('show');
        els.emojiBtn.classList.remove('keyboard-mode');
        els.messageInput.focus();
        // Scroll chat to bottom after picker closes
        setTimeout(() => scrollToBottom(true), 350);
    } else {
        // Open the picker
        closeAllModals();
        els.emojiPickerPanel.classList.add('show');
        els.emojiBtn.classList.add('keyboard-mode');
        renderEmojis(document.querySelector('.emoji-tab.active').dataset.category);
        // Scroll chat to bottom so user sees latest messages
        setTimeout(() => scrollToBottom(true), 350);
    }
}

// Render Engine
function renderEmojis(category) {
    const scrollArea = document.getElementById('emojiScrollArea');
    const noResults = document.getElementById('emojiNoResults');
    // Detach noResults before clearing so it doesn't get destroyed
    if (noResults && noResults.parentNode === scrollArea) {
        scrollArea.removeChild(noResults);
    }
    scrollArea.innerHTML = ''; // Clear old content
    // Re-attach (hidden)
    if (noResults) {
        noResults.style.display = 'none';
        scrollArea.appendChild(noResults);
    }

    let emojisToRender = [];
    if (category === 'recent') {
        emojisToRender = recentEmojis;
        if (emojisToRender.length === 0) {
            scrollArea.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary); width: 100%;">No recent emojis</div>';
            return;
        }
    } else {
        emojisToRender = EMOJIS[category] || [];
    }

    // Create Grid
    const grid = document.createElement('div');
    grid.className = 'emoji-grid';

    // Document fragment for performance
    const fragment = document.createDocumentFragment();

    emojisToRender.forEach(emoji => {
        const span = document.createElement('div');
        span.className = 'emoji-cell';
        span.textContent = emoji;
        span.onclick = (e) => handleEmojiClick(e, emoji);
        fragment.appendChild(span);
    });

    grid.appendChild(fragment);
    scrollArea.appendChild(grid);
}

// Emoji Tab Switching
document.querySelectorAll('.emoji-tab').forEach((tab, index) => {
    tab.addEventListener('click', (e) => {
        // Highlight logic
        document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Indicator sliding
        const tabWidth = e.currentTarget.offsetWidth;
        const offsetLeft = e.currentTarget.offsetLeft;
        const indicator = document.getElementById('emojiTabIndicator');
        indicator.style.transform = `translateX(${offsetLeft}px)`;
        indicator.style.width = `${tabWidth}px`;

        // Render
        const category = e.currentTarget.dataset.category;
        renderEmojis(category);
    });
});

function handleEmojiClick(e, emoji) {
    // 1. Visual tap bounce
    const cell = e.currentTarget;
    cell.classList.remove('tap-bounce');
    void cell.offsetWidth;
    cell.classList.add('tap-bounce');

    // 2. Insert at cursor properly
    insertTextAtCursor(els.messageInput, emoji);
    els.messageInput.dispatchEvent(new Event('input', { bubbles: true })); // trigger auto-expand/morph

    // 3. Update recents array
    updateRecentEmojis(emoji);
}

function insertTextAtCursor(element, text) {
    element.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}

function updateRecentEmojis(emoji) {
    if (recentEmojis.includes(emoji)) {
        recentEmojis = recentEmojis.filter(e => e !== emoji);
    }
    recentEmojis.unshift(emoji);
    if (recentEmojis.length > 32) recentEmojis.pop(); // Keep max 32

    localStorage.setItem('whatsapp_recent_emojis', JSON.stringify(recentEmojis));
}

// Emoji Search
document.getElementById('emojiSearchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const scrollArea = document.getElementById('emojiScrollArea');
    const noResults = document.getElementById('emojiNoResults');

    if (query === '') {
        noResults.style.display = 'none';
        renderEmojis(document.querySelector('.emoji-tab.active').dataset.category);
        return;
    }

    let matchedEmojis = [];
    Object.keys(EMOJIS).forEach(cat => {
        if (cat.includes(query)) matchedEmojis = matchedEmojis.concat(EMOJIS[cat]);
    });

    scrollArea.innerHTML = '';

    if (matchedEmojis.length === 0) {
        noResults.style.display = 'flex';
        scrollArea.appendChild(noResults);
    } else {
        noResults.style.display = 'none';
        const grid = document.createElement('div');
        grid.className = 'emoji-grid';
        matchedEmojis.forEach(emoji => {
            const span = document.createElement('div');
            span.className = 'emoji-cell';
            span.textContent = emoji;
            span.onclick = (e) => handleEmojiClick(e, emoji);
            grid.appendChild(span);
        });
        scrollArea.appendChild(grid);
    }
});

// Expose the globals
els.emojiPickerPanel = document.getElementById('emojiPickerPanel');

// ==========================================
// 11. IMAGE PREVIEW AND CAPTION ENGINE
// ==========================================

els.previewModal = document.getElementById('previewModal');
els.previewImage = document.getElementById('previewImage');
els.captionInput = document.getElementById('captionInput');
els.captionCharCount = document.getElementById('captionCharCount');

let currentPreviewFile = null;

// Overwrite the original handleImageSelection to use the preview modal
window.handleImageSelection = function (event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        closeAllModals(); // Close attachments

        currentPreviewFile = file;
        els.captionInput.value = '';
        els.captionCharCount.textContent = `0 / 1024`;

        // Use FileReader to show preview instantly
        const reader = new FileReader();
        reader.onload = (e) => {
            els.previewImage.src = e.target.result;
            openImagePreviewModal();
        };
        reader.readAsDataURL(file);
    }
    // reset input
    event.target.value = '';
};

function openImagePreviewModal() {
    els.previewModal.style.display = 'flex';
    // Reflow
    void els.previewModal.offsetWidth;
    els.previewModal.classList.add('show');
    els.captionInput.focus();
}

function closeImagePreview() {
    els.previewModal.classList.remove('show');
    setTimeout(() => {
        els.previewModal.style.display = 'none';
        els.previewImage.src = '';
        currentPreviewFile = null;
    }, 300);
}

els.captionInput.addEventListener('input', (e) => {
    const len = e.target.value.length;
    els.captionCharCount.textContent = `${len} / 1024`;
    if (len >= 1024) e.target.value = e.target.value.substring(0, 1024);
});

// Trigger send via enter key on caption
els.captionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendPreviewImage();
    }
});

function sendPreviewImage() {
    if (!currentPreviewFile) return;

    // Grab elements
    const sendBtn = document.getElementById('previewSendBtn');
    const sendArrow = document.getElementById('previewSendArrow');
    const progressRing = document.getElementById('previewProgressRing');
    const cancelIcon = document.getElementById('previewCancelIcon');
    const progressText = document.getElementById('previewProgressText');
    const progressCircle = document.getElementById('previewProgressCircle');
    const compressingText = document.getElementById('previewCompressingText');
    const caption = els.captionInput.value.trim();

    // UI state transition (Send -> Progress)
    els.captionInput.classList.add('disabled');
    sendBtn.classList.add('uploading');
    sendArrow.style.display = 'none';
    progressRing.style.display = 'block';
    progressText.style.display = 'block';
    cancelIcon.style.display = 'block';
    compressingText.classList.add('show');

    // 1. Compression Phase (Canvas max 1280px, 0.7 quality)
    compressImage(currentPreviewFile, 1280, 0.7).then(compressedBlob => {
        compressingText.classList.remove('show');

        // 2. Upload Phase
        if (!storage || !db) {
            showToast("Firebase required for sending", "error");
            closeImagePreview();
            return;
        }

        const fileName = `${Date.now()}_${currentPreviewFile.name}`;
        const storageRef = storage.ref(`images/${fileName}`);
        const uploadTask = storageRef.put(compressedBlob);

        let isCancelled = false;

        // Make cancel button work
        cancelIcon.onclick = (e) => {
            e.stopPropagation();
            isCancelled = true;
            uploadTask.cancel();
            closeImagePreview();
        };

        uploadTask.on('state_changed',
            (snapshot) => {
                if (isCancelled) return;
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes);
                // Update SVG ring (circle length is 113.097)
                const offset = 113.097 - (progress * 113.097);
                progressCircle.style.strokeDashoffset = offset;
                progressText.textContent = `${Math.round(progress * 100)}%`;
            },
            (error) => {
                if (!isCancelled) {
                    showToast("Upload failed", "error");
                    closeImagePreview();
                }
            },
            () => {
                if (isCancelled) return;
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                    // Send to DB
                    let enrichedCaption = caption ? `\n${caption}` : '';
                    sendMessage(enrichedCaption, 'image', downloadURL);

                    // Close safely and reset
                    closeImagePreview();

                    setTimeout(() => {
                        // Reset upload UI for next time
                        els.captionInput.classList.remove('disabled');
                        sendBtn.classList.remove('uploading');
                        sendArrow.style.display = 'block';
                        progressRing.style.display = 'none';
                        progressText.style.display = 'none';
                        cancelIcon.style.display = 'none';
                        progressCircle.style.strokeDashoffset = 113.097;
                        progressText.textContent = '0%';
                        cancelIcon.onclick = null;
                        els.captionInput.value = '';
                    }, 400);
                });
            }
        );
    });
}

// Canvas Compression Helper
function compressImage(file, maxDist, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxDist || height > maxDist) {
                    if (width > height) {
                        height *= maxDist / width;
                        width = maxDist;
                    } else {
                        width *= maxDist / height;
                        height = maxDist;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Export to JPEG
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
        };
    });
}


// ==========================================
// 12. FULLSCREEN IMAGE VIEWER
// ==========================================

els.fullscreenViewer = document.getElementById('fullscreenViewer');
els.viewerMainImage = document.getElementById('viewerMainImage');
els.viewerCaption = document.getElementById('viewerCaption');

function openImagePreview(url) {
    els.viewerMainImage.src = url;
    els.fullscreenViewer.style.display = 'flex';
    // Reflow
    void els.fullscreenViewer.offsetWidth;
    els.fullscreenViewer.classList.add('show');

    els.viewerCaption.textContent = "";
    els.viewerName = document.getElementById('viewerName');
    els.viewerName.textContent = document.getElementById('chatHeaderName').childNodes[0].textContent;
}

function closeFullscreenViewer() {
    els.fullscreenViewer.classList.remove('show');
    setTimeout(() => {
        els.fullscreenViewer.style.display = 'none';
        els.viewerMainImage.src = '';
    }, 300);
}

function downloadViewerImage() {
    if (!els.viewerMainImage.src) return;

    // Simulate blob download
    fetch(els.viewerMainImage.src)
        .then(resp => resp.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // filename
            a.download = `WhatsApp_Image_${new Date().getTime()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showToast("Image Saved", "success");
        })
        .catch(() => showToast("Failed to download", "error"));
}


// Camera + Context Menu Stubs
function openDeviceCamera() {
    document.getElementById('cameraInput').click();
}

function handleContextDownload() {
    // Download the image that was long-pressed
    const ctx = document.getElementById('messageContextMenu');
    ctx.classList.remove('show');
    if (els.viewerMainImage && els.viewerMainImage.src) {
        downloadViewerImage();
    }
}

// ==========================================
// HOMEPAGE PARTICLES GENERATOR
// ==========================================
function generateHomepageParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;

    // Bokeh circles (15)
    for (let i = 0; i < 15; i++) {
        const bokeh = document.createElement('div');
        const size = 4 + Math.random() * 16;
        const x = 5 + Math.random() * 90;
        const y = 5 + Math.random() * 90;
        const dx = -30 + Math.random() * 60;
        const dy = -40 + Math.random() * 80;
        const opStart = 0.2 + Math.random() * 0.3;
        const opMid = 0.4 + Math.random() * 0.4;
        const dur = 8 + Math.random() * 12;
        const delay = -(Math.random() * 10);

        bokeh.style.cssText = `
            position:absolute; width:${size}px; height:${size}px;
            left:${x}%; top:${y}%; border-radius:50%;
            background:radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.05) 60%, transparent 100%);
            --drift-x:${dx}px; --drift-y:${dy}px;
            --opacity-start:${opStart}; --opacity-mid:${opMid};
            animation: floatBokeh ${dur}s ease-in-out ${delay}s infinite;
            will-change: transform, opacity;
        `;
        container.appendChild(bokeh);
    }

    // Micro-particles (25)
    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        const size = 2 + Math.random() * 2;
        const x = Math.random() * 100;
        const y = 50 + Math.random() * 50;
        const drift = -50 + Math.random() * 100;
        const maxOp = 0.1 + Math.random() * 0.2;
        const dur = 10 + Math.random() * 15;
        const delay = -(Math.random() * 10);

        particle.style.cssText = `
            position:absolute; width:${size}px; height:${size}px;
            left:${x}%; top:${y}%; border-radius:50%;
            background: rgba(255,255,255,0.15);
            --drift:${drift}px; --max-opacity:${maxOp};
            animation: particleFloat ${dur}s linear ${delay}s infinite;
            will-change: transform, opacity;
        `;
        container.appendChild(particle);
    }
}

// Inject particle CSS keyframes dynamically
(function injectParticleStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatBokeh {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: var(--opacity-start); }
            25% { transform: translate(var(--drift-x), var(--drift-y)) scale(1.2); opacity: var(--opacity-mid); }
            50% { transform: translate(calc(var(--drift-x) * -0.5), calc(var(--drift-y) * 1.5)) scale(0.8); opacity: var(--opacity-start); }
            75% { transform: translate(calc(var(--drift-x) * 0.7), calc(var(--drift-y) * -0.3)) scale(1.1); opacity: var(--opacity-mid); }
        }
        @keyframes particleFloat {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: var(--max-opacity); }
            90% { opacity: var(--max-opacity); }
            100% { transform: translateY(-100vh) translateX(var(--drift)); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
})();

// Generate particles when DOM is ready
document.addEventListener('DOMContentLoaded', generateHomepageParticles);

// Global exposure
Object.assign(window, {
    selectUser, goBack, toggleMenu, toggleAttachmentMenu, closeAllModals,
    clearMessagesDialog, executeClearChat, scrollToBottom, handleSendAction, handleImageSelection,
    toggleEmojiPicker, closeImagePreview, sendPreviewImage, openImagePreview, closeFullscreenViewer,
    downloadViewerImage, openDeviceCamera, handleContextDownload
});
