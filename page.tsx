"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// 1. Supabase Bağlantısı
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProChatApp() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [channels, setChannels] = useState<any[]>([])
  const [activeChannel, setActiveChannel] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newChannelName, setNewChannelName] = useState('')

  // OTURUM KONTROLÜ
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchChannels()
  }, [])

  // KANALLARI ÇEK
  const fetchChannels = async () => {
    const { data } = await supabase.from('channels').select('*')
    if (data) setChannels(data)
  }

  // REALTIME MESAJ DİNLEME
  useEffect(() => {
    if (!activeChannel) return
    
    // Mevcut mesajları getir
    supabase.from('messages')
      .select('*')
      .eq('channel_id', activeChannel.id)
      .then(({ data }) => setMessages(data || []))

    // Yeni gelenleri dinle
    const subscription = supabase
      .channel(`room-${activeChannel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannel.id}` }, 
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        })
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [activeChannel])

  // AKSİYONLAR: Giriş, Kanal Ekle, Mesaj Gönder
  const handleSignUp = async () => await supabase.auth.signUp({ email, password })
  const handleLogin = async () => {
    const { data } = await supabase.auth.signInWithPassword({ email, password })
    if (data.user) setUser(data.user)
  }

  const createChannel = async () => {
    if (!newChannelName) return
    const { data } = await supabase.from('channels').insert([{ name: newChannelName }]).select()
    if (data) { setChannels([...channels, data[0]]); setNewChannelName('') }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage || !user || !activeChannel) return
    await supabase.from('messages').insert([
      { content: newMessage, channel_id: activeChannel.id, user_id: user.id, username: user.email }
    ])
    setNewMessage('')
  }

  // --- ARAYÜZ ---
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white font-sans">
        <div className="bg-zinc-900 p-8 rounded-2xl shadow-xl w-96 border border-zinc-800">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-500">Giriş Yap / Kaydol</h1>
          <input className="w-full p-3 mb-3 bg-zinc-800 rounded border border-zinc-700" placeholder="Email" onChange={e => setEmail(e.target.value)} />
          <input className="w-full p-3 mb-6 bg-zinc-800 rounded border border-zinc-700" type="password" placeholder="Şifre" onChange={e => setPassword(e.target.value)} />
          <button onClick={handleLogin} className="w-full bg-blue-600 p-3 rounded mb-2 hover:bg-blue-700">Giriş Yap</button>
          <button onClick={handleSignUp} className="w-full text-sm text-zinc-400 hover:underline">Hesap Oluştur</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-4 font-bold text-xl border-b border-zinc-800 flex justify-between">
          <span>Kanallar</span>
          <button onClick={() => supabase.auth.signOut().then(() => setUser(null))} className="text-xs text-red-500">Çıkış</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveChannel(ch)} className={`w-full text-left p-2 rounded ${activeChannel?.id === ch.id ? 'bg-blue-600' : 'hover:bg-zinc-800'}`}>
              # {ch.name}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-zinc-800">
          <input className="w-full p-2 bg-zinc-800 rounded text-sm mb-2" placeholder="Yeni kanal adı..." value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
          <button onClick={createChannel} className="w-full bg-zinc-700 p-2 rounded text-sm hover:bg-zinc-600">+ Kanal Oluştur</button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            <div className="p-4 border-b border-zinc-800 font-bold text-lg text-blue-400"># {activeChannel.name}</div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.user_id === user.id ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-zinc-500 mb-1">{m.username || 'Anonim'}</span>
                  <div className={`p-3 rounded-2xl max-w-md ${m.user_id === user.id ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 bg-zinc-900">
              <input className="w-full p-4 bg-zinc-800 rounded-xl outline-none border border-zinc-700 focus:border-blue-500" placeholder={`${activeChannel.name} kanalına mesaj gönder...`} value={newMessage} onChange={e => setNewMessage(e.target.value)} />
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">Konuşmak için bir kanal seçin</div>
        )}
      </div>
    </div>
  )
}
