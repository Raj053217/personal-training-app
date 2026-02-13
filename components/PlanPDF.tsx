
import React, { useState } from 'react';
import { Client, DietMeal, WorkoutDay } from '../types';
import { format } from 'date-fns';
import { X, Download, Loader2, Dumbbell, Utensils, Info, Printer, ExternalLink } from 'lucide-react';

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
            alert("Error generating PDF. Please try again.");
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
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-800">{ex.name}</p>
                                        {(ex.equipmentNeeded || ex.difficulty) && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {ex.equipmentNeeded && <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 rounded border border-gray-200">{ex.equipmentNeeded}</span>}
                                                {ex.difficulty && <span className={`text-[9px] px-1.5 rounded border ${ex.difficulty === 'advanced' ? 'bg-red-50 text-red-600 border-red-100' : ex.difficulty === 'intermediate' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-green-50 text-green-600 border-green-100'} uppercase`}>{ex.difficulty.substring(0,3)}</span>}
                                            </div>
                                        )}
                                        {ex.videoUrl && (
                                            <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-500 hover:underline">
                                                <ExternalLink size={8} /> Video
                                            </a>
                                        )}
                                    </td>
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
    <>
    <div id="plan-modal-root" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div id="plan-container" className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] sm:h-auto overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-2xl">
          <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
            >
              <X size={24} />
          </button>
          <span className="font-semibold text-gray-700">Program Preview</span>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-blue-600 font-medium text-sm flex items-center gap-1 disabled:opacity-50"
          >
            {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            <span className="hidden sm:inline">{isDownloading ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div id="plan-content" className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-8">
            {/* Printable Area Wrapper */}
            <div id="printable-plan-area" className="bg-white shadow-xl mx-auto max-w-[800px] min-h-[1000px] p-8 sm:p-12 relative rounded-sm">
                
                {/* PDF Header */}
                <div className="flex justify-between items-start mb-10 pb-8 border-b-4 border-gray-900">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-1">FitwithRj</h1>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Personal Training Excellence</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-800 uppercase tracking-tight">{client.name}</h2>
                        <div className="flex flex-col items-end mt-2">
                            <span className="text-[10px] font-black text-white bg-black px-3 py-1 rounded uppercase tracking-widest">
                                {type === 'full' ? 'Complete Transformation Program' : type === 'diet' ? 'Optimized Nutrition Plan' : 'Dynamic Training Routine'}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Cycle Date: {format(new Date(), 'MMMM dd, yyyy')}</span>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="mb-12 space-y-16">
                    {(type === 'diet' || type === 'full') && dietData && dietData.length > 0 && (
                        <div>
                            <PlanHeader title="Nutritional Strategy" icon={Utensils} />
                            {renderDiet(dietData)}
                        </div>
                    )}

                    {(type === 'full') && dietData && dietData.length > 0 && workoutData && workoutData.length > 0 && (
                        <div className="html2pdf__page-break"></div>
                    )}

                    {(type === 'workout' || type === 'full') && workoutData && workoutData.length > 0 && (
                        <div>
                            <PlanHeader title="Training Protocol" icon={Dumbbell} />
                            {renderWorkout(workoutData)}
                        </div>
                    )}
                </div>

                {/* PDF Footer */}
                <div className="mt-20 pt-8 border-t border-gray-100 flex justify-between items-end text-gray-400">
                     <div className="text-[10px] font-bold uppercase tracking-widest">
                         <p>FitwithRj • Digital Coaching Platform</p>
                         <p className="mt-1">Powered by PT Manage Pro</p>
                     </div>
                     <p className="font-black italic text-gray-900 text-lg tracking-tighter">"Results are earned."</p>
                </div>
            </div>
        </div>

        {/* Mobile Action Button */}
        <div className="p-4 border-t border-gray-100 sm:hidden bg-white safe-bottom">
           <button 
             onClick={handleDownload}
             disabled={isDownloading}
             className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-70"
           >
             {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
             {isDownloading ? 'Generating...' : 'Download PDF'}
           </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default PlanPDF;
