const { createClient } = supabase;
const _supabase = createClient("https://zdixrufuczabxhvsvwsd.supabase.co", "sb_publishable_cQH31e8TGNu-KuWRIr6_xA_r5yA1eV8");

let currentUser = null;
let activeChannelId = null;

// URL'den davet kontrolü (Örn: site.com/?invite=KANAL_ID)
const urlParams = new URLSearchParams(window.location.search);
const inviteId = urlParams.get('invite');

if (inviteId) document.getElementById('invite-alert').classList.remove('hidden');

async function checkUser() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        
        // Eğer davet linkiyle geldiyse üyeliği yap
        if (inviteId) await joinChannel(inviteId);
        
        // Admin mi kontrol et
        if (currentUser.email === 'test@test.com') {
            document.getElementById('admin-btn').classList.remove('hidden');
        }

        loadChannels();
    }
}

async function joinChannel(id) {
    await _supabase.from('channel_members').upsert([{ channel_id: id, user_id: currentUser.id }]);
    // URL'deki parametreyi temizle
    window.history.replaceState({}, document.title, window.location.pathname);
}

async function createChannel() {
    const name = document.getElementById('new-channel-name').value;
    if (!name) return;
    
    // 1. Kanalı oluştur
    const { data, error } = await _supabase.from('channels').insert([{ name: name, creator_id: currentUser.id }]).select();
    if (data) {
        // 2. Kendini üyeliğe ekle
        await _supabase.from('channel_members').insert([{ channel_id: data[0].id, user_id: currentUser.id }]);
        document.getElementById('new-channel-name').value = '';
        loadChannels();
    }
}

function copyInviteLink() {
    const link = `${window.location.origin}${window.location.pathname}?invite=${activeChannelId}`;
    navigator.clipboard.writeText(link);
    alert("Davet linki kopyalandı! Arkadaşına gönder: " + link);
}

async function loadChannels() {
    const { data } = await _supabase.from('channels').select('*');
    const list = document.getElementById('channel-list');
    list.innerHTML = '';
    data?.forEach(ch => {
        const b = document.createElement('button');
        b.className = "w-full text-left p-3 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition text-sm mb-1";
        b.innerText = "# " + ch.name;
        b.onclick = () => selectChannel(ch);
        list.appendChild(b);
    });
}

async function selectChannel(ch) {
    activeChannelId = ch.id;
    document.getElementById('header-text').innerText = "# " + ch.name;
    document.getElementById('invite-btn').classList.remove('hidden');
    document.getElementById('chat-form').classList.remove('hidden');
    
    const { data } = await _supabase.from('messages').select('*').eq('channel_id', ch.id).order('created_at');
    const box = document.getElementById('messages');
    box.innerHTML = '';
    data?.forEach(m => {
        const d = document.createElement('div');
        const isMe = m.user_id === currentUser.id;
        d.className = `p-3 rounded-2xl w-fit max-w-sm border shadow-lg ${isMe ? 'bg-blue-600 border-blue-500 ml-auto' : 'bg-zinc-900 border-zinc-800'}`;
        d.innerHTML = `<span class="text-[9px] font-bold block mb-1 opacity-70">${m.username}</span><span class="text-sm">${m.content}</span>`;
        box.appendChild(d);
    });
    box.scrollTop = box.scrollHeight;
}

// ADMİN PANELİ FONKSİYONLARI
function toggleAdminPanel() {
    const panel = document.getElementById('admin-panel');
    panel.classList.toggle('translate-x-full');
    if (!panel.classList.contains('translate-x-full')) loadAdminChannels();
}

async function loadAdminChannels() {
    const { data } = await _supabase.from('channels').select('*');
    const list = document.getElementById('all-channels-list');
    list.innerHTML = '';
    data?.forEach(ch => {
        list.innerHTML += `
            <div class="bg-zinc-800 p-3 rounded-xl flex justify-between items-center border border-zinc-700">
                <span class="text-xs font-bold text-zinc-300"># ${ch.name}</span>
                <button onclick="deleteChannel('${ch.id}')" class="text-[10px] bg-red-600 px-2 py-1 rounded font-bold hover:bg-red-500">SİL</button>
            </div>
        `;
    });
}

async function deleteChannel(id) {
    if (confirm("Bu kanalı ve içindeki tüm mesajları silmek istediğine emin misin?")) {
        await _supabase.from('channels').delete().eq('id', id);
        loadAdminChannels();
        loadChannels();
    }
}

// DİĞER FONKSİYONLAR (Login, Logout, Message Send vb. aynı kalacak)
// [Buraya önceki script.js'deki login/logout ve mesaj gönderme kodlarını yapıştır]

checkUser();
