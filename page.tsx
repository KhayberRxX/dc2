"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Vercel üzerindeki Environment Variable'ları kullanır
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProChatApp() {
  // States
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [channels, setChannels] = useState<any[]>([])
  const [activeChannel, setActiveChannel] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newChannelName, setNewChannelName] = useState('')

  // 1. OTURUM YÖNETİMİ
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    fetchChannels()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // 2. KANALLARI GETİR
  const fetchChannels = async () => {
    const { data } = await supabase.from('channels').select('*').order('created_at', { ascending: true })
    if (data) {
      setChannels(data)
      if (data.length > 0 && !activeChannel) setActiveChannel(data[0])
    }
  }

  // 3. REALTIME MESAJ TAKİBİ
  useEffect(() => {
    if (!activeChannel) return

    // Eski mesajları yükle
    supabase.from('messages')
      .select('*')
      .eq('channel_id', activeChannel.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []))

    // Yeni mesajları canlı dinle
    const channel = supabase
      .channel(`room-${activeChannel.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannel.id}` }, 
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeChannel])

  // 4. FONKSİYONLAR
  const handleAuth = async (type: 'login' | 'signup') => {
    setLoading(true)
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    
    if (error) alert(error.message)
    setLoading(false)
  }

  const handleCreateChannel = async () => {
    if (!newChannelName) return
    const { data, error } = await supabase.from('channels').insert([{ name: newChannelName }]).select()
    if (error) alert(error.message)
    else {
      setChannels([...channels, data[0]])
      setNewChannelName('')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || !activeChannel) return

    const { error } = await supabase.from('messages').insert([
      { 
        content: newMessage, 
        channel_id: activeChannel.id, 
        user_id: user.id, 
        username: user.email?.split('@')[0] // Emailin başını kullanıcı adı yapalım
      }
    ])
    if (error) console.error(error)
    setNewMessage('')
  }

  if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white text-xl">Yükleniyor...</div>

  // GİRİŞ EKRANI
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white px-4">
        <div className="bg-zinc-900 p-8 rounded-3xl shadow-2xl w-full max-w-md border border-zinc-800">
          <h1 className="text-3xl font-black mb-2 text-center text-blue-500 italic">PRO-CHAT</h1>
          <p className="text-zinc-500 text-center mb-8">Devam etmek için giriş yapın</p>
          <input className="w-full p-4 mb-3 bg-zinc-800 rounded-xl border border-zinc-700 focus:ring-2 ring-blue-500 outline-none" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="w-full p-4 mb-6 bg-zinc-800 rounded-xl border border-zinc-700 focus:ring-2 ring-blue-500 outline-none" type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="space-y-3">
            <button onClick={() => handleAuth('login')} className="w-full bg-blue-600 p-4 rounded-xl font-bold hover:bg-blue-700 transition">Giriş Yap</button>
            <button onClick={() => handleAuth('signup')} className="w-full bg-zinc-800 p-4 rounded-xl font-bold hover:bg-zinc-700 transition">Kayıt Ol</button>
          </div>
        </div>
      </div>
    )
  }

  // CHAT EKRANI
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar: Kanallar */}
      <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col hidden md:flex">
        <div className="p-6 font-black text-2xl border-b border-zinc-800 flex justify-between items-center text-blue-500">
          PRO-CHAT
          <button onClick={() => supabase.auth.signOut()} className="text-[10px] bg-red-900/30 text-red-500 px-2 py-1 rounded">ÇIKIŞ</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-bold text-zinc-500 uppercase px-2 mb-2">Kanallar</p>
          {channels.map(ch => (
            <button 
              key={ch.id} 
              onClick={() => setActiveChannel(ch)} 
              className={`w-full text-left p-3 rounded-xl transition font-medium ${activeChannel?.id === ch.id ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              # {ch.name}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <input className="w-full p-3 bg-zinc-800 rounded-lg text-sm mb-2 outline-none border border-zinc-700 focus:border-blue-500" placeholder="Yeni kanal..." value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
          <button onClick={handleCreateChannel} className="w-full bg-zinc-700 p-2 rounded-lg text-sm font-bold hover:bg-zinc-600 transition">+ KANAL EKLE</button>
        </div>
      </div>

      {/* Main: Mesajlaşma Alanı */}
      <div className="flex-1 flex flex-col relative">
        {activeChannel ? (
          <>
            <div className="h-16 flex items-center px-6 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
              <span className="font-bold text-lg"># {activeChannel.name}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.user_id === user.id ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{m.username || 'Anonim'}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-2xl max-w-md break-words shadow-sm ${m.user_id === user.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-6 bg-zinc-950 border-t border-zinc-800">
              <div className="relative">
                <input 
                  className="w-full p-4 bg-zinc-900 rounded-2xl outline-none border border-zinc-800 focus:border-blue-500 transition shadow-inner" 
                  placeholder={`${activeChannel.name} kanalına yaz...`} 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                />
                <button type="submit" className="absolute right-3 top-3 bg-blue-600 p-2 rounded-xl hover:bg-blue-500 transition text-sm px-4 font-bold">GÖNDER</button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 italic">Başlamak için bir kanal seçin</div>
        )}
      </div>
    </div>
  )
}
