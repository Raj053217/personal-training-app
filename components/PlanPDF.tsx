
import React, { useState } from 'react';
import { Client, DietMeal, WorkoutDay } from '../types';
import { format } from 'date-fns';
import { X, Download, Loader2, Dumbbell, Utensils, Info, Printer, ExternalLink, Instagram, Phone } from 'lucide-react';

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
      <div className="flex items-center gap-4 border-b-4 border-black pb-4 mb-8 mt-10 first:mt-0 break-before-auto">
          <div className="p-3 bg-black text-white rounded-xl shadow-lg">
              <Icon size={28} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-black text-black uppercase tracking-tighter">{title}</h2>
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
                <div key={idx} className="border-2 border-black rounded-2xl overflow-hidden shadow-sm break-inside-avoid bg-white mb-6 last:mb-0">
                    <div className="bg-black text-white px-6 py-4 flex justify-between items-center">
                        <div>
                             <h3 className="font-black uppercase text-lg tracking-wide">{meal.name}</h3>
                             {totalCals > 0 && <span className="text-[11px] text-gray-400 font-bold tracking-wider mt-1 block">Total: {totalCals} kcal • P:{totalP} C:{totalC} F:{totalF}</span>}
                        </div>
                        <span className="text-xs font-black bg-white text-black px-3 py-1.5 rounded-lg uppercase tracking-wider">{meal.time}</span>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black border-b-2 border-gray-100 tracking-wider">
                            <tr>
                                <th className="px-6 py-3 w-1/3">Food Item</th>
                                <th className="px-4 py-3">Portion</th>
                                <th className="px-4 py-3 text-right">Cals</th>
                                <th className="px-4 py-3 text-right">P (g)</th>
                                <th className="px-4 py-3 text-right">C (g)</th>
                                <th className="px-6 py-3 text-right">F (g)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {meal.items.map((item, i) => (
                                <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">{item.food}</td>
                                    <td className="px-4 py-4 text-gray-600 font-medium">{item.portion}</td>
                                    <td className="px-4 py-4 text-right font-bold text-gray-900">{item.calories || '-'}</td>
                                    <td className="px-4 py-4 text-right text-gray-500 font-medium">{item.protein || '-'}</td>
                                    <td className="px-4 py-4 text-right text-gray-500 font-medium">{item.carbs || '-'}</td>
                                    <td className="px-6 py-4 text-right text-gray-500 font-medium">{item.fats || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {meal.notes && (
                        <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-100 flex gap-3">
                             <div className="mt-1 text-black"><Info size={16}/></div>
                             <div className="flex-1">
                                <p className="text-[10px] font-black text-black uppercase mb-1 tracking-wider">Chef's Notes</p>
                                <p className="text-sm text-gray-600 font-medium leading-relaxed">{meal.notes}</p>
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
            <div key={idx} className="break-inside-avoid mb-8 last:mb-0">
                <div className="flex items-center gap-4 mb-5 bg-black text-white p-4 rounded-2xl shadow-md">
                     <div className="h-8 w-1.5 bg-white rounded-full"></div>
                     <h3 className="font-black text-2xl uppercase tracking-tight">{day.name}</h3>
                </div>
                {day.notes && (
                    <div className="mb-5 px-6 py-4 bg-gray-50 rounded-2xl border-l-4 border-black flex gap-3 shadow-sm">
                        <div className="mt-0.5 text-black"><Info size={18}/></div>
                        <div className="flex-1">
                           <p className="text-[10px] font-black text-black uppercase mb-1 tracking-wider">Coach's Focus</p>
                           <p className="text-sm text-gray-700 font-medium leading-relaxed">{day.notes}</p>
                        </div>
                    </div>
                )}
                <div className="border-2 border-black rounded-2xl overflow-hidden shadow-sm bg-white">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-black border-b-2 border-gray-100 tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Exercise</th>
                                <th className="px-4 py-3 w-20 text-center">Sets</th>
                                <th className="px-4 py-3 w-20 text-center">Reps</th>
                                <th className="px-4 py-3 w-24 text-center">Rest</th>
                                <th className="px-4 py-3 w-20 text-center">RPE</th>
                                <th className="px-6 py-3 w-1/3">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {day.exercises.map((ex, i) => (
                                <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-black text-gray-900 text-base">{ex.name}</p>
                                        {(ex.equipmentNeeded || ex.difficulty) && (
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                {ex.equipmentNeeded && <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wide">{ex.equipmentNeeded}</span>}
                                                {ex.difficulty && <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${ex.difficulty === 'advanced' ? 'bg-red-50 text-red-600' : ex.difficulty === 'intermediate' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>{ex.difficulty}</span>}
                                            </div>
                                        )}
                                        {ex.videoUrl && (
                                            <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-blue-600 uppercase tracking-wide hover:underline">
                                                <ExternalLink size={10} /> Watch Demo
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-center font-black text-xl text-black">{ex.sets}</td>
                                    <td className="px-4 py-4 text-center font-bold text-gray-700">{ex.reps}</td>
                                    <td className="px-4 py-4 text-center text-xs font-bold text-gray-500">{ex.rest || '-'}</td>
                                    <td className="px-4 py-4 text-center text-xs font-bold text-gray-500">{ex.rpe || '-'}</td>
                                    <td className="px-6 py-4 text-gray-500 text-xs font-medium leading-relaxed">{ex.notes}</td>
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
                <div className="flex justify-between items-start mb-12 pb-8 border-b-4 border-black">
                    <div>
                        <h1 className="text-5xl sm:text-6xl font-black text-black uppercase tracking-tighter mb-2">FitWithRj</h1>
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-8 bg-black"></div>
                            <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Premium Coaching</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-900 uppercase tracking-tight mb-2">{client.name}</h2>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black text-white bg-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                                {type === 'full' ? 'Transformation Program' : type === 'diet' ? 'Nutrition Protocol' : 'Training Program'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Generated: {format(new Date(), 'MMM dd, yyyy')}</span>
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
                <div className="mt-20 pt-8 border-t-2 border-black flex justify-between items-end">
                     <div className="flex flex-col gap-2">
                         <div className="flex items-center gap-2 text-black">
                             <Instagram size={20} strokeWidth={2.5} />
                             <span className="font-black text-sm tracking-wide">fitwithrj</span>
                         </div>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Powered by FitWithRj</p>
                     </div>
                     <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 text-black">
                             <span className="font-black text-sm tracking-wide">8561098035</span>
                             <Phone size={20} strokeWidth={2.5} className="text-green-600" />
                         </div>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Created by Coach Raj</p>
                     </div>
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
