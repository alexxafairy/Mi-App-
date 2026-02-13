
import React, { useMemo, useState, useEffect } from 'react';
import { DiaryEntry, DietPlan } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis } from 'recharts';
import { db, CloudConfig } from '../services/dbService';

interface Props {
  diaryEntries: DiaryEntry[];
  dietPlan: DietPlan | null;
  onImport: (data: { diary: DiaryEntry[], diet: DietPlan | null }) => void;
  onCloudStatusChange: (enabled: boolean) => void;
}

const SummarySection: React.FC<Props> = ({ diaryEntries, dietPlan, onImport, onCloudStatusChange }) => {
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(db.getConfig());
  const [showAdmin, setShowAdmin] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean, message?: string}>({});
  const [isTesting, setIsTesting] = useState(false);

  const emotionData = useMemo(() => {
    const counts: Record<string, number> = {};
    diaryEntries.forEach(e => {
      if (!e.emociones) return;
      const words = e.emociones.split(/[, ]+/);
      words.forEach(w => {
        const word = w.toLowerCase().trim();
        if (word.length > 2) counts[word] = (counts[word] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).slice(0, 5);
  }, [diaryEntries]);

  const activityData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const currentWeek = days.map(day => ({ day, entries: 0 }));
    diaryEntries.forEach(entry => {
      const entryDate = new Date(entry.fecha);
      if (!isNaN(entryDate.getTime())) {
        currentWeek[entryDate.getDay()].entries += 1;
      }
    });
    return currentWeek;
  }, [diaryEntries]);

  const COLORS = ['#5294FF', '#FF4D50', '#FACC00', '#05E17A', '#7A83FF'];

  const handleTest = async () => {
    setIsTesting(true);
    const result = await db.testConnection();
    setTestResult(result);
    setIsTesting(false);
  };

  const handleResetMaster = () => {
    if (confirm("¿Forzar sincronización maestra? Esto limpiará la caché y usará las llaves del script.")) {
      db.resetToMaster();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-bold border-b-[4px] border-[var(--main)] inline-block uppercase italic">Centro de Control</h2>
        <div className="flex items-center space-x-2 bg-emerald-100 border-2 border-emerald-500 px-3 py-1 rounded-full">
           <span className="text-[10px] font-black text-emerald-700 uppercase">Estudio Conectado</span>
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="clay-card p-6">
          <h3 className="font-bold text-xs uppercase mb-6 tracking-widest">Frecuencia de Emociones</h3>
          <div className="h-64">
            {emotionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={emotionData} dataKey="value" stroke="#000" strokeWidth={2}>
                    {emotionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#fff', border: '2px solid #000', borderRadius: '5px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold opacity-30 uppercase italic text-center px-10">
                Graba tus escenas en el diario para ver estadísticas
              </div>
            )}
          </div>
        </div>

        <div className="clay-card p-6">
          <h3 className="font-bold text-xs uppercase mb-6 tracking-widest">Producción Semanal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <XAxis dataKey="day" axisLine={{ stroke: '#000', strokeWidth: 2 }} tick={{ fill: '#000', fontWeight: 'bold' }} />
                <Bar dataKey="entries" fill="var(--main)" stroke="#000" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="clay-card p-8 bg-black text-white border-black border-[3px] shadow-[8px_8px_0px_0px_#10b981]">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">📡</span>
                <h3 className="font-bold text-xl uppercase italic">Sincronización en la Nube</h3>
              </div>
              <p className="text-xs opacity-70">Usa este botón en CUALQUIER dispositivo para forzar la descarga de tus datos.</p>
            </div>
            
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <button 
                onClick={handleResetMaster}
                className="px-6 py-3 bg-amber-400 border-2 border-black text-black font-black uppercase text-[10px] shadow-[3px_3px_0px_0px_#fff] active:translate-y-1 active:shadow-none transition-all"
              >
                🔄 FORZAR SINCRONIZACIÓN
              </button>
              <button 
                onClick={handleTest}
                disabled={isTesting}
                className={`px-6 py-2 border-2 border-white border-opacity-30 text-white font-bold uppercase text-[9px] hover:bg-white hover:text-black transition-all ${isTesting ? 'opacity-50' : ''}`}
              >
                {isTesting ? 'Probando...' : 'Probar Conexión'}
              </button>
            </div>
          </div>

          {testResult.message && (
            <div className={`p-3 border-2 text-[10px] font-bold uppercase text-center rounded ${testResult.success ? 'bg-emerald-900 border-emerald-500 text-emerald-200' : 'bg-red-900 border-red-500 text-red-200'}`}>
              {testResult.success ? '✅ ' : '❌ '} {testResult.message}
            </div>
          )}

          <div className="bg-white bg-opacity-10 p-4 rounded border border-white border-opacity-10">
            <label className="block text-[8px] font-black uppercase opacity-40 mb-1">ID de Estudio Conectado:</label>
            <p className="text-[10px] font-mono text-emerald-400 truncate uppercase">{cloudConfig.url.split('//')[1] || 'Sin Configurar'}</p>
          </div>
          
          <div className="flex justify-center md:justify-end">
            <button 
              onClick={() => setShowAdmin(!showAdmin)}
              className="text-[9px] font-bold opacity-30 hover:opacity-100 transition-opacity uppercase underline"
            >
              {showAdmin ? 'Cerrar Ajustes' : 'Editar Claves Manualmente'}
            </button>
          </div>
        </div>

        {showAdmin && (
          <div className="mt-6 pt-6 border-t border-white border-opacity-10 animate-in">
             <div className="grid gap-4">
                <input 
                  className="w-full bg-slate-900 border-2 border-white border-opacity-20 p-3 text-xs font-mono text-white"
                  value={cloudConfig.url}
                  placeholder="URL del proyecto"
                  onChange={(e) => setCloudConfig({...cloudConfig, url: e.target.value})}
                />
                <input 
                  className="w-full bg-slate-900 border-2 border-white border-opacity-20 p-3 text-xs font-mono text-white"
                  value={cloudConfig.key}
                  type="password"
                  placeholder="Clave API"
                  onChange={(e) => setCloudConfig({...cloudConfig, key: e.target.value})}
                />
                <button 
                  onClick={() => {
                    db.saveConfig({...cloudConfig, enabled: true});
                    window.location.reload();
                  }}
                  className="w-full py-3 bg-white text-black font-black uppercase text-[10px]"
                >
                  ACTUALIZAR LLAVES
                </button>
             </div>
          </div>
        )}
      </div>

      <div className="text-center opacity-20 text-[9px] font-bold uppercase tracking-[0.4em] pt-10">
        ClayMinds Studio Network • v2.1
      </div>
    </div>
  );
};

export default SummarySection;
