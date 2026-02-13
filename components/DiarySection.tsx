
import React, { useState } from 'react';
import { DiaryEntry } from '../types';
import { getDiaryInsight } from '../services/geminiService';

interface Props {
  entries: DiaryEntry[];
  onUpdate: (entries: DiaryEntry[]) => void;
  onDelete: (id: string) => void;
}

const DiarySection: React.FC<Props> = ({ entries, onUpdate, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    situacion: '',
    emociones: '',
    pensamientosAutomaticos: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEntryId = crypto.randomUUID();
    const newEntry: DiaryEntry = { id: newEntryId, ...formData, createdAt: Date.now() };
    const updatedEntries = [newEntry, ...entries];
    
    onUpdate(updatedEntries);
    setIsAdding(false);
    setFormData({ fecha: new Date().toISOString().split('T')[0], situacion: '', emociones: '', pensamientosAutomaticos: '' });
    
    setLoadingId(newEntryId);
    try {
      const insightResponse = await getDiaryInsight(newEntry);
      onUpdate(updatedEntries.map(e => e.id === newEntryId ? { ...e, insight: insightResponse } : e));
    } catch (err) {
      console.error("Error obteniendo insight:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = (id: string) => {
    if (confirm("¿Eliminar esta entrada del diario?")) {
      onDelete(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-bold border-b-[4px] border-[var(--main)] inline-block uppercase text-black italic">Mi Diario Emocional</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="clay-button px-6 py-2 text-xs bg-[var(--main)]">
          {isAdding ? 'CANCELAR' : '+ EXPRESAR SENTIMIENTOS'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="clay-card p-6 space-y-6 animate-in bg-white border-black">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 uppercase opacity-60">Fecha</label>
              <input type="date" className="clay-input text-sm border-2 border-black" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase opacity-60">¿Cómo te sientes?</label>
              <input placeholder="Ej: Tranquila, ansiosa, feliz..." className="clay-input text-sm border-2 border-black" value={formData.emociones} onChange={e => setFormData({...formData, emociones: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase opacity-60">¿Qué sucedió?</label>
            <textarea className="clay-input text-sm border-2 border-black" rows={2} value={formData.situacion} onChange={e => setFormData({...formData, situacion: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase opacity-60">¿Qué pensaste en ese momento?</label>
            <textarea className="clay-input text-sm border-2 border-black" rows={2} value={formData.pensamientosAutomaticos} onChange={e => setFormData({...formData, pensamientosAutomaticos: e.target.value})} />
          </div>
          <button type="submit" className="clay-button w-full py-4 text-sm uppercase bg-[var(--main)]">GUARDAR EN MI DIARIO</button>
        </form>
      )}

      <div className="space-y-6">
        {entries.map(entry => (
          <div key={entry.id} className="clay-card p-6 animate-in hover:bg-slate-50 transition-colors bg-white border-black">
            <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-slate-100">
              <span className="bg-black text-white px-3 py-1 text-[10px] font-bold rounded-[3px] uppercase tracking-tighter">{entry.fecha}</span>
              <button onClick={() => handleRemove(entry.id)} className="text-[10px] font-bold text-red-500 uppercase underline">Eliminar entrada</button>
            </div>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div><h4 className="font-bold text-[10px] uppercase mb-1 opacity-40">Situación</h4><p className="leading-snug text-black">{entry.situacion}</p></div>
              <div><h4 className="font-bold text-[10px] uppercase mb-1 opacity-40">Emoción</h4><p className="font-bold text-black">{entry.emociones}</p></div>
              <div><h4 className="font-bold text-[10px] uppercase mb-1 opacity-40">Pensamiento</h4><p className="italic text-slate-700">"{entry.pensamientosAutomaticos}"</p></div>
            </div>
            {entry.insight && (
              <div className="mt-6 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-[5px]">
                <h5 className="text-[10px] font-black uppercase mb-1 text-emerald-700 flex items-center gap-1">✨ Reflexión de Apoyo:</h5>
                <p className="text-sm font-bold leading-relaxed text-black">{entry.insight}</p>
              </div>
            )}
            {loadingId === entry.id && <div className="mt-4 text-[10px] font-bold animate-pulse uppercase text-slate-400 italic">Generando reflexión de bienestar...</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiarySection;
