let localStream;
let isMicOpen = true;
let isCamOpen = true;

async function startCall() {
    try {
        // Kamera ve mikrofonu aç
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        document.getElementById('video-call-panel').classList.remove('hidden');
        document.getElementById('localVideo').srcObject = localStream;
        
        // Kanala arama başladığı bilgisini gönder (Diğerleri görebilsin)
        sendSystemMessage("🎥 Görüntülü arama başlatıldı.");
    } catch (err) {
        alert("Kamera/Mikrofon izni verilmedi veya cihaz bulunamadı!");
        console.error(err);
    }
}

// Mikrofonu Kapat/Aç
function toggleMic() {
    isMicOpen = !isMicOpen;
    localStream.getAudioTracks()[0].enabled = isMicOpen;
    document.getElementById('mic-btn').innerText = isMicOpen ? "🎙️" : "🔇";
    document.getElementById('mic-btn').classList.toggle('bg-red-900', !isMicOpen);
}

// Kamerayı Kapat/Aç
function toggleCamera() {
    isCamOpen = !isCamOpen;
    localStream.getVideoTracks()[0].enabled = isCamOpen;
    document.getElementById('cam-btn').innerText = isCamOpen ? "📷" : "🚫";
    document.getElementById('cam-btn').classList.toggle('bg-red-900', !isCamOpen);
}

// Ekran Paylaşımı
async function shareScreen() {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Mevcut kamera görüntüsü yerine ekranı koy
        const sender = localStream.getVideoTracks()[0];
        localStream.removeTrack(sender);
        localStream.addTrack(videoTrack);
        document.getElementById('localVideo').srcObject = screenStream;

        // Paylaşım bittiğinde kameraya geri dön
        videoTrack.onended = () => {
            stopScreenShare();
        };
    } catch (err) {
        console.error("Ekran paylaşımı başarısız:", err);
    }
}

function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('video-call-panel').classList.add('hidden');
    sendSystemMessage("❌ Arama sona erdi.");
}

async function sendSystemMessage(text) {
    if (!activeChannelId) return;
    await _supabase.from('messages').insert([{ 
        content: text, 
        channel_id: activeChannelId, 
        username: "SİSTEM" 
    }]);
}
