document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('volumeSlider');

    // Load saved volume
    chrome.storage.local.get('notificationVolume', (data) => {
        const savedVolume = data.notificationVolume;
        if (savedVolume !== undefined) {
            slider.value = savedVolume * 100;
        }
    });

    // Save volume on change
    slider.onchange = () => {
        const volume = slider.value / 100;
        chrome.storage.local.set({ notificationVolume: volume });
        console.log('Volume set to:', volume);
    };
});