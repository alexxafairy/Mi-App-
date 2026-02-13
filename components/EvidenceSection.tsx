
import React, { useState, useRef } from 'react';
import { EvidenceEntry } from '../types';
import { db } from '../services/dbService';
import { Star8, Star22 } from '../icons/Stars';
import { ChevronDown, Plus, CheckCircle2, Image as ImageIcon, Trash2, Calendar } from 'lucide-react';

interface Props {
  entries: EvidenceEntry[];
  onAdd: (entry: EvidenceEntry) => void;
  onDelete: (entry: EvidenceEntry) => void;
  onRefresh: () => void;
}

const TASKS = [
  { id: 'bath', name: "Bañarme (Diaria)", icon: "🚿" },
  { id: 'walk', name: "Caminar 30 min (Diaria)", icon: "👟" },
  { id: 'swim', name: "Nadar (Mar/Jue)", icon: "🏊‍♀️" },
  { id: 'friend', name: "Visitar a un amigo (Semanal)", icon: "🫂" },
  { id: 'diet', name: "Completar Dieta del Médico", icon: "🥗" },
  { id: 'other', name: "Otra tarea personal", icon: "✨" }
];

const EvidenceSection: React.FC<Props> = ({ entries, onAdd, onDelete, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<typeof TASKS[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedTask) {
      alert("Por favor, selecciona primero qué logro estás registrando.");
      return;
    }

    setIsUploading(true);
    try {
      const photoUrl = await db.uploadFile(file);
      if (photoUrl) {
        const todayStr = new Date().toISOString().split('T')[0];
        const createdAt = selectedDate === todayStr 
          ? new Date().toISOString() 
          : new Date(selectedDate + 'T12:00:00').toISOString();

        const newEntry: EvidenceEntry = {
          id: crypto.randomUUID(),
          task_name: selectedTask.name,
          photo_url: photoUrl,
          created_at: createdAt
        };
        onAdd(newEntry);
        setIsAdding(false);
        setSelectedTask(null);
        setSelectedDate(new Date().toISOString().split('T')[0]);
      } else {
        alert("Error al subir la imagen. Verifica tu conexión.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al subir.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = (entry: EvidenceEntry) => {
    let shouldDelete = true;
    try {
      shouldDelete = window.confirm("¿Eliminar este registro? No se puede deshacer.");
    } catch {
      shouldDelete = true;
    }
    if (shouldDelete) {
      onDelete(entry);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div className="relative">
          <h2 className="text-3xl font-bold border-b-[6px] border-amber-400 inline-block uppercase italic pr-8 text-black">
            Mis Logros
          </h2>
          <Star8 className="absolute -top-4 -right-2 animate-pulse" size={24} color="var(--theme-1-main)" />
          <div className="flex items-center mt-2">
            <button 
              onClick={handleRefresh}
              className={`text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors flex items-center gap-1 ${isRefreshing ? 'opacity-50' : ''}`}
            >
              {isRefreshing ? '⌛ Cargando...' : '🔄 Actualizar Logros'}
            </button>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)} 
          className={`clay-button ${isAdding ? 'bg-red-400' : 'bg-amber-400'} px-8 py-3 shadow-[5px_5px_0px_0px_#000] text-sm flex items-center gap-2`}
        >
          {isAdding ? 'CANCELAR' : <><Plus size={18} strokeWidth={3} /> REGISTRAR LOGRO</>}
        </button>
      </div>

      {isAdding && (
        <div className="clay-card p-8 space-y-8 animate-in bg-amber-50 border-amber-400 shadow-[8px_8px_0px_0px_#000]">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-[0.2em] opacity-60">
                Paso 1: ¿Qué lograste hoy, Mariana?
              </label>
              
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full clay-input bg-white flex items-center justify-between text-left border-2 border-black px-4 py-4 font-bold shadow-[4px_4px_0px_0px_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all"
                >
                  <div className="flex items-center gap-3">
                    {selectedTask ? (
                      <>
                        <span className="text-xl">{selectedTask.icon}</span>
                        <span className="uppercase tracking-tight text-black">{selectedTask.name}</span>
                      </>
                    ) : (
                      <span className="opacity-40 uppercase tracking-widest text-xs italic">Selecciona tu actividad...</span>
                    )}
                  </div>
                  <ChevronDown className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-black rounded-[10px] shadow-[8px_8px_0px_0px_#000] z-[100] overflow-hidden animate-in">
                    <div className="p-2 bg-slate-50 border-b-2 border-black">
                       <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2">Actividades Sugeridas</p>
                    </div>
                    {TASKS.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-4 px-4 py-4 text-left font-bold uppercase text-xs hover:bg-amber-100 transition-colors border-b-2 last:border-0 border-slate-100 text-black"
                      >
                        <span className="text-xl w-8 text-center">{task.icon}</span>
                        <span className="flex-grow">{task.name}</span>
                        {selectedTask?.id === task.id && <CheckCircle2 size={16} className="text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-[0.2em] opacity-60">
                Paso 2: ¿Cuándo lo lograste?
              </label>
              <div className="relative">
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full clay-input bg-white border-2 border-black px-4 py-4 font-bold shadow-[4px_4px_0px_0px_#000] text-black appearance-none"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" size={20} />
              </div>
            </div>
          </div>

          <div className={`pt-8 border-t-4 border-dashed border-amber-200 transition-all duration-500 ${!selectedTask ? 'opacity-20 grayscale pointer-events-none scale-95' : 'opacity-100'}`}>
            <label className="block text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-6 flex items-center gap-2">
              Paso 3: Sube una foto de tu logro <Star22 size={16} color="var(--theme-2-main)" />
            </label>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`w-full py-12 bg-white border-4 border-dashed border-slate-300 rounded-[15px] flex flex-col items-center justify-center transition-all group hover:border-amber-400 hover:bg-amber-100 active:scale-[0.98] ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
            >
              <div className="w-20 h-20 bg-amber-400 border-[3px] border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#000] mb-4 group-hover:rotate-6 transition-transform">
                {isUploading ? <span className="text-3xl animate-spin">⏳</span> : <ImageIcon size={32} strokeWidth={2.5} />}
              </div>
              <p className="font-black uppercase text-sm tracking-widest text-black">
                {isUploading ? 'Guardando registro...' : 'Toca para subir foto'}
              </p>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-10 mt-12">
        {entries.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="inline-block p-10 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[20px] opacity-40">
              <Star22 size={60} color="#cbd5e1" className="mx-auto mb-4 animate-pulse" />
              <p className="font-black uppercase tracking-widest text-xs italic">Aquí aparecerán tus momentos de orgullo, Mariana</p>
            </div>
          </div>
        ) : (
          entries.map((entry, idx) => (
            <div 
              key={entry.id} 
              className="clay-card p-5 pb-8 transform transition-all hover:scale-[1.02] bg-white relative group"
              style={{ rotate: idx % 2 === 0 ? '0.5deg' : '-0.5deg' }}
            >
              <div className="aspect-[4/5] w-full mb-6 bg-slate-100 rounded-[8px] overflow-hidden border-[3px] border-black relative shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)]">
                <img 
                  src={entry.photo_url} 
                  alt={entry.task_name} 
                  className="w-full h-full object-cover transition-all duration-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Registro+no+encontrado';
                  }}
                />
                
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-black text-[9px] font-black px-2 py-1 uppercase rounded-[3px] border-2 border-black z-10 flex items-center gap-1">
                   <Star8 size={10} color="var(--theme-1-main)" /> {new Date(entry.created_at).toLocaleDateString()}
                </div>
                
                <div className="absolute bottom-4 right-4 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all z-[60]">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      confirmDelete(entry);
                    }}
                    className="bg-red-500 border-[3px] border-black p-3 rounded-[8px] shadow-[3px_3px_0px_0px_#000] hover:bg-red-600 active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                  >
                    <Trash2 size={20} color="white" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-center">
                 <div className="relative inline-block">
                    <Star22 className="absolute -top-4 -right-4 animate-pulse" size={20} color="var(--theme-1-main)" />
                 </div>
                 <h4 className="font-black uppercase italic tracking-tighter text-2xl leading-none text-black">
                   {entry.task_name}
                 </h4>
                 <div className="flex items-center justify-center gap-2 opacity-20">
                   <div className="h-[2px] w-6 bg-black" />
                   <p className="text-[10px] font-bold uppercase tracking-[0.3em]">
                     {new Date(entry.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                   </p>
                   <div className="h-[2px] w-6 bg-black" />
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EvidenceSection;
