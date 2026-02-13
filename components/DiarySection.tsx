
import React, { useState } from 'react';
import { DiaryEntry } from '../types';
import { getDiaryInsight } from '../services/geminiService';

interface Props {
  entries: DiaryEntry[];
  onUpdate: (entries: DiaryEntry[]) => void;
}

const DiarySection: React.FC<Props> = ({ entries, onUpdate }) => {
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
    const newEntryId = Math.random().toString(36).substr(2, 9);
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
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-bold border-b-[4px] border-[var(--main)] inline-block">MI DIARIO</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="clay-button px-6 py-2">
          {isAdding ? 'CANCELAR' : '+ NUEVA ENTRADA'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="clay-card p-6 space-y-6 animate-in">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 uppercase">Fecha</label>
              <input type="date" className="clay-input" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase">Emociones</label>
              <input placeholder="Pánico, alegría, duda..." className="clay-input" value={formData.emociones} onChange={e => setFormData({...formData, emociones: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase">Situación</label>
            <textarea className="clay-input" rows={2} value={formData.situacion} onChange={e => setFormData({...formData, situacion: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 uppercase">Pensamientos Automáticos</label>
            <textarea className="clay-input" rows={2} value={formData.pensamientosAutomaticos} onChange={e => setFormData({...formData, pensamientosAutomaticos: e.target.value})} />
          </div>
          <button type="submit" className="clay-button w-full py-4 text-lg">GUARDAR ENTRADA</button>
        </form>
      )}

      <div className="space-y-6">
        {entries.map(entry => (
          <div key={entry.id} className="clay-card p-6 animate-in hover:bg-white transition-colors">
            <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-slate-100">
              <span className="bg-black text-white px-3 py-1 text-xs font-bold rounded-[3px] uppercase tracking-tighter">{entry.fecha}</span>
              <button onClick={() => onUpdate(entries.filter(e => e.id !== entry.id))} className="text-xs font-bold text-red-500">ELIMINAR</button>
            </div>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div><h4 className="font-bold text-xs uppercase mb-1 opacity-50">Situación</h4><p>{entry.situacion}</p></div>
              <div><h4 className="font-bold text-xs uppercase mb-1 opacity-50">Emoción</h4><p className="font-bold">{entry.emociones}</p></div>
              <div><h4 className="font-bold text-xs uppercase mb-1 opacity-50">Pensamiento</h4><p className="italic">"{entry.pensamientosAutomaticos}"</p></div>
            </div>
            {entry.insight && (
              <div className="mt-6 p-4 bg-[var(--main)] bg-opacity-20 border-[2px] border-black rounded-[5px]">
                <h5 className="text-[10px] font-bold uppercase mb-1">Análisis de IA:</h5>
                <p className="text-sm font-bold">{entry.insight}</p>
              </div>
            )}
            {loadingId === entry.id && <div className="mt-4 text-xs font-bold animate-pulse">Analizando...</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiarySection;
