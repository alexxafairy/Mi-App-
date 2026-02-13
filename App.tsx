
import React, { useState, useEffect } from 'react';
import { AppTab, DiaryEntry, DietPlan, EvidenceEntry } from './types';
import DiarySection from './components/DiarySection';
import DietSection from './components/DietSection';
import SummarySection from './components/SummarySection';
import EvidenceSection from './components/EvidenceSection';
import { db } from './services/dbService';
import { Star22, Star8 } from './icons/Stars';

const USER_PHOTO = "https://i.postimg.cc/5yDwTwRh/frente.png";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DIARY);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [evidenceEntries, setEvidenceEntries] = useState<EvidenceEntry[]>([]);
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initApp = async () => {
    const cloudConfig = db.getConfig();
    setIsCloudEnabled(cloudConfig.enabled);

    let finalDiary: DiaryEntry[] = [];
    let finalDiet: DietPlan | null = null;
    let finalEvidences: EvidenceEntry[] = [];

    if (cloudConfig.enabled && cloudConfig.url) {
      const cloudDiary = await db.fetchFromCloud('diary');
      const cloudDiet = await db.fetchFromCloud('diet');
      const cloudEvidences = await db.fetchFromCloud('evidences');
      if (cloudDiary) finalDiary = cloudDiary;
      if (cloudDiet) finalDiet = cloudDiet;
      if (cloudEvidences) finalEvidences = cloudEvidences;
    }

    setDiaryEntries(finalDiary);
    setDietPlan(finalDiet);
    setEvidenceEntries(finalEvidences);
    setIsLoading(false);
  };

  useEffect(() => {
    initApp();
  }, []);

  const saveDiary = async (newEntries: DiaryEntry[]) => {
    setDiaryEntries(newEntries);
    if (isCloudEnabled) {
      setIsSyncing(true);
      await db.syncToCloud('diary', newEntries);
      setIsSyncing(false);
    }
  };

  const deleteDiaryEntry = async (id: string) => {
    setDiaryEntries(prev => prev.filter(e => e.id !== id));
    if (isCloudEnabled) {
      setIsSyncing(true);
      await db.deleteFromCloud('diary', id);
      setIsSyncing(false);
    }
  };

  const saveDiet = async (plan: DietPlan) => {
    setDietPlan(plan);
    if (isCloudEnabled) {
      setIsSyncing(true);
      await db.syncToCloud('diet', plan);
      setIsSyncing(false);
    }
  };

  const addEvidence = async (entry: EvidenceEntry) => {
    setEvidenceEntries(prev => [entry, ...prev]);
    if (isCloudEnabled) {
      setIsSyncing(true);
      try {
        const savedEntry = await db.createEvidence(entry);
        if (savedEntry) {
          setEvidenceEntries(prev => prev.map(e => (e.id === entry.id ? savedEntry : e)));
        }
      } catch (err) {
        console.error("Error guardando evidencia:", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const deleteEvidence = async (entry: EvidenceEntry) => {
    // 1. Actualizamos UI inmediatamente (Borrado Optimista)
    setEvidenceEntries(prev => prev.filter(e => String(e.id) !== String(entry.id)));

    // 2. Intentamos borrar en la nube
    if (isCloudEnabled) {
      setIsSyncing(true);
      try {
        const deleted = await db.deleteEvidence(entry);
        if (!deleted) {
          // Rollback si el backend no eliminó nada (ej: políticas RLS o error silencioso)
          setEvidenceEntries(prev => {
            const exists = prev.some(e => String(e.id) === String(entry.id));
            return exists ? prev : [entry, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
          alert('No se pudo borrar permanentemente de la nube. Por favor, intenta de nuevo o sincroniza tu estudio.');
        }
      } catch (e) {
        console.error("Error al borrar en nube:", e);
        // Rollback por excepción de red
        setEvidenceEntries(prev => {
          const exists = prev.some(e => String(e.id) === String(entry.id));
          return exists ? prev : [entry, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
      } finally {
        setIsSyncing(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white/60 backdrop-blur-sm">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-48 h-48 bg-white border-[6px] border-black rounded-full mx-auto animate-bounce overflow-hidden shadow-[10px_10px_0px_0px_#000]">
              <img src={USER_PHOTO} alt="Mariana" className="w-full h-full object-cover" />
            </div>
            <Star22 className="absolute -top-8 -left-8 animate-spin-slow" size={50} color="var(--theme-2-main)" />
            <Star8 className="absolute -bottom-6 -right-6 animate-pulse" size={60} color="var(--theme-1-main)" />
          </div>
          <div className="space-y-1">
            <p className="font-black uppercase tracking-[0.2em] text-sm text-black">Preparando tu diario, Mariana</p>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Acompañamiento Personal</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-10 relative overflow-hidden">
      <Star22 className="absolute top-10 -left-10 opacity-10 rotate-12" size={200} color="var(--theme-0-main)" />
      <Star8 className="absolute bottom-20 -right-20 opacity-10 -rotate-12" size={300} color="var(--theme-2-main)" />

      <header className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-28 h-28 bg-white border-[4px] border-black shadow-[6px_6px_0px_0px_#000] rounded-full overflow-hidden transform -rotate-3 flex-shrink-0">
              <img src={USER_PHOTO} alt="Mariana" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-[10px] border-2 border-black">
              <h1 className="text-3xl font-bold tracking-tight text-black italic leading-none relative">
                El diario de Mariana :)
                <Star8 className="absolute -top-6 -right-8" size={24} color="var(--theme-2-main)" />
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mt-2">Cuidado Personal y Bienestar</p>
            </div>
          </div>
          <div className={`flex items-center space-x-2 bg-white border-2 border-black px-4 py-2 rounded-[5px] shadow-[3px_3px_0px_0px_#000] transition-all ${isSyncing ? 'animate-pulse' : ''}`}>
             <span className={`w-2.5 h-2.5 rounded-full ${isCloudEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
             <span className="text-[10px] font-black uppercase tracking-widest">{isSyncing ? 'Sincronizando...' : 'Conectado'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="flex space-x-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
          <TabButton active={activeTab === AppTab.DIARY} onClick={() => setActiveTab(AppTab.DIARY)} label="DIARIO" icon="📔" />
          <TabButton active={activeTab === AppTab.DIET} onClick={() => setActiveTab(AppTab.DIET)} label="DIETA" icon="🥗" />
          <TabButton active={activeTab === AppTab.EVIDENCES} onClick={() => setActiveTab(AppTab.EVIDENCES)} label="LOGROS" icon="📸" />
          <TabButton active={activeTab === AppTab.SUMMARY} onClick={() => setActiveTab(AppTab.SUMMARY)} label="RESUMEN" icon="📊" />
        </div>

        <div className="animate-in">
          {activeTab === AppTab.DIARY && <DiarySection entries={diaryEntries} onUpdate={saveDiary} onDelete={deleteDiaryEntry} />}
          {activeTab === AppTab.DIET && <DietSection plan={dietPlan} onUpdate={saveDiet} />}
          {activeTab === AppTab.EVIDENCES && (
            <EvidenceSection 
              entries={evidenceEntries} 
              onAdd={addEvidence} 
              onDelete={deleteEvidence} 
              onRefresh={initApp} 
            />
          )}
          {activeTab === AppTab.SUMMARY && (
            <SummarySection 
              diaryEntries={diaryEntries} 
              dietPlan={dietPlan} 
              onImport={(data) => {
                saveDiary(data.diary);
                if (data.diet) saveDiet(data.diet);
                window.location.reload();
              }}
              onCloudStatusChange={setIsCloudEnabled}
            />
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-[3px] border-black flex justify-around py-4 md:hidden z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
        <NavIcon active={activeTab === AppTab.DIARY} onClick={() => setActiveTab(AppTab.DIARY)} icon="📔" />
        <NavIcon active={activeTab === AppTab.DIET} onClick={() => setActiveTab(AppTab.DIET)} icon="🥗" />
        <NavIcon active={activeTab === AppTab.EVIDENCES} onClick={() => setActiveTab(AppTab.EVIDENCES)} icon="📸" />
        <NavIcon active={activeTab === AppTab.SUMMARY} onClick={() => setActiveTab(AppTab.SUMMARY)} icon="📊" />
      </nav>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; icon: string }> = ({ active, onClick, label, icon }) => (
  <button onClick={onClick} className={`flex items-center space-x-2 px-6 py-3 border-[3px] border-black font-bold text-xs transition-all rounded-[5px] shadow-[4px_4px_0px_0px_#000] bg-white whitespace-nowrap active:translate-y-1 active:shadow-none ${active ? 'tab-active' : 'hover:bg-slate-50'}`}>
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

const NavIcon: React.FC<{ active: boolean; onClick: () => void; icon: string }> = ({ active, onClick, icon }) => (
  <button onClick={onClick} className={`p-2 rounded-[5px] border-[2px] transition-all ${active ? 'bg-[var(--main)] border-black' : 'border-transparent'}`}>
    <span className="text-xl">{icon}</span>
  </button>
);

export default App;
