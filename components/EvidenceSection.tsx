
import React, { useState, useRef, useEffect } from 'react';
import { EvidenceEntry } from '../types';
import { db } from '../services/dbService';

interface Props {
  entries: EvidenceEntry[];
  onAdd: (entry: EvidenceEntry) => void;
}

const TASKS = [
  "Bañarme (Diaria)",
  "Caminar 30 min (Diaria)",
  "Nadar (Mar/Jue)",
  "Visitar a un amigo (Semanal)",
  "Otra tarea psicológica"
];

const EvidenceSection: React.FC<Props> = ({ entries, onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState(TASKS[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localEntries, setLocalEntries] = useState<EvidenceEntry[]>(entries);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado local cuando cambian las props
  useEffect(() => {
    setLocalEntries(entries);
  }, [entries]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const cloudData = await db.fetchFromCloud('evidences');
    if (cloudData) {
      setLocalEntries(cloudData);
    }
    setIsRefreshing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const photoUrl = await db.uploadFile(file);
      if (photoUrl) {
        const newEntry: EvidenceEntry = {
          id: Math.random().toString(36).substr(2, 9),
          task_name: selectedTask,
          photo_url: photoUrl,
          created_at: new Date().toISOString()
        };
        // Guardar en la nube primero
        await db.syncToCloud('evidences', newEntry);
        // Actualizar UI
        onAdd(newEntry);
        setIsAdding(false);
      } else {
        alert("Error al subir la imagen. Verifica que el bucket 'evidences' sea público.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al subir.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateAnim = (task: string) => {
    alert(`¡Director! Preparando el set de arcilla para: "${task}".`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-bold border-b-[4px] border-amber-400 inline-block uppercase italic">Mis Logros</h2>
          <button 
            onClick={handleRefresh}
            className={`ml-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
          >
            {isRefreshing ? '⌛ Cargando...' : '🔄 Sincronizar'}
          </button>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className="clay-button bg-amber-400 px-6 py-2 shadow-[4px_4px_0px_0px_#000]"
        >
          {isAdding ? 'CANCELAR' : '+ REGISTRAR'}
        </button>
      </div>

      {isAdding && (
        <div className="clay-card p-8 space-y-6 animate-in bg-amber-50">
          <div className="space-y-4">
            <label className="block text-xs font-black uppercase tracking-widest opacity-60">¿Qué logramos hoy?</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TASKS.map(task => (
                <button 
                  key={task}
                  onClick={() => setSelectedTask(task)}
                  className={`px-4 py-3 rounded-[5px] border-2 font-bold text-xs transition-all text-left ${
                    selectedTask === task 
                    ? 'bg-black text-white border-black scale-[1.02]' 
                    : 'bg-white border-slate-200 hover:border-black'
                  }`}
                >
                  {selectedTask === task && <span className="mr-2">✔️</span>}
                  {task}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-dashed border-amber-200">
            <label className="block text-xs font-black uppercase tracking-widest opacity-60 mb-4">Sube tu evidencia (Foto):</label>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`w-full py-10 border-4 border-dashed border-slate-300 rounded-[10px] flex flex-col items-center justify-center transition-all hover:border-amber-400 hover:bg-white active:scale-[0.98] ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
            >
              <span className="text-4xl mb-2">{isUploading ? '⏳' : '📸'}</span>
              <span className="font-black uppercase text-xs tracking-widest">
                {isUploading ? 'Subiendo a la nube...' : 'Toca para elegir foto'}
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {localEntries.map(entry => (
          <div key={entry.id} className="clay-card p-4 pb-6 transform rotate-1 hover:rotate-0 transition-transform bg-white relative">
            <div className="aspect-square w-full mb-4 bg-slate-100 rounded-[3px] overflow-hidden border-2 border-black relative group">
              <img 
                src={entry.photo_url} 
                alt={entry.task_name} 
                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Error+de+Carga';
                }}
              />
              <div className="absolute top-2 right-2 bg-black text-white text-[9px] font-black px-2 py-1 uppercase rounded">
                {new Date(entry.created_at).toLocaleDateString()}
              </div>
              
              <button 
                onClick={() => handleGenerateAnim(entry.task_name)}
                className="absolute bottom-3 right-3 bg-amber-400 border-2 border-black p-2 rounded-full shadow-[2px_2px_0px_0px_#000] hover:translate-y-[-2px] transition-all opacity-0 group-hover:opacity-100"
              >
                🎬
              </button>
            </div>
            <div className="space-y-1 text-center">
               <h4 className="font-black uppercase italic tracking-tighter text-lg leading-tight">{entry.task_name}</h4>
               <p className="text-[9px] font-bold opacity-30 uppercase tracking-[0.2em]">ClayMinds Studio Shot</p>
            </div>
          </div>
        ))}
        {localEntries.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center clay-card bg-slate-50 border-dashed opacity-40">
            <p className="font-black uppercase italic tracking-widest">Aún no hay clips en tu galería</p>
            <button onClick={handleRefresh} className="text-[10px] uppercase font-bold mt-2 underline">Intentar sincronizar ahora</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EvidenceSection;
