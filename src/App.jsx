import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Plus, Info, Search, Home, Library, X, Maximize, SkipBack, SkipForward, 
  Pause, ChevronLeft, ChevronRight, Check, Settings, Trash2, Edit, UploadCloud, 
  Users, Activity, FileVideo, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, 
  Server, Wand2, Loader2, LogOut, ShieldCheck, Zap, Database, Globe, Sparkles
} from 'lucide-react';

// --- API CONFIGURATION ---
const DEFAULT_API_URL = "https://yama-backend-3ui0.onrender.com/api"; 

// --- GEMINI API SETUP ---
const apiKey = ""; 

const callGemini = async (prompt) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) throw new Error(`API Error`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

const api = {
  getBaseUrl: () => localStorage.getItem('yama_api_url') || '',
  isLive: () => !!localStorage.getItem('yama_api_url'),

  getMovies: async () => {
    try {
      if (api.isLive()) {
        const res = await fetch(`${api.getBaseUrl()}/movies`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        // Safety check: Ensure we actually got an array
        return Array.isArray(data) ? data : [];
      }
      // Mock Data for Preview
      const stored = localStorage.getItem('yama_movies');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("API Fetch Error:", e);
      return []; // Return empty array on failure to prevent app crash
    }
  },

  saveMovie: async (movie) => {
    if (api.isLive()) {
      const method = movie.id && String(movie.id).length > 10 ? 'PUT' : 'POST';
      const res = await fetch(`${api.getBaseUrl()}/movies${method === 'PUT' ? `/${movie.id}` : ''}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('yama_token')}` },
        body: JSON.stringify(movie)
      });
      return res.json();
    }
    const movies = await api.getMovies();
    const newMovie = { ...movie, id: movie.id || Date.now() };
    const index = movies.findIndex(m => m.id === newMovie.id);
    if (index >= 0) movies[index] = newMovie;
    else movies.unshift(newMovie);
    localStorage.setItem('yama_movies', JSON.stringify(movies));
    return newMovie;
  },

  deleteMovie: async (id) => {
    if (api.isLive()) {
      await fetch(`${api.getBaseUrl()}/movies/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('yama_token')}` }
      });
      return;
    }
    const movies = await api.getMovies();
    const filtered = movies.filter(m => m.id !== id);
    localStorage.setItem('yama_movies', JSON.stringify(filtered));
  },
  
  login: async (email, password) => {
      if (api.isLive()) {
          const res = await fetch(`${api.getBaseUrl()}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
          });
          if (!res.ok) throw new Error('Invalid Credentials');
          const data = await res.json();
          return data.token;
      }
      if (password.length < 6) throw new Error("Password too short");
      return "mock-jwt-token-" + Date.now();
  }
};

const Navbar = ({ activeTab, setActiveTab, isScrolled, isLive }) => (
  <div className={`fixed top-0 z-50 w-full transition-all duration-700 ${isScrolled ? 'bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl' : 'bg-gradient-to-b from-black/90 via-black/50 to-transparent'}`}>
    <div className="flex items-center justify-between px-4 md:px-12 py-4">
      <div className="flex items-center gap-8">
        <div className="cursor-pointer group relative" onClick={() => setActiveTab('home')}>
           <div className="absolute -inset-4 bg-red-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition duration-500"></div>
           <h1 className="text-3xl md:text-5xl font-black tracking-tighter flex items-baseline select-none relative z-10">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">Y</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-red-400 via-red-600 to-red-800 drop-shadow-[0_0_15px_rgba(220,38,38,0.2)] -ml-0.5 tracking-tight">AMA</span>
          </h1>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-zinc-400">
          {['Home', 'Search', 'List', 'Studio'].map((tab) => (
             <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} className={`hover:text-white transition-all duration-300 ${activeTab === tab.toLowerCase() ? 'text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}`}>{tab}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${isLive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
            {isLive ? 'LIVE' : 'SIMULATION'}
        </div>
        <button onClick={() => setActiveTab('search')} className="md:hidden p-2 hover:bg-white/10 rounded-full transition active:scale-95">
          <Search className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  </div>
);

const AdminLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await api.login(email, password);
      localStorage.setItem('yama_token', token);
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-in fade-in duration-700 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center">
       <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
      <div className="bg-zinc-950/80 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl backdrop-blur-xl relative overflow-hidden">
         <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-zinc-900/80 rounded-2xl mb-6 border border-white/5 shadow-lg ring-1 ring-white/5">
               <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">Studio Access</h2>
            <p className="text-zinc-400 text-sm">JWT Secured Environment</p>
         </div>
         <form onSubmit={handleAuth} className="space-y-5">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-red-500 focus:outline-none transition text-sm" placeholder="admin@yama.stream" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-red-500 focus:outline-none transition text-sm" placeholder="••••••••" required />
            {error && <div className="flex items-center gap-3 text-red-400 text-xs bg-red-500/5 p-3 rounded-lg border border-red-500/20"><AlertCircle className="w-4 h-4" /> {error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50">
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock Studio'}
            </button>
         </form>
      </div>
    </div>
  );
};

const AdminPanel = ({ movies, setMovies, onLogout }) => {
  const [activeView, setActiveView] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [currentMovie, setCurrentMovie] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('yama_api_url') || '');
  
  const saveSettings = () => {
    if(apiUrl) localStorage.setItem('yama_api_url', apiUrl);
    else localStorage.removeItem('yama_api_url');
    alert("Connection settings updated. Reloading...");
    window.location.reload();
  };
  
  const defaultMovie = { type: 'movie', title: '', description: '', rating: 'New', year: new Date().getFullYear(), duration: '', genre: '', image: '', heroImage: '', category: 'New Releases', status: 'ready', views: '0', streamId: '', seasons: [] };

  const handleEdit = (movie) => { setCurrentMovie({ ...movie }); setIsEditing(true); };
  
  const handleSave = async () => {
    try {
        const saved = await api.saveMovie(currentMovie);
        setMovies(prev => {
            const exists = prev.find(m => m.id === saved.id);
            if(exists) return prev.map(m => m.id === saved.id ? saved : m);
            return [saved, ...prev];
        });
        setIsEditing(false);
    } catch(e) { alert("Save failed: " + e.message); }
  };
  
  const handleDelete = async (id) => {
     if(confirm("Delete this title?")) {
         await api.deleteMovie(id);
         setMovies(prev => prev.filter(m => m.id !== id));
     }
  };

  const handleMagicSynopsis = async () => {
    if (!currentMovie.title) return alert("Enter a title first.");
    setIsGenerating(true);
    const prompt = `Write a captivating, 2-sentence plot summary for a movie titled "${currentMovie.title}" with genre "${currentMovie.genre}". Style: Premium streaming service.`;
    const synopsis = await callGemini(prompt);
    if (synopsis) setCurrentMovie(prev => ({ ...prev, description: synopsis }));
    setIsGenerating(false);
  };

  if (isEditing) {
    return (
      <div className="pt-24 px-4 max-w-6xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-white">Metadata Editor</h2>
          <div className="flex gap-3">
             <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 rounded-xl font-medium text-zinc-300 hover:bg-white/5 transition">Cancel</button>
             <button onClick={handleSave} className="bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:bg-zinc-200 transition flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Save Changes</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl">
                 <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2"><UploadCloud className="w-4 h-4" /> Stream Config</h3>
                 <div className="space-y-5">
                    <div>
                       <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Cloudflare Video UID</label>
                       <input className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-mono text-zinc-300 focus:border-red-500 focus:outline-none" value={currentMovie.streamId || ''} onChange={(e) => setCurrentMovie({...currentMovie, streamId: e.target.value})} placeholder="e.g. 5d5bc37ffcf..." />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Poster URL</label>
                       <input className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-xs font-mono text-zinc-300 focus:border-red-500 focus:outline-none" value={currentMovie.image} onChange={(e) => setCurrentMovie({...currentMovie, image: e.target.value, heroImage: e.target.value})} />
                    </div>
                 </div>
              </div>
           </div>
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-2xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Title</label><input className="w-full bg-black/20 border border-white/10 p-3.5 rounded-xl text-white focus:border-red-500 focus:outline-none" value={currentMovie.title} onChange={(e) => setCurrentMovie({...currentMovie, title: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">Format</label><select className="w-full bg-black/20 border border-white/10 p-3.5 rounded-xl text-white focus:border-red-500 focus:outline-none" value={currentMovie.type} onChange={(e) => setCurrentMovie({...currentMovie, type: e.target.value})}><option value="movie">Movie</option><option value="series">Series</option></select></div>
                 </div>
                 <div className="mb-6">
                    <div className="flex justify-between items-end mb-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Synopsis</label><button onClick={handleMagicSynopsis} disabled={isGenerating} className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">{isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}{isGenerating ? 'Generating...' : 'Magic Synopsis'}</button></div>
                    <textarea className="w-full bg-black/20 border border-white/10 p-3.5 rounded-xl text-zinc-300 focus:border-red-500 focus:outline-none h-32 resize-none" value={currentMovie.description} onChange={(e) => setCurrentMovie({...currentMovie, description: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {['Genre', 'Year', 'Rating', 'Duration'].map((field) => (
                       <div key={field}><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">{field}</label><input className="w-full bg-black/20 border border-white/10 p-3 rounded-xl text-white focus:border-red-500 focus:outline-none" value={currentMovie[field.toLowerCase()]} onChange={(e) => setCurrentMovie({...currentMovie, [field.toLowerCase()]: field === 'Year' ? (parseInt(e.target.value) || '') : e.target.value})} /></div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 px-4 md:px-12 min-h-screen pb-20 flex flex-col md:flex-row gap-8">
      <div className="w-full md:w-64 shrink-0 space-y-2">
         <div className="mb-8 pl-3">
            <h2 className="text-xl font-black text-white tracking-tight">YAMA <span className="text-red-600">STUDIO</span></h2>
            <p className="text-xs text-zinc-500 mt-1">{api.isLive() ? 'Connected to Render' : 'Simulation Mode'}</p>
         </div>
         {['Overview', 'Content', 'Settings'].map(view => (
            <button key={view} onClick={() => setActiveView(view.toLowerCase())} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${activeView === view.toLowerCase() ? 'bg-zinc-800/80 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'}`}>
                {view === 'Overview' ? <BarChart3 className="w-4 h-4" /> : view === 'Content' ? <Film className="w-4 h-4" /> : <Settings className="w-4 h-4" />} {view}
            </button>
         ))}
         <div className="pt-8 space-y-3">
            <button onClick={() => { setCurrentMovie(defaultMovie); setIsEditing(true); }} className="w-full bg-white text-black px-4 py-3.5 rounded-xl font-bold text-sm transition shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 hover:bg-zinc-200"><UploadCloud className="w-4 h-4" /> Upload New</button>
            <button onClick={onLogout} className="w-full bg-black/40 text-zinc-400 hover:text-white px-4 py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 border border-white/5 hover:border-white/20"><LogOut className="w-4 h-4" /> Lock Studio</button>
         </div>
      </div>

      <div className="flex-1">
         {activeView === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                  {[
                      { label: 'Total Audience', val: '2.4M', icon: Users, color: 'blue' },
                      { label: 'Database Status', val: api.isLive() ? 'Neon DB' : 'Local Mock', icon: Database, color: 'purple' },
                      { label: 'Backend Status', val: api.isLive() ? 'Render' : 'Offline', icon: Activity, color: 'emerald' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-6 opacity-50`}><stat.icon className={`w-8 h-8 text-${stat.color}-500`} /></div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">{stat.val}</h3>
                    </div>
                  ))}
            </div>
         )}

         {activeView === 'content' && (
            <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden animate-in fade-in">
               <div className="flex items-center justify-between p-6 border-b border-white/5">
                  <h3 className="font-bold text-lg text-white">Content Library</h3>
               </div>
               <div className="max-h-[600px] overflow-y-auto">
               <table className="w-full text-left">
                  <thead className="bg-black/20 text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                     <tr><th className="p-6">Title</th><th className="p-6">Format</th><th className="p-6 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {movies.map((movie) => (
                        <tr key={movie.id} className="hover:bg-white/5 transition">
                           <td className="p-6 font-medium text-white">{movie.title}</td>
                           <td className="p-6 text-sm text-zinc-400 uppercase">{movie.type}</td>
                           <td className="p-6 text-right">
                              <button onClick={() => handleEdit(movie)} className="text-zinc-400 hover:text-white mr-4"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(movie.id)} className="text-zinc-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               </div>
            </div>
         )}

         {activeView === 'settings' && (
             <div className="max-w-3xl animate-in fade-in">
                <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-8 rounded-2xl shadow-2xl">
                   <div className="flex items-center gap-5 mb-8">
                      <div className="p-4 bg-orange-500/10 rounded-2xl"><Server className="w-8 h-8 text-orange-500" /></div>
                      <div>
                         <h3 className="text-2xl font-black text-white">Backend Connection</h3>
                         <p className="text-sm text-zinc-400">Connect your Render + Neon + Prisma backend.</p>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <div>
                         <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">API URL (Render)</label>
                         <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-orange-500 focus:outline-none font-mono text-sm" placeholder="https://your-app.onrender.com/api" />
                      </div>
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
                         <Globe className="w-5 h-5 text-blue-500 shrink-0" />
                         <p className="text-xs text-blue-200/80">
                            <strong>Status:</strong> {api.isLive() ? "Online Mode (Connecting to Render)" : "Offline Mode (Using LocalStorage)"}
                         </p>
                      </div>
                      <div className="pt-6 flex justify-end">
                         <button onClick={saveSettings} className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 transition flex items-center gap-2"><Zap className="w-4 h-4" /> Update Connection</button>
                      </div>
                   </div>
                </div>
             </div>
         )}
      </div>
    </div>
  );
};

const Hero = ({ movie, onPlay, onMoreInfo }) => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const handleScroll = () => setOffset(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative h-[80vh] md:h-[90vh] w-full text-white overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 w-full h-[120%] object-cover will-change-transform" style={{ transform: `translateY(${offset * 0.4}px)`, backgroundImage: `url(${movie.heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 pb-24 md:pb-40 flex flex-col gap-6 max-w-4xl z-10">
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4"><div className="w-1 h-6 bg-red-600 rounded-full shadow-[0_0_10px_#dc2626]"></div><span className="font-bold tracking-[0.2em] text-xs md:text-sm uppercase text-zinc-300 drop-shadow-md">{movie.category}</span></div>
        <h1 className="text-5xl sm:text-7xl md:text-9xl font-black leading-[0.9] tracking-tighter drop-shadow-2xl animate-in fade-in slide-in-from-bottom-8 delay-100">{movie.title}</h1>
        <p className="text-zinc-200 text-sm md:text-xl line-clamp-3 md:line-clamp-2 max-w-2xl drop-shadow-lg animate-in fade-in slide-in-from-bottom-8 delay-200 leading-relaxed font-medium">{movie.description}</p>
        <div className="flex gap-4 mt-4 animate-in fade-in slide-in-from-bottom-12 delay-300">
          <button onClick={() => onPlay(movie)} className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)] text-sm md:text-base tracking-wide group"><Play className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" /> PLAY NOW</button>
          <button onClick={() => onMoreInfo(movie)} className="flex items-center gap-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95 text-sm md:text-base tracking-wide shadow-lg"><Info className="w-5 h-5" /> MORE INFO</button>
        </div>
      </div>
    </div>
  );
};

const MovieRow = ({ title, movies, onSelectMovie, isSpecial = false }) => {
  const rowRef = useRef(null);
  const scroll = (direction) => { if (rowRef.current) rowRef.current.scrollBy({ left: direction === 'left' ? -window.innerWidth / 1.5 : window.innerWidth / 1.5, behavior: 'smooth' }); };
  if (!movies || movies.length === 0) return null;

  return (
    <div className="mb-12 px-4 md:px-12 group relative z-10">
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className={`text-white text-xl md:text-3xl font-bold hover:text-red-500 transition cursor-pointer flex items-center gap-3 ${isSpecial ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600 drop-shadow-sm' : ''}`}>
          {isSpecial && <Sparkles className="w-6 h-6 text-red-500 animate-pulse" />}{title}<ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition -translate-x-2 group-hover:translate-x-0 text-zinc-400" />
        </h2>
      </div>
      <div className="relative group/row">
        <button onClick={() => scroll('left')} className="absolute -left-4 md:-left-12 top-0 bottom-0 z-20 w-16 bg-gradient-to-r from-black to-transparent text-white items-center justify-center hidden md:hidden group-hover/row:md:flex transition-opacity opacity-0 group-hover/row:opacity-100"><ChevronLeft className="w-10 h-10" /></button>
        <div ref={rowRef} className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-12 pt-4 px-1 snap-x snap-mandatory">
          {movies.map((movie) => (
            <div key={movie.id} onClick={() => onSelectMovie(movie)} className={`flex-none w-[150px] md:w-[280px] aspect-[2/3] md:aspect-[16/9] relative rounded-2xl overflow-hidden cursor-pointer hover:scale-105 hover:shadow-[0_0_40px_rgba(0,0,0,0.7)] hover:ring-1 hover:ring-white/30 hover:z-30 transition-all duration-500 bg-zinc-800 snap-start group/card ${isSpecial ? 'ring-1 ring-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : ''}`}>
              <img src={movie.image} alt={movie.title} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40 group-hover/card:opacity-100 transition duration-500" />
              <div className="absolute bottom-0 left-0 w-full p-5 translate-y-4 group-hover/card:translate-y-0 transition-transform duration-500 flex flex-col justify-end opacity-0 group-hover/card:opacity-100">
                <p className="text-white font-black text-lg mb-2 shadow-black drop-shadow-lg line-clamp-1">{movie.title}</p>
                <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-300 mb-3"><span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded">{movie.rating}</span></div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => scroll('right')} className="absolute -right-4 md:-right-12 top-0 bottom-0 z-20 w-16 bg-gradient-to-l from-black to-transparent text-white items-center justify-center hidden md:hidden group-hover/row:md:flex transition-opacity opacity-0 group-hover/row:opacity-100"><ChevronRight className="w-10 h-10" /></button>
      </div>
    </div>
  );
};

const VideoPlayer = ({ movie, onClose }) => {
  const cloudflareId = movie.streamId;
  const cloudflareUrl = cloudflareId ? `https://iframe.videodelivery.net/${cloudflareId}` : null;
  const [showControls, setShowControls] = useState(true);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-300" onClick={() => setShowControls(!showControls)}>
       <button onClick={onClose} className="absolute top-6 left-6 z-50 p-3 bg-black/50 rounded-full hover:bg-white/20 backdrop-blur-md border border-white/10 text-white transition"><ChevronLeft className="w-6 h-6" /></button>
       {cloudflareUrl ? (
          <iframe src={cloudflareUrl} className="w-full h-full border-none" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen={true}></iframe>
       ) : (
          <div className="relative w-full h-full flex items-center justify-center">
              <img src={movie.heroImage || movie.image} className="absolute inset-0 w-full h-full object-cover opacity-40" />
              <div className="relative z-10 text-center"><p className="text-white/50 font-mono mb-4">No Stream ID Configured</p><h2 className="text-4xl font-black text-white">{movie.title}</h2></div>
          </div>
       )}
    </div>
  );
};

const MovieModal = ({ movie, onClose, onPlay, onToggleList, isInList }) => {
    if (!movie) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-8">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
        <div className="relative bg-[#18181b] w-full max-w-5xl h-[92vh] md:h-auto md:max-h-[90vh] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 zoom-in-95 duration-300 border-t md:border border-white/10 rounded-t-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-white hover:text-black transition border border-white/10"><X className="w-5 h-5" /></button>
          <div className="overflow-y-auto flex-1 scrollbar-hide">
            <div className="relative h-[350px] md:h-[500px] shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-[#18181b]/20 to-transparent z-10" />
              <img src={movie.heroImage || movie.image} alt={movie.title} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full z-20 flex flex-col gap-4">
                <h2 className="text-3xl md:text-6xl font-black text-white leading-tight tracking-tighter drop-shadow-2xl">{movie.title}</h2>
                <div className="flex gap-3 md:gap-4 mt-2">
                  <button onClick={() => onPlay(movie)} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-zinc-200 transition active:scale-95 text-sm md:text-base"><Play className="w-4 h-4 md:w-5 md:h-5 fill-black" /> Play</button>
                  <button onClick={() => onToggleList(movie)} className="flex-1 md:flex-none justify-center flex items-center gap-2 border border-zinc-600 bg-black/40 text-white px-6 py-3 rounded-lg font-bold hover:bg-white/10 hover:border-white transition active:scale-95 text-sm md:text-base">{isInList ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}{isInList ? 'In List' : 'My List'}</button>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-[2fr_1fr] gap-8 p-6 md:p-12 pt-0 text-white pb-24 md:pb-12">
              <div><p className="text-base md:text-lg leading-relaxed text-zinc-300 mb-8 font-light">{movie.description}</p></div>
              <div className="space-y-6"><div className="flex flex-col gap-1 text-sm"><span className="text-zinc-500 font-bold text-xs uppercase tracking-wider mb-1">Genres</span><span className="text-zinc-300">{movie.genre}</span></div></div>
            </div>
          </div>
        </div>
      </div>
    );
};

const MobileNav = ({ activeTab, setActiveTab }) => (
  <div className="md:hidden fixed bottom-0 w-full bg-[#09090b]/90 backdrop-blur-xl border-t border-white/5 z-50 pb-safe">
    <div className="flex justify-around items-center py-1">
      {['Home', 'Search', 'List', 'Admin'].map((item) => (
        <button key={item} onClick={() => setActiveTab(item.toLowerCase())} className={`flex flex-col items-center gap-1 p-3 w-full transition-all duration-300 relative overflow-hidden ${activeTab === item.toLowerCase() ? 'text-white' : 'text-zinc-500'}`}>
          <span className="text-[10px] font-medium">{item}</span>
          {activeTab === item.toLowerCase() && <span className="absolute top-0 w-12 h-1 bg-red-600 rounded-b-full shadow-[0_0_10px_#dc2626]"></span>}
        </button>
      ))}
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [movies, setMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [playingState, setPlayingState] = useState(null);
  const [myList, setMyList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('yama_token'));
  
  // Init Data
  useEffect(() => {
     const initMovies = async () => {
         const data = await api.getMovies();
         if (data.length === 0 && !api.isLive()) {
             // Seed mock data if simulated
             localStorage.setItem('yama_movies', JSON.stringify(initialData));
             setMovies(initialData);
         } else {
             setMovies(data);
         }
     };
     initMovies();
     
     const handleScroll = () => setIsScrolled(window.scrollY > 20);
     window.addEventListener('scroll', handleScroll);
     return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const recommendedMovies = useMemo(() => {
    if (myList.length === 0) return movies.filter(m => m.rating?.includes('9')).slice(0, 10);
    const userGenres = new Set(myList.map(m => m.genre?.split(' ')[0]));
    return movies.filter(m => !myList.find(l => l.id === m.id) && userGenres.has(m.genre?.split(' ')[0]));
  }, [myList, movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter(m => m.title?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [movies, searchQuery]);

  const toggleList = (movie) => {
    setMyList(prev => prev.find(m => m.id === movie.id) ? prev.filter(m => m.id !== movie.id) : [...prev, movie]);
  };

  return (
    <div className="bg-[#09090b] min-h-screen text-white font-sans selection:bg-red-900 selection:text-white pb-24 md:pb-0">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isScrolled={isScrolled} isLive={api.isLive()} />

      {activeTab === 'home' && (
        <div className="animate-in fade-in duration-700">
          {movies.length > 0 && <Hero movie={movies[0]} onPlay={(m) => { setSelectedMovie(null); setPlayingState({ movie: m }); }} onMoreInfo={setSelectedMovie} />}
          <div className="relative z-10 -mt-20 md:-mt-48 space-y-2 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent pt-10 md:pt-32">
            {recommendedMovies.length > 0 && <MovieRow title="Recommended For You" movies={recommendedMovies} onSelectMovie={setSelectedMovie} isSpecial={true} />}
            <MovieRow title="Trending Now" movies={movies} onSelectMovie={setSelectedMovie} />
          </div>
        </div>
      )}

      {activeTab === 'search' && (
        <div className="pt-28 px-4 md:px-12 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative max-w-4xl mx-auto mb-8 md:mb-12 sticky top-[70px] md:top-[90px] z-40">
             <div className="relative group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
               <input type="text" placeholder="Search..." className="w-full backdrop-blur-xl border border-white/10 py-4 md:py-5 pl-14 pr-6 rounded-2xl text-base md:text-lg focus:outline-none bg-zinc-900/80" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
             </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 pb-10">
             {filteredMovies.map(movie => (
                <div key={movie.id} onClick={() => setSelectedMovie(movie)} className="cursor-pointer group relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg ring-1 ring-white/5 hover:ring-white/20 transition-all">
                   <img src={movie.image} alt={movie.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="pt-28 px-4 md:px-12 min-h-screen animate-in fade-in duration-500">
          <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 tracking-tight">My List</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 pb-10">
            {myList.map(movie => (
                <div key={movie.id} onClick={() => setSelectedMovie(movie)} className="cursor-pointer group relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg ring-1 ring-white/5 hover:ring-white/20 transition-all">
                    <img src={movie.image} alt={movie.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        adminToken 
          ? <AdminPanel movies={movies} setMovies={setMovies} onLogout={() => { setAdminToken(null); localStorage.removeItem('yama_token'); }} /> 
          : <AdminLogin onLogin={setAdminToken} />
      )}

      <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} onPlay={(m) => { setSelectedMovie(null); setPlayingState({ movie: m }); }} isInList={selectedMovie ? myList.some(m => m.id === selectedMovie.id) : false} onToggleList={toggleList} />
      {playingState && <VideoPlayer movie={playingState.movie} episode={playingState.episode} onClose={() => setPlayingState(null)} />}

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}