
import React, { useState, useEffect } from 'react';
import { AppTab, DiaryEntry, DietPlan, EvidenceEntry } from './types';
import DiarySection from './components/DiarySection';
import DietSection from './components/DietSection';
import SummarySection from './components/SummarySection';
import EvidenceSection from './components/EvidenceSection';
import { db } from './services/dbService';

const App: React.FC = () => {
  const DELETED_EVIDENCE_URLS_KEY = 'clayminds_deleted_evidence_urls';
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DIARY);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [evidenceEntries, setEvidenceEntries] = useState<EvidenceEntry[]>([]);
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getDeletedEvidenceUrls = (): Set<string> => {
    try {
      const raw = localStorage.getItem(DELETED_EVIDENCE_URLS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  };

  const saveDeletedEvidenceUrls = (urls: Set<string>) => {
    localStorage.setItem(DELETED_EVIDENCE_URLS_KEY, JSON.stringify(Array.from(urls)));
  };

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

    const deletedUrls = getDeletedEvidenceUrls();
    const visibleEvidences = finalEvidences.filter(e => !deletedUrls.has(e.photo_url));

    setDiaryEntries(finalDiary);
    setDietPlan(finalDiet);
    setEvidenceEntries(visibleEvidences);
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
    // Si una URL había sido marcada como borrada localmente, la removemos.
    const deletedUrls = getDeletedEvidenceUrls();
    if (deletedUrls.has(entry.photo_url)) {
      deletedUrls.delete(entry.photo_url);
      saveDeletedEvidenceUrls(deletedUrls);
    }

    setEvidenceEntries(prev => [entry, ...prev]);
    if (isCloudEnabled) {
      setIsSyncing(true);
      const savedEntry = await db.createEvidence(entry);
      if (savedEntry) {
        setEvidenceEntries(prev => prev.map(e => (e.id === entry.id ? savedEntry : e)));
      }
      setIsSyncing(false);
    }
  };

  const deleteEvidence = async (entry: EvidenceEntry) => {
    const deletedUrls = getDeletedEvidenceUrls();
    deletedUrls.add(entry.photo_url);
    saveDeletedEvidenceUrls(deletedUrls);

    // 1. Actualizamos UI inmediatamente
    setEvidenceEntries(prev => prev.filter(e => String(e.id) !== String(entry.id)));

    // 2. Borramos en segundo plano
    if (isCloudEnabled) {
      setIsSyncing(true);
      try {
        const deleted = await db.deleteEvidence(entry);
        if (!deleted) {
          // Si backend no pudo borrar, mantenemos oculto localmente para evitar reapariciones.
          console.warn('No se pudo borrar en nube; la evidencia se mantendrá oculta localmente.');
        } else {
          // Confirmamos estado real desde nube para evitar que reaparezca al refrescar.
          const cloudEvidences = await db.fetchFromCloud('evidences');
          if (cloudEvidences) {
            const hiddenUrls = getDeletedEvidenceUrls();
            setEvidenceEntries(cloudEvidences.filter((e: EvidenceEntry) => !hiddenUrls.has(e.photo_url)));
          }
        }
      } catch (e) {
        console.error("Error al borrar en nube:", e);
        // Mantenemos oculto localmente aunque falle backend.
      } finally {
        setIsSyncing(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-[var(--main)] border-[4px] border-black rounded-[15px] mx-auto animate-bounce flex items-center justify-center text-4xl shadow-[6px_6px_0px_0px_#000]">
              📸
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border-[3px] border-black rounded-full flex items-center justify-center animate-pulse text-[10px]">
              ✨
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-black uppercase tracking-[0.2em] text-sm text-black">Cargando Estudio</p>
            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">ClayMinds Studio System</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-[var(--main)] border-[3px] border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center rounded-[5px]">
              <span className="text-xl">🎬</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-black italic leading-none">ClayMinds</h1>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">Nutrition & Soul</p>
            </div>
          </div>
          <div className={`flex items-center space-x-2 bg-white border-2 border-black px-3 py-1 rounded-[5px] shadow-[2px_2px_0px_0px_#000] transition-all ${isSyncing ? 'animate-pulse' : ''}`}>
             <span className={`w-2 h-2 rounded-full ${isCloudEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
             <span className="text-[9px] font-black uppercase">{isSyncing ? 'Sincronizando...' : 'Conectado'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        <div className="flex space-x-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
          <TabButton active={activeTab === AppTab.DIARY} onClick={() => setActiveTab(AppTab.DIARY)} label="DIARIO" icon="📔" />
          <TabButton active={activeTab === AppTab.DIET} onClick={() => setActiveTab(AppTab.DIET)} label="DIETA" icon="🥗" />
          <TabButton active={activeTab === AppTab.EVIDENCES} onClick={() => setActiveTab(AppTab.EVIDENCES)} label="EVIDENCIAS" icon="📸" />
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
