import React, { useState } from 'react';
import { Client, DietMeal, WorkoutDay } from '../types';
import { format } from 'date-fns';
import { X, Download, Loader2, Dumbbell, Utensils, Info } from 'lucide-react';

interface PlanPDFProps {
  client: Client;
  type: 'diet' | 'workout' | 'full';
  dietData?: DietMeal[];
  workoutData?: WorkoutDay[];
  onClose: () => void;
}

const PlanPDF: React.FC<PlanPDFProps> = ({ client, type, dietData, workoutData, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    const element = document.getElementById('printable-plan-area');
    
    if (!element) {
        setIsDownloading(false);
        return;
    }

    const filenameMap = {
        'diet': `${client.name}_DietPlan`,
        'workout': `${client.name}_WorkoutPlan`,
        'full': `${client.name}_FullProgram`
    };

    const opt = {
      margin: [0.3, 0.3, 0.5, 0.3], // Top, Left, Bottom, Right
      filename: `${filenameMap[type]}_${format(new Date(), 'yyyyMMdd')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    if (window.html2pdf) {
        // @ts-ignore
        window.html2pdf().set(opt).from(element).save().then(() => {
            setIsDownloading(false);
        }).catch((err: any) => {
            console.error(err);
            setIsDownloading(false);
        });
    } else {
        alert("PDF generator not ready.");
        setIsDownloading(false);
    }
  };

  const PlanHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
      <div className="flex items-center gap-3 border-b-2 border-gray-900 pb-2 mb-6 mt-8 first:mt-0 break-before-auto">
          <div className="p-2 bg-gray-900 text-white rounded-lg">
              <Icon size={24} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{title}</h2>
      </div>
  );

  const renderDiet = (meals: DietMeal[]) => (
    <div className="space-y-6">
        {meals.map((meal, idx) => {
             // Calculate meal totals
             const totalCals = meal.items.reduce((acc, i) => acc + (parseInt(i.calories || '0') || 0), 0);
             const totalP = meal.items.reduce((acc, i) => acc + (parseInt(i.protein || '0') || 0), 0);
             const totalC = meal.items.reduce((acc, i) => acc + (parseInt(i.carbs || '0') || 0), 0);
             const totalF = meal.items.reduce((acc, i) => acc + (parseInt(i.fats || '0') || 0), 0);
             
             return (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm break-inside-avoid bg-white">
                    <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                        <div>
                             <h3 className="font-black text-gray-800 uppercase text-sm tracking-wide">{meal.name}</h3>
                             {totalCals > 0 && <span className="text-[10px] text-gray-500 font-medium">Total: {totalCals} kcal (P:{totalP} C:{totalC} F:{totalF})</span>}
                        </div>
                        <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100">{meal.time}</span>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-400 text-[10px] uppercase font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-2 w-1/3">Food</th>
                                <th className="px-2 py-2">Portion</th>
                                <th className="px-2 py-2 text-right">Cals</th>
                                <th className="px-2 py-2 text-right">P</th>
                                <th className="px-2 py-2 text-right">C</th>
                                <th className="px-5 py-2 text-right">F</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {meal.items.map((item, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                    <td className="px-5 py-2.5 font-semibold text-gray-700">{item.food}</td>
                                    <td className="px-2 py-2.5 text-gray-600 font-medium">{item.portion}</td>
                                    <td className="px-2 py-2.5 text-right text-gray-600">{item.calories || '-'}</td>
                                    <td className="px-2 py-2.5 text-right text-gray-400 text-xs">{item.protein || '-'}</td>
                                    <td className="px-2 py-2.5 text-right text-gray-400 text-xs">{item.carbs || '-'}</td>
                                    <td className="px-5 py-2.5 text-right text-gray-400 text-xs">{item.fats || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {meal.notes && (
                        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex gap-2">
                             <div className="mt-0.5 text-gray-400"><Info size={12}/></div>
                             <div className="flex-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Instructions</p>
                                <p className="text-xs text-gray-600 italic whitespace-pre-wrap">{meal.notes}</p>
                             </div>
                        </div>
                    )}
                </div>
             );
        })}
    </div>
  );

  const renderWorkout = (days: WorkoutDay[]) => (
    <div className="space-y-8">
        {days.map((day, idx) => (
            <div key={idx} className="break-inside-avoid">
                <div className="flex items-center gap-3 mb-4">
                     <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                     <h3 className="font-black text-xl text-gray-900">{day.name}</h3>
                </div>
                {day.notes && (
                    <div className="mb-4 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 flex gap-2">
                        <div className="mt-0.5 text-gray-400"><Info size={14}/></div>
                        <div className="flex-1">
                           <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Day Notes</p>
                           <p className="text-sm text-gray-700 italic whitespace-pre-wrap">{day.notes}</p>
                        </div>
                    </div>
                )}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3">Exercise</th>
                                <th className="px-2 py-3 w-16 text-center">Sets</th>
                                <th className="px-2 py-3 w-16 text-center">Reps</th>
                                <th className="px-2 py-3 w-20 text-center">Rest</th>
                                <th className="px-2 py-3 w-16 text-center">RPE</th>
                                <th className="px-4 py-3 w-1/4">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {day.exercises.map((ex, i) => (
                                <tr key={i} className="even:bg-gray-50/30">
                                    <td className="px-4 py-3 font-bold text-gray-800">{ex.name}</td>
                                    <td className="px-2 py-3 text-center font-bold text-blue-600">{ex.sets}</td>
                                    <td className="px-2 py-3 text-center font-bold text-gray-600">{ex.reps}</td>
                                    <td className="px-2 py-3 text-center text-xs text-gray-500">{ex.rest || '-'}</td>
                                    <td className="px-2 py-3 text-center text-xs text-gray-500">{ex.rpe || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs italic">{ex.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
           <div className="flex items-center gap-3">
               <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={20} className="text-gray-500"/></button>
               <h2 className="font-bold text-gray-800 hidden sm:block">
                   {type === 'diet' ? 'Diet Plan Preview' : type === 'workout' ? 'Workout Plan Preview' : 'Full Program Preview'}
               </h2>
           </div>
           <button onClick={handleDownload} disabled={isDownloading} className="text-white font-bold text-sm flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 disabled:scale-100">
                {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span>Download PDF</span>
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-8">
            <div id="printable-plan-area" className="bg-white shadow-xl mx-auto max-w-[800px] min-h-[1000px] p-8 sm:p-12 relative">
                {/* PDF Header */}
                <div className="flex justify-between items-start mb-10 pb-6 border-b-4 border-gray-900">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-1">FitwithRj</h1>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Personal Training System</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-bold text-gray-800">{client.name}</h2>
                        <div className="flex flex-col items-end mt-1">
                            <span className="text-xs font-bold text-white bg-black px-2 py-0.5 rounded uppercase">
                                {type === 'full' ? 'Comprehensive Program' : type === 'diet' ? 'Nutrition Plan' : 'Workout Routine'}
                            </span>
                            <span className="text-xs text-gray-400 mt-1 font-medium">Generated: {format(new Date(), 'MMM dd, yyyy')}</span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="mb-10 space-y-12">
                    {(type === 'diet' || type === 'full') && dietData && dietData.length > 0 && (
                        <div>
                            <PlanHeader title="Nutrition Plan" icon={Utensils} />
                            {renderDiet(dietData)}
                        </div>
                    )}

                    {(type === 'full') && dietData && dietData.length > 0 && workoutData && workoutData.length > 0 && (
                        <div className="html2pdf__page-break"></div>
                    )}

                    {(type === 'workout' || type === 'full') && workoutData && workoutData.length > 0 && (
                        <div>
                            <PlanHeader title="Workout Routine" icon={Dumbbell} />
                            {renderWorkout(workoutData)}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-16 pt-6 border-t border-gray-100 flex justify-between items-center text-gray-400 text-xs">
                     <p>FitwithRj • Personal Training</p>
                     <p className="font-bold italic">"Transformation starts here."</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlanPDF;