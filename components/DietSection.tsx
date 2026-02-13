
import React, { useState, useEffect } from 'react';
import { DietPlan, Meal } from '../types';
import { parseDietFromText } from '../services/geminiService';

interface Props {
  plan: DietPlan | null;
  onUpdate: (plan: DietPlan) => void;
}

const THEMES = [
  { main: 'var(--theme-0-main)', bg: 'var(--theme-0-bg)' },
  { main: 'var(--theme-1-main)', bg: 'var(--theme-1-bg)' },
  { main: 'var(--theme-2-main)', bg: 'var(--theme-2-bg)' },
  { main: 'var(--theme-3-main)', bg: 'var(--theme-3-bg)' },
];

const DietSection: React.FC<Props> = ({ plan, onUpdate }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!plan);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (plan) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [plan]);

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const result = await parseDietFromText(inputText);
      onUpdate(result);
      setIsEditing(false);
      setShowContent(false);
    } catch (err) {
      alert("Error al procesar la dieta.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMealCompletion = (mealIndex: number) => {
    if (!plan) return;
    const newSchedule = plan.schedule.map((meal, idx) => {
      if (idx === mealIndex) {
        return { ...meal, completed: !meal.completed };
      }
      return meal;
    });
    onUpdate({ ...plan, schedule: newSchedule });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-bold border-b-[4px] border-[var(--main)] inline-block uppercase">PLAN NUTRICIONAL</h2>
        {plan && (
          <button 
            onClick={() => setIsEditing(!isEditing)} 
            className="text-xs font-bold uppercase border-b-2 border-black hover:bg-black hover:text-white px-2 py-1 transition-all rounded-[3px]"
          >
            {isEditing ? 'Cerrar Editor' : 'Cambiar Dieta'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="clay-card p-8 space-y-4 animate-in">
          <label className="block text-xs font-bold uppercase opacity-60">Instrucciones del médico</label>
          <textarea 
            className="clay-input min-h-[200px]"
            placeholder="Pega aquí tu dieta: Ejemplo: Desayuno 8am: 2 huevos. Almuerzo 2pm: Pollo..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
          <button 
            onClick={handleParse}
            disabled={isLoading}
            className="clay-button w-full py-4 text-lg"
          >
            {isLoading ? 'ANALIZANDO PLASTILINA...' : 'GENERAR PLAN DE HOY'}
          </button>
        </div>
      ) : plan && (
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <p className="text-xl font-bold uppercase tracking-tighter">Cronograma Diario</p>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Organizado por ClayMinds</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{plan.schedule.filter(m => m.completed).length} / {plan.schedule.length}</p>
              <p className="text-[10px] font-bold uppercase opacity-60">Meta cumplida</p>
            </div>
          </div>
          
          <div className="grid gap-6">
            {plan.schedule.map((item, idx) => {
              const theme = THEMES[idx % THEMES.length];
              return (
                <div 
                  key={idx} 
                  // Merged duplicate style attributes into a single style object
                  style={{ 
                    animationDelay: `${idx * 100}ms`,
                    borderColor: item.completed ? '#000' : 'black',
                    backgroundColor: item.completed ? '#f0fdf4' : 'white',
                    borderLeftColor: item.completed ? '#10b981' : theme.main,
                  } as React.CSSProperties}
                  className={`clay-card p-6 flex items-start space-x-5 border-l-[12px] transition-all relative meal-card-stagger ${
                    showContent ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {/* Custom Bouncy Checkbox */}
                  <button 
                    onClick={() => toggleMealCompletion(idx)}
                    className={`flex-shrink-0 w-10 h-10 border-[3px] border-black rounded-[5px] flex items-center justify-center transition-all shadow-[3px_3px_0px_0px_#000] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000] ${
                      item.completed ? 'bg-emerald-500' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-white text-2xl transition-transform duration-300 ${item.completed ? 'scale-110 opacity-100' : 'scale-0 opacity-0'}`}>
                      ✓
                    </span>
                  </button>

                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="bg-black text-white px-2 py-0.5 text-[10px] font-bold rounded-[3px] uppercase">
                          {item.time}
                        </div>
                        <span className="text-[9px] font-bold uppercase opacity-40 tracking-widest">
                          {item.category || 'Comida'}
                        </span>
                      </div>
                    </div>
                    
                    <h4 className={`text-xl font-bold leading-none uppercase tracking-tighter completed-line transition-all duration-500 ${
                      item.completed ? 'is-active opacity-40' : ''
                    }`}>
                      {item.dish}
                    </h4>
                    
                    <p className={`text-sm mt-2 opacity-70 mb-4 font-medium transition-opacity ${item.completed ? 'opacity-30' : ''}`}>
                      {item.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {item.ingredients.map((ing, i) => (
                        <span 
                          key={i} 
                          style={{ 
                            backgroundColor: item.completed ? 'transparent' : `${theme.main}15` 
                          }}
                          className={`text-[10px] font-bold border-[2px] border-black px-3 py-1 rounded-[5px] transition-all ${
                            item.completed ? 'opacity-30 border-slate-300 bg-transparent line-through' : 'bg-white'
                          }`}
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Icon Overlay for specific categories */}
                  {item.category === 'breakfast' && !item.completed && <span className="absolute top-4 right-4 text-2xl opacity-10">☀️</span>}
                  {item.category === 'dinner' && !item.completed && <span className="absolute top-4 right-4 text-2xl opacity-10">🌙</span>}
                </div>
              );
            })}
          </div>
          
          {plan.recommendations && plan.recommendations.length > 0 && (
            <div className="clay-card p-8 bg-black text-white shadow-[6px_6px_0px_0px_#67a3ff] animate-in" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center space-x-3 mb-6 border-b border-white border-opacity-20 pb-4">
                <span className="text-2xl">📋</span>
                <h3 className="font-bold uppercase tracking-widest text-sm">Notas del Especialista</h3>
              </div>
              <ul className="grid md:grid-cols-2 gap-4 text-sm font-medium">
                {plan.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-3 text-blue-400 font-bold">•</span> 
                    <span className="opacity-90">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DietSection;
