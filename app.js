/**
 * Camera Studio - Professional Photo & Video Capture
 * Complete Application JavaScript
 * All functionality, bug fixes, and premium features included
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    maxRecordingTime: 5 * 60 * 1000, // 5 minutes
    uploadTimeout: 30000, // 30 seconds
    photoQuality: 0.95,
    videoResolution: 1080,
    apiUrl: 'https://script.google.com/macros/s/AKfycbyvl3TaTXfjQYhiDuaQY0S8LPMZVO9tpgqGUgda-pxSygzvivu9-0Tu2GF_IFwr8mSd/exec',
    supportedFormats: {
        photo: 'image/jpeg',
        video: 'video/mp4'
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    // Camera
    stream: null,
    currentCamera: 'user',
    currentMode: 'photo',
    
    // Recording
    isRecording: false,
    mediaRecorder: null,
    recordedChunks: [],
    recordingStartTime: 0,
    recordingTimer: null,
    recordingTimeoutId: null,
    
    // Features
    torchEnabled: false,
    gridEnabled: false,
    timerActive: false,
    timerSeconds: 3,
    
    // Media
    currentPhotoBlob: null,
    currentVideoBlob: null,
    currentPhotoUrl: null,
    currentVideoUrl: null,
    
    // UI
    isUploading: false,
    lastCapture: null
};

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
    // Screens
    permissionScreen: document.getElementById('permissionScreen'),
    cameraContainer: document.getElementById('cameraContainer'),
    photoPreview: document.getElementById('photoPreview'),
    videoPreview: document.getElementById('videoPreview'),
    
    // Buttons
    openCameraBtn: document.getElementById('openCameraBtn'),
    shutterBtn: document.getElementById('shutterBtn'),
    cameraSwitchBtn: document.getElementById('cameraSwitchBtn'),
    flashBtn: document.getElementById('flashBtn'),
    gridBtn: document.getElementById('gridBtn'),
    timerBtn: document.getElementById('timerBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    stopRecordingBtn: document.getElementById('stopRecordingBtn'),
    
    // Mode buttons
    photoModeBtn: document.getElementById('photoModeBtn'),
    videoModeBtn: document.getElementById('videoModeBtn'),
    
    // Video & Preview
    video: document.getElementById('video'),
    previewImage: document.getElementById('previewImage'),
    previewVideo: document.getElementById('previewVideo'),
    
    // Controls
    gridOverlay: document.getElementById('gridOverlay'),
    focusRing: document.getElementById('focusRing'),
    recordingIndicator: document.getElementById('recordingIndicator'),
    recordingTime: document.getElementById('recordingTime'),
    
    // Thumbnail
    thumbnailContainer: document.getElementById('thumbnailContainer'),
    thumbnailImage: document.getElementById('thumbnailImage'),
    thumbnailVideo: document.getElementById('thumbnailVideo'),
    thumbnailVideoIndicator: document.getElementById('thumbnailVideoIndicator'),
    
    // Preview buttons
    photoRetakeBtn: document.getElementById('photoRetakeBtn'),
    photoDownloadBtn: document.getElementById('photoDownloadBtn'),
    photoSendBtn: document.getElementById('photoSendBtn'),
    photoPreviewCloseBtn: document.getElementById('photoPreviewCloseBtn'),
    
    videoRetakeBtn: document.getElementById('videoRetakeBtn'),
    videoDownloadBtn: document.getElementById('videoDownloadBtn'),
    videoSendBtn: document.getElementById('videoSendBtn'),
    videoPreviewCloseBtn: document.getElementById('videoPreviewCloseBtn'),
    
    // Modals
    settingsModal: document.getElementById('settingsModal'),
    errorModal: document.getElementById('errorModal'),
    settingsCloseBtn: document.getElementById('settingsCloseBtn'),
    errorCloseBtn: document.getElementById('errorCloseBtn'),
    errorDismissBtn: document.getElementById('errorDismissBtn'),
    errorMessage: document.getElementById('errorMessage'),
    
    // Settings
    qualitySlider: document.getElementById('qualitySlider'),
    qualityValue: document.getElementById('qualityValue'),
    resolutionSelect: document.getElementById('resolutionSelect'),
    volumeSlider: document.getElementById('volumeSlider'),
    
    // Notifications
    toast: document.getElementById('toast'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText')
};

// ============================================
// INITIALIZATION
// ============================================
function init() {
    setupEventListeners();
    checkBrowserSupport();
    loadSettings();
}

function setupEventListeners() {
    // Permission screen
    elements.openCameraBtn.addEventListener('click', requestCameraAccess);
    
    // Camera controls
    elements.flashBtn.addEventListener('click', toggleFlash);
    elements.gridBtn.addEventListener('click', toggleGrid);
    elements.timerBtn.addEventListener('click', openTimerSettings);
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.cameraSwitchBtn.addEventListener('click', switchCamera);
    
    // Mode selection
    elements.photoModeBtn.addEventListener('click', () => switchMode('photo'));
    elements.videoModeBtn.addEventListener('click', () => switchMode('video'));
    
    // Capture
    elements.shutterBtn.addEventListener('click', captureMedia);
    elements.shutterBtn.addEventListener('touchstart', handleTouchStart);
    elements.shutterBtn.addEventListener('touchend', handleTouchEnd);
    elements.stopRecordingBtn.addEventListener('click', stopRecording);
    
    // Thumbnail
    elements.thumbnailContainer.addEventListener('click', viewLastCapture);
    
    // Photo preview
    elements.photoPreviewCloseBtn.addEventListener('click', () => closePreview('photo'));
    elements.photoRetakeBtn.addEventListener('click', () => retakeMedia('photo'));
    elements.photoDownloadBtn.addEventListener('click', () => downloadMedia('photo'));
    elements.photoSendBtn.addEventListener('click', () => uploadMedia('photo'));
    
    // Video preview
    elements.videoPreviewCloseBtn.addEventListener('click', () => closePreview('video'));
    elements.videoRetakeBtn.addEventListener('click', () => retakeMedia('video'));
    elements.videoDownloadBtn.addEventListener('click', () => downloadMedia('video'));
    elements.videoSendBtn.addEventListener('click', () => uploadMedia('video'));
    
    // Settings modal
    elements.settingsCloseBtn.addEventListener('click', closeSettings);
    elements.qualitySlider.addEventListener('input', updateQualityValue);
    elements.resolutionSelect.addEventListener('change', updateResolution);
    
    // Error modal
    elements.errorCloseBtn.addEventListener('click', closeError);
    elements.errorDismissBtn.addEventListener('click', closeError);
    
    // Video click for focus
    elements.video.addEventListener('click', handleVideoClick);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function checkBrowserSupport() {
    const requiredAPIs = [
        'navigator.mediaDevices',
        'navigator.mediaDevices.getUserMedia',
        'HTMLMediaElement.prototype.play'
    ];
    
    for (const api of requiredAPIs) {
        const parts = api.split('.');
        let obj = window;
        
        for (const part of parts) {
            obj = obj[part];
            if (!obj) {
                showError('Browser not supported', 'Your browser does not support the Camera Studio. Please use Chrome, Firefox, Safari or Edge.');
                elements.openCameraBtn.disabled = true;
                return;
            }
        }
    }
}

// ============================================
// CAMERA INITIALIZATION
// ============================================
async function requestCameraAccess() {
    try {
        const constraints = {
            video: {
                facingMode: state.currentCamera,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: state.currentMode === 'video'
        };
        
        state.stream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.video.srcObject = state.stream;
        
        // Wait for video to be ready
        await new Promise(resolve => {
            if (elements.video.readyState >= 2) {
                resolve();
            } else {
                elements.video.onloadedmetadata = resolve;
            }
        });
        
        updateVideoMirroring();
        checkFlashSupport();
        
        // Show camera, hide permission screen
        elements.permissionScreen.classList.add('hidden');
        elements.cameraContainer.classList.add('active');
        
        showToast('Camera ready', 'success');
    } catch (error) {
        handleCameraError(error);
    }
}

function updateVideoMirroring() {
    if (state.currentCamera === 'user') {
        elements.video.classList.add('mirrored');
    } else {
        elements.video.classList.remove('mirrored');
    }
}

async function switchCamera() {
    if (state.isRecording) {
        showToast('Cannot switch camera while recording', 'warning');
        return;
    }
    
    try {
        state.currentCamera = state.currentCamera === 'user' ? 'environment' : 'user';
        await requestCameraAccess();
    } catch (error) {
        console.error('Camera switch error:', error);
        showToast('Failed to switch camera', 'error');
    }
}

function handleCameraError(error) {
    let message = 'Camera access denied or unavailable';
    
    if (error.name === 'NotAllowedError') {
        message = 'Camera permission denied. Please allow camera access in your browser settings.';
    } else if (error.name === 'NotFoundError') {
        message = 'No camera found on this device.';
    } else if (error.name === 'NotReadableError') {
        message = 'Camera is already in use by another application.';
    } else if (error.name === 'OverconstrainedError') {
        message = 'Your camera does not meet the required specifications.';
    }
    
    showError('Camera Error', message);
}

// ============================================
// CAMERA CONTROLS
// ============================================
async function toggleFlash() {
    try {
        if (!state.stream) return;
        
        const videoTrack = state.stream.getVideoTracks()[0];
        if (!videoTrack) return;
        
        const capabilities = videoTrack.getCapabilities();
        if (!capabilities.torch) {
            showToast('Flash not supported on this device', 'warning');
            return;
        }
        
        state.torchEnabled = !state.torchEnabled;
        await videoTrack.applyConstraints({ torch: state.torchEnabled });
        
        elements.flashBtn.classList.toggle('active', state.torchEnabled);
        showToast(`Flash ${state.torchEnabled ? 'on' : 'off'}`, 'success');
    } catch (error) {
        console.error('Flash error:', error);
        showToast('Could not toggle flash', 'error');
    }
}

function toggleGrid() {
    state.gridEnabled = !state.gridEnabled;
    elements.gridOverlay.classList.toggle('active', state.gridEnabled);
    elements.gridBtn.classList.toggle('active', state.gridEnabled);
}

function handleVideoClick(event) {
    if (state.isRecording) return;
    
    const rect = elements.video.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Show focus ring
    elements.focusRing.style.left = x + 'px';
    elements.focusRing.style.top = y + 'px';
    elements.focusRing.classList.add('active');
    
    setTimeout(() => {
        elements.focusRing.classList.remove('active');
    }, 1000);
}

function checkFlashSupport() {
    if (!state.stream) return;
    
    const videoTrack = state.stream.getVideoTracks()[0];
    if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        elements.flashBtn.disabled = !capabilities.torch;
    }
}

// ============================================
// MODE MANAGEMENT
// ============================================
function switchMode(mode) {
    if (state.isRecording) {
        showToast('Cannot change mode while recording', 'warning');
        return;
    }
    
    state.currentMode = mode;
    
    // Update UI
    elements.photoModeBtn.classList.toggle('active', mode === 'photo');
    elements.videoModeBtn.classList.toggle('active', mode === 'video');
    
    // Update button appearance
    if (mode === 'video') {
        elements.shutterBtn.innerHTML = '';
    } else {
        elements.shutterBtn.innerHTML = '';
    }
}

// ============================================
// CAPTURE FUNCTIONALITY
// ============================================
let touchStartTime = 0;

function handleTouchStart(e) {
    touchStartTime = Date.now();
    if (state.currentMode === 'video' && !state.isRecording) {
        startRecording();
    }
}

function handleTouchEnd(e) {
    const touchDuration = Date.now() - touchStartTime;
    if (state.currentMode === 'video' && state.isRecording) {
        stopRecording();
    }
}

function captureMedia() {
    if (state.currentMode === 'photo') {
        capturePhoto();
    } else {
        if (state.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
}

function capturePhoto() {
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = elements.video.videoWidth;
        canvas.height = elements.video.videoHeight;
        
        // Apply mirror if needed
        if (state.currentCamera === 'user') {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        
        context.drawImage(elements.video, 0, 0);
        
        canvas.toBlob(
            (blob) => {
                state.currentPhotoBlob = blob;
                state.currentPhotoUrl = URL.createObjectURL(blob);
                showPhotoPreview();
                updateThumbnail('photo', state.currentPhotoUrl);
                playShutterSound();
            },
            CONFIG.supportedFormats.photo,
            CONFIG.photoQuality
        );
    } catch (error) {
        console.error('Photo capture error:', error);
        showError('Capture Error', 'Failed to capture photo. Please try again.');
    }
}

function startRecording() {
    try {
        if (state.isRecording) return;
        
        state.recordedChunks = [];
        
        const audioTracks = state.stream.getAudioTracks();
        const videoTracks = state.stream.getVideoTracks();
        
        if (videoTracks.length === 0) {
            showError('Recording Error', 'No video track available.');
            return;
        }
        
        const mimeType = 'video/webm;codecs=vp9,opus';
        const options = {
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm'
        };
        
        state.mediaRecorder = new MediaRecorder(state.stream, options);
        
        state.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                state.recordedChunks.push(event.data);
            }
        };
        
        state.mediaRecorder.onstart = () => {
            state.isRecording = true;
            state.recordingStartTime = Date.now();
            elements.shutterBtn.classList.add('recording');
            elements.stopRecordingBtn.classList.add('active');
            elements.recordingIndicator.classList.add('active');
            elements.videoModeBtn.disabled = true;
            elements.photoModeBtn.disabled = true;
            
            // Start recording timer
            startRecordingTimer();
            
            // Set auto-stop timeout
            state.recordingTimeoutId = setTimeout(() => {
                if (state.isRecording) {
                    stopRecording();
                    showToast('Maximum recording time reached', 'warning');
                }
            }, CONFIG.maxRecordingTime);
            
            showToast('Recording started', 'success');
        };
        
        state.mediaRecorder.onstop = () => {
            state.isRecording = false;
            elements.shutterBtn.classList.remove('recording');
            elements.stopRecordingBtn.classList.remove('active');
            elements.recordingIndicator.classList.remove('active');
            elements.videoModeBtn.disabled = false;
            elements.photoModeBtn.disabled = false;
            
            if (state.recordingTimer) {
                clearInterval(state.recordingTimer);
            }
            
            if (state.recordingTimeoutId) {
                clearTimeout(state.recordingTimeoutId);
            }
            
            if (state.recordedChunks.length > 0) {
                const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
                state.currentVideoBlob = blob;
                state.currentVideoUrl = URL.createObjectURL(blob);
                showVideoPreview();
                updateThumbnail('video', blob);
                playShutterSound();
            }
        };
        
        state.mediaRecorder.start();
    } catch (error) {
        console.error('Recording start error:', error);
        showError('Recording Error', 'Failed to start recording: ' + error.message);
    }
}

function stopRecording() {
    if (!state.isRecording || !state.mediaRecorder) return;
    
    state.mediaRecorder.stop();
}

function startRecordingTimer() {
    elements.recordingTime.textContent = '00:00';
    state.recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        elements.recordingTime.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 100);
}

// ============================================
// PREVIEW MANAGEMENT
// ============================================
function showPhotoPreview() {
    elements.previewImage.src = state.currentPhotoUrl;
    elements.photoPreview.classList.add('active');
    updatePreviewInfo('photo');
}

function showVideoPreview() {
    elements.previewVideo.src = state.currentVideoUrl;
    elements.videoPreview.classList.add('active');
    updatePreviewInfo('video');
}

function updatePreviewInfo(type) {
    const infoElement = type === 'photo' 
        ? document.getElementById('photoInfo')
        : document.getElementById('videoInfo');
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();
    
    infoElement.innerHTML = `Captured on ${dateString} at ${timeString}`;
}

function closePreview(type) {
    if (type === 'photo') {
        elements.photoPreview.classList.remove('active');
        if (state.currentPhotoUrl) {
            URL.revokeObjectURL(state.currentPhotoUrl);
        }
    } else {
        elements.videoPreview.classList.remove('active');
        if (state.currentVideoUrl) {
            URL.revokeObjectURL(state.currentVideoUrl);
        }
    }
}

function retakeMedia(type) {
    closePreview(type);
    if (type === 'photo') {
        state.currentPhotoBlob = null;
        state.currentPhotoUrl = null;
    } else {
        state.currentVideoBlob = null;
        state.currentVideoUrl = null;
    }
}

function viewLastCapture() {
    if (state.lastCapture === 'photo' && state.currentPhotoUrl) {
        showPhotoPreview();
    } else if (state.lastCapture === 'video' && state.currentVideoUrl) {
        showVideoPreview();
    }
}

function updateThumbnail(type, source) {
    elements.thumbnailContainer.classList.remove('hidden');
    state.lastCapture = type;
    
    if (type === 'photo') {
        elements.thumbnailImage.src = source;
        elements.thumbnailImage.style.display = 'block';
        elements.thumbnailVideo.style.display = 'none';
        elements.thumbnailVideoIndicator.style.display = 'none';
    } else {
        elements.thumbnailVideo.src = source;
        elements.thumbnailVideo.style.display = 'block';
        elements.thumbnailImage.style.display = 'none';
        elements.thumbnailVideoIndicator.style.display = 'flex';
    }
}

// ============================================
// MEDIA ACTIONS
// ============================================
async function downloadMedia(type) {
    try {
        const blob = type === 'photo' ? state.currentPhotoBlob : state.currentVideoBlob;
        if (!blob) {
            showToast('No media to download', 'warning');
            return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capture-${Date.now()}.${type === 'photo' ? 'jpg' : 'webm'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Media downloaded successfully', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Failed to download media', 'error');
    }
}

async function uploadMedia(type) {
    try {
        if (state.isUploading) {
            showToast('Upload in progress...', 'warning');
            return;
        }
        
        const blob = type === 'photo' ? state.currentPhotoBlob : state.currentVideoBlob;
        if (!blob) {
            showToast('No media to upload', 'warning');
            return;
        }
        
        state.isUploading = true;
        elements.loadingOverlay.classList.add('active');
        elements.loadingText.textContent = `Uploading ${type}...`;
        
        const formData = new FormData();
        formData.append('file', blob, `capture-${Date.now()}.${type === 'photo' ? 'jpg' : 'webm'}`);
        formData.append('type', type);
        formData.append('timestamp', new Date().toISOString());
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.uploadTimeout);
        
        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        state.isUploading = false;
        elements.loadingOverlay.classList.remove('active');
        
        showToast(`${type} uploaded successfully to Google Drive`, 'success');
        closePreview(type);
        
    } catch (error) {
        console.error('Upload error:', error);
        state.isUploading = false;
        elements.loadingOverlay.classList.remove('active');
        
        if (error.name === 'AbortError') {
            showToast('Upload timeout. Please try again.', 'error');
        } else {
            showToast('Upload failed: ' + error.message, 'error');
        }
    }
}

// ============================================
// SETTINGS & PREFERENCES
// ============================================
function openSettings() {
    elements.settingsModal.classList.add('active');
}

function closeSettings() {
    elements.settingsModal.classList.remove('active');
    saveSettings();
}

function updateQualityValue(e) {
    const value = (e.target.value * 100).toFixed(0);
    elements.qualityValue.textContent = value + '%';
    CONFIG.photoQuality = parseFloat(e.target.value);
}

function updateResolution(e) {
    CONFIG.videoResolution = parseInt(e.target.value);
    showToast(`Video resolution set to ${e.target.value}p`, 'success');
}

function loadSettings() {
    const saved = localStorage.getItem('cameraStudioSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        if (settings.photoQuality) {
            CONFIG.photoQuality = settings.photoQuality;
            elements.qualitySlider.value = settings.photoQuality;
            elements.qualityValue.textContent = (settings.photoQuality * 100).toFixed(0) + '%';
        }
        if (settings.videoResolution) {
            CONFIG.videoResolution = settings.videoResolution;
            elements.resolutionSelect.value = settings.videoResolution;
        }
        if (settings.volumeLevel !== undefined) {
            elements.volumeSlider.value = settings.volumeLevel;
        }
    }
}

function saveSettings() {
    const settings = {
        photoQuality: CONFIG.photoQuality,
        videoResolution: CONFIG.videoResolution,
        volumeLevel: parseFloat(elements.volumeSlider.value)
    };
    localStorage.setItem('cameraStudioSettings', JSON.stringify(settings));
}

function openTimerSettings() {
    showToast('Timer feature coming soon', 'info');
}

// ============================================
// NOTIFICATIONS & MODALS
// ============================================
function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

function showError(title, message) {
    document.getElementById('errorTitle').textContent = title;
    elements.errorMessage.textContent = message;
    elements.errorModal.classList.add('active');
}

function closeError() {
    elements.errorModal.classList.remove('active');
}

// ============================================
// UTILITIES
// ============================================
function playShutterSound() {
    const volumeLevel = parseFloat(elements.volumeSlider.value);
    if (volumeLevel === 0) return;
    
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volumeLevel * 0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function handleKeyboardShortcuts(e) {
    // Spacebar to capture
    if (e.code === 'Space' && document.activeElement === document.body) {
        e.preventDefault();
        if (state.stream && !state.isUploading) {
            captureMedia();
        }
    }
    
    // Escape to close preview
    if (e.key === 'Escape') {
        if (elements.photoPreview.classList.contains('active')) {
            closePreview('photo');
        } else if (elements.videoPreview.classList.contains('active')) {
            closePreview('video');
        } else if (elements.settingsModal.classList.contains('active')) {
            closeSettings();
        } else if (elements.errorModal.classList.contains('active')) {
            closeError();
        }
    }
    
    // G for grid
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        toggleGrid();
    }
}

// ============================================
// CLEANUP & LIFECYCLE
// ============================================
window.addEventListener('beforeunload', () => {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }
    if (state.isRecording && state.mediaRecorder) {
        state.mediaRecorder.stop();
    }
});

window.addEventListener('unload', () => {
    // Revoke object URLs to free memory
    if (state.currentPhotoUrl) {
        URL.revokeObjectURL(state.currentPhotoUrl);
    }
    if (state.currentVideoUrl) {
        URL.revokeObjectURL(state.currentVideoUrl);
    }
});

// Handle visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.isRecording) {
        stopRecording();
    }
});

// ============================================
// START APPLICATION
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}