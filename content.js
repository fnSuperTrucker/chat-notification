console.log('Chat Sound Extension starting...');

function isExtensionContextValid() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
}

function playBingSound(volume) {
    if (!isExtensionContextValid()) {
        console.log('Extension context invalid, cannot play sound');
        return;
    }
    const audio = new Audio(chrome.runtime.getURL('bing.mp3'));
    audio.volume = volume;
    audio.play().catch(error => {
        console.error('Error playing sound:', error);
    });
}

function createNotification(username, message) {
    const existing = document.getElementById('chat-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'chat-notification';
    notification.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: rgba(0, 255, 0, 0.9);
        color: white;
        padding: 10px;
        text-align: center;
        font-family: Arial, sans-serif;
        font-size: 18px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `;
    
    notification.innerHTML = `<strong>${username}:</strong> ${message}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '1';
        
        let blinkCount = 0;
        const blinkInterval = setInterval(() => {
            notification.style.opacity = blinkCount % 2 === 0 ? '0.6' : '1';
            blinkCount++;
            if (blinkCount >= 6) clearInterval(blinkInterval);
        }, 200);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }, 10);
}

let lastNotificationTime = 0;
const COOLDOWN_PERIOD = 10000;
let isChatBusy = false;
let observer = null;

function watchForMessages() {
    if (!isExtensionContextValid()) {
        console.log('Extension context invalid, aborting');
        setTimeout(watchForMessages, 1000);
        return;
    }

    const chatContainer = document.getElementById("js-chat--height");
    if (!chatContainer) {
        console.log('Chat container not found yet, retrying in 1 second...');
        setTimeout(watchForMessages, 1000);
        return;
    }

    console.log('Starting to watch for chat messages...');

    function processNewMessages(node) {
        if (!isExtensionContextValid()) return;

        const currentTime = Date.now();
        const timeSinceLast = currentTime - lastNotificationTime;

        const messageElement = node.querySelector('.chat-message-username, .username') || node;
        const username = messageElement.textContent.trim() || 'Unknown User';
        const message = node.textContent.replace(username, '').trim();  // Removed "New message" fallback

        if (timeSinceLast < 2000) {
            isChatBusy = true;
        } else {
            isChatBusy = false;
        }

        if (timeSinceLast >= COOLDOWN_PERIOD || !isChatBusy) {
            console.log('New message detected:', username, message);
            chrome.storage.local.get('notificationVolume', (data) => {
                if (!isExtensionContextValid()) return;
                const volume = data.notificationVolume !== undefined ? data.notificationVolume : 0.5;
                playBingSound(volume);
            });
            createNotification(username, message);
            lastNotificationTime = currentTime;
        } else {
            console.log('Message skipped due to cooldown/busy chat:', username, message);
        }
    }

    if (observer) {
        observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
        if (!isExtensionContextValid()) {
            observer.disconnect();
            watchForMessages();
            return;
        }
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        processNewMessages(node);
                    }
                });
            }
        });
    });

    observer.observe(chatContainer, { childList: true, subtree: true });
}

function init() {
    try {
        watchForMessages();
    } catch (error) {
        console.error('Error in extension:', error);
        setTimeout(init, 1000);
    }
}

init();

window.addEventListener('load', () => {
    if (isExtensionContextValid()) {
        init();
    }
});