// 1. Supabase Bağlantısını Sağlamlaştır
const { createClient } = supabase;
const _supabase = createClient(
    "https://zdixrufuczabxhvsvwsd.supabase.co", 
    "sb_publishable_cQH31e8TGNu-KuWRIr6_xA_r5yA1eV8",
    {
        auth: {
            persistSession: true, // Oturumu tarayıcıda sakla
            autoRefreshToken: true // Süre dolduğunda otomatik yenile
        }
    }
);

// 2. Güncellenmiş Giriş/Kayıt Fonksiyonu
async function handleAuth(type) {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    let result;
    if (type === 'login') {
        result = await _supabase.auth.signInWithPassword({ email, password });
    } else {
        result = await _supabase.auth.signUp({ email, password });
    }

    const { data, error } = result;

    if (error) {
        console.error("Auth Hatası:", error.message);
        alert("Hata: " + error.message);
    } else {
        console.log("Başarılı:", data);
        checkUser(); // Kullanıcıyı içeri al
    }
}

// 3. Oturum Kontrolü (Sayfa her açıldığında çalışır)
async function checkUser() {
    const { data: { session }, error } = await _supabase.auth.getSession();
    
    if (error) {
        console.error("Oturum kontrol hatası:", error);
        return;
    }

    if (session && session.user) {
        currentUser = session.user;
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        
        // Admin kontrolü
        if (currentUser.email === 'test@test.com') {
            document.getElementById('admin-btn').classList.remove('hidden');
        }
        
        loadChannels();
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('chat-screen').classList.add('hidden');
    }
}
