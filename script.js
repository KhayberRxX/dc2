const { createClient } = supabase;
const _supabase = createClient(
    "https://zdixrufuczabxhvsvwsd.supabase.co", 
    "sb_publishable_cQH31e8TGNu-KuWRIr6_xA_r5yA1eV8"
);

// --- DEĞİŞKENLER ---
let currentUser = null;
let activeChannelId = null;
let localStream = null;
let isMicOpen = true;
let isCamOpen = true;

// Arama sesi (Discord dıdın dıdın benzeri)
const ringtone = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'); 
ringtone.loop = true;

// --- AUTH ---
async function checkUser() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        loadChannels();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('chat-screen').classList.add('hidden');
    }
}

async function handleAuth(type) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = type === 'login' 
        ? await _supabase.auth.signInWithPassword({ email, password })
        : await _supabase.auth.signUp({ email, password });
    if (error) alert(error.message); else checkUser();
}

async function logout() { await _supabase.auth.signOut(); location.reload(); }

// --- KANALLAR ---
async function loadChannels() {
    const { data } = await _supabase.from('channels').select('*').order('name');
    const list = document.getElementById('channel-list');
    list.innerHTML = '';
    data?.forEach(ch => {
        const b = document.createElement('button');
        b.className = "w-full text-left p-4 rounded-2xl transition text-zinc-500 hover:bg-zinc-800 hover:text-white mb-1 font-medium border border-transparent hover:border-zinc-700";
        b.innerText = "# " + ch.name;
        b.onclick = () => selectChannel(ch);
        list.appendChild(b);
    });
}

async function selectChannel(ch) {
    activeChannelId = ch.id;
    document.getElementById('chat-header').innerText = "# " + ch.name;
    document.getElementById('chat-form').classList.remove('hidden');
    document.getElementById('call-start-btn').classList.remove('hidden');
    
    const { data } = await _supabase.from('messages').select('*').eq('channel_id', ch.id).order('created_at');
    const box = document.getElementById('messages');
    box.innerHTML = '';
    data?.forEach(m => addMsg(m));

    _supabase.channel(`room-${ch.id}`).on('postgres_changes', { 
        event: 'INSERT', schema: 'public', table: 'messages', filter: 'channel_id=eq.' + ch.id 
    }, p => addMsg(p.new)).subscribe();
}

function addMsg(m) {
    const box = document.getElementById('messages');
    const d = document.createElement('div');
    const isMe = m.user_id === currentUser?.id;
    d.className = `p-4 rounded-3xl w-fit max-w-sm border shadow-2xl ${isMe ? 'bg-blue-600 border-blue-400 ml-auto rounded-tr-none' : 'bg-zinc-900 border-zinc-800 rounded-tl-none'}`;
    d.innerHTML = `<span class="text-[10px] ${isMe ? 'text-blue-100' : 'text-blue-500'} font-black block mb-1 uppercase">${m.username}</span><span class="text-sm font-semibold">${m.content}</span>`;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
}

// --- VIDEO CALL & SES ---
async function startCall() {
    try {
        ringtone.play().catch(() => {});
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('video-call-panel').classList.remove('hidden');
        document.getElementById('localVideo').srcObject = localStream;
        sendSystemMsg("🎥 Görüntülü arama başladı...");
    } catch (err) { ringtone.pause(); alert("Kamera izni gerekiyor!"); }
}

function endCall() {
    ringtone.pause();
    ringtone.currentTime = 0;
    localStream?.getTracks().forEach(t => t.stop());
    document.getElementById('video-call-panel').classList.add('hidden');
    sendSystemMsg("❌ Arama sona erdi.");
}

function toggleMic() {
    isMicOpen = !isMicOpen;
    localStream.getAudioTracks()[0].enabled = isMicOpen;
    document.getElementById('mic-btn').innerText = isMicOpen ? "🎙️" : "🔇";
    document.getElementById('mic-btn').classList.toggle('bg-red-600', !isMicOpen);
}

function toggleCamera() {
    isCamOpen = !isCamOpen;
    localStream.getVideoTracks()[0].enabled = isCamOpen;
    document.getElementById('cam-btn').innerText = isCamOpen ? "📷" : "🚫";
    document.getElementById('cam-btn').classList.toggle('bg-red-600', !isCamOpen);
}

async function shareScreen() {
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
    document.getElementById('localVideo').srcObject = screen;
}

// --- AKSİYONLAR ---
async function sendSystemMsg(txt) {
    await _supabase.from('messages').insert([{ content: txt, channel_id: activeChannelId, username: 'SİSTEM', user_id: '00000000-0000-0000-0000-000000000000' }]);
}

document.getElementById('chat-form').onsubmit = async (e) => {
    e.preventDefault();
    const i = document.getElementById('msg-input');
    if(!i.value.trim()) return;
    await _supabase.from('messages').insert([{ 
        content: i.value, channel_id: activeChannelId, 
        username: currentUser.email.split('@')[0], user_id: currentUser.id 
    }]);
    i.value = '';
}

async function createChannel() {
    const input = document.getElementById('new-channel-name');
    if(!input.value.trim()) return;
    await _supabase.from('channels').insert([{ name: input.value.trim() }]);
    input.value = ''; loadChannels();
}

checkUser();
