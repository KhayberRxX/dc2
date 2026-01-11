// script.js dosyasının TAMAMI

const { createClient } = supabase;
const _supabase = createClient(
    "https://zdixrufuczabxhvsvwsd.supabase.co", 
    "sb_publishable_cQH31e8TGNu-KuWRIr6_xA_r5yA1eV8"
);

let currentUser = null;

// Fonksiyonu window'a bağlayarak "not defined" hatasını engelliyoruz
window.handleAuth = async function(type) {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert("Lütfen e-posta ve şifre girin.");
        return;
    }

    try {
        let result;
        if (type === 'login') {
            result = await _supabase.auth.signInWithPassword({ email, password });
        } else {
            result = await _supabase.auth.signUp({ email, password });
        }

        if (result.error) {
            alert("Hata: " + result.error.message);
        } else {
            console.log("Giriş başarılı!");
            checkUser();
        }
    } catch (err) {
        console.error("Beklenmedik hata:", err);
    }
};

window.checkUser = async function() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        
        // Admin kontrolü
        if (currentUser.email === 'test@test.com') {
            document.getElementById('admin-btn').classList.remove('hidden');
        }
        
        if(typeof loadChannels === "function") loadChannels();
    }
};

window.logout = async function() {
    await _supabase.auth.signOut();
    location.reload();
};

// Sayfa yüklendiğinde oturumu kontrol et
document.addEventListener('DOMContentLoaded', checkUser);
