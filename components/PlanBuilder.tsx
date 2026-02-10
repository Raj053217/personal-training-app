
import React, { useState } from 'react';
import { DietMeal, WorkoutDay, DietItem, WorkoutExercise, FoodItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, X, Utensils, Activity, FileText, Dumbbell, Signal, Video, Search, Book } from 'lucide-react';

interface PlanBuilderProps {
  type: 'diet' | 'workout';
  data: DietMeal[] | WorkoutDay[];
  onChange: (data: any[]) => void;
  foodLibrary?: FoodItem[]; // New Prop
}

const PlanBuilder: React.FC<PlanBuilderProps> = ({ type, data = [], onChange, foodLibrary = [] }) => {
  
  // State for Food Library Picker
  const [showFoodPicker, setShowFoodPicker] = useState<{ mealId: string } | null>(null);
  const [foodSearch, setFoodSearch] = useState('');

  // --- Diet Helpers ---
  const addMeal = () => onChange([...data, { id: uuidv4(), name: 'New Meal', items: [] }]);
  
  const updateMeal = (id: string, field: keyof DietMeal, val: string) => {
    onChange((data as DietMeal[]).map(m => m.id === id ? { ...m, [field]: val } : m));
  };
  
  const removeMeal = (id: string) => onChange((data as DietMeal[]).filter(m => m.id !== id));
  
  const addDietItem = (mealId: string) => {
      onChange((data as DietMeal[]).map(m => m.id === mealId ? { ...m, items: [...m.items, { id: uuidv4(), food: '', portion: '', calories: '', protein: '', carbs: '', fats: '' }] } : m));
  };

  const addDietItemFromLibrary = (mealId: string, food: FoodItem) => {
      onChange((data as DietMeal[]).map(m => m.id === mealId ? { 
          ...m, 
          items: [...m.items, { 
              id: uuidv4(), 
              food: food.name, 
              portion: food.servingSize, 
              calories: food.calories, 
              protein: food.protein, 
              carbs: food.carbs, 
              fats: food.fats 
          }] 
      } : m));
      setShowFoodPicker(null);
  };
  
  const updateDietItem = (mealId: string, itemId: string, field: keyof DietItem, val: string) => {
      onChange((data as DietMeal[]).map(m => m.id === mealId ? { 
          ...m, items: m.items.map(i => i.id === itemId ? { ...i, [field]: val } : i) 
      } : m));
  };
  
  const removeDietItem = (mealId: string, itemId: string) => {
      onChange((data as DietMeal[]).map(m => m.id === mealId ? { ...m, items: m.items.filter(i => i.id !== itemId) } : m));
  };

  // --- Workout Helpers ---
  const addWorkoutDay = () => onChange([...data, { id: uuidv4(), name: 'New Workout Day', exercises: [] }]);
  
  const updateWorkoutDay = (id: string, field: keyof WorkoutDay, val: string) => {
    onChange((data as WorkoutDay[]).map(d => d.id === id ? { ...d, [field]: val } : d));
  };
  
  const removeWorkoutDay = (id: string) => onChange((data as WorkoutDay[]).filter(d => d.id !== id));

  const addExercise = (dayId: string) => {
      onChange((data as WorkoutDay[]).map(d => d.id === dayId ? { ...d, exercises: [...d.exercises, { id: uuidv4(), name: '', sets: '3', reps: '10', rest: '', rpe: '', notes: '', equipmentNeeded: '', difficulty: 'intermediate', videoUrl: '' }] } : d));
  };
  
  const updateExercise = (dayId: string, exId: string, field: keyof WorkoutExercise, val: string) => {
      onChange((data as WorkoutDay[]).map(d => d.id === dayId ? { 
          ...d, exercises: d.exercises.map(e => e.id === exId ? { ...e, [field]: val } : e)
      } : d));
  };
  
  const removeExercise = (dayId: string, exId: string) => {
      onChange((data as WorkoutDay[]).map(d => d.id === dayId ? { ...d, exercises: d.exercises.filter(e => e.id !== exId) } : d));
  };

  if (type === 'diet') {
      const dietData = (data || []) as DietMeal[];
      return (
        <div className="space-y-4 animate-fadeIn">
            {dietData.map((meal) => {
                const totalCals = meal.items.reduce((acc, i) => acc + (parseInt(i.calories || '0') || 0), 0);
                const totalP = meal.items.reduce((acc, i) => acc + (parseInt(i.protein || '0') || 0), 0);
                const totalC = meal.items.reduce((acc, i) => acc + (parseInt(i.carbs || '0') || 0), 0);
                const totalF = meal.items.reduce((acc, i) => acc + (parseInt(i.fats || '0') || 0), 0);

                return (
                    <div key={meal.id} className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 relative group">
                        <div className="flex justify-between items-center mb-1">
                            <input type="text" value={meal.name || ''} onChange={(e) => updateMeal(meal.id, 'name', e.target.value)} className="font-bold text-lg bg-transparent outline-none text-black dark:text-white placeholder-gray-400" placeholder="Meal Name" />
                            <div className="flex items-center gap-2">
                                <input type="text" value={meal.time || ''} onChange={(e) => updateMeal(meal.id, 'time', e.target.value)} className="text-xs font-medium bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md outline-none w-20 text-center" placeholder="Time" />
                                <button onClick={() => removeMeal(meal.id)} className="bg-red-50 text-red-500 p-1.5 rounded-full"><Trash2 size={12}/></button>
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mb-3 flex gap-3 uppercase tracking-wider">
                            <span>{totalCals} Kcal</span>
                            <span className="text-blue-500">P: {totalP}g</span>
                            <span className="text-orange-500">C: {totalC}g</span>
                            <span className="text-yellow-500">F: {totalF}g</span>
                        </div>
                        <div className="space-y-3">
                            {meal.items.map((item) => (
                                <div key={item.id} className="bg-gray-50 dark:bg-black/20 p-3 rounded-xl">
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" value={item.food || ''} onChange={(e) => updateDietItem(meal.id, item.id, 'food', e.target.value)} className="flex-1 bg-white dark:bg-white/5 rounded-lg px-2 py-1.5 text-sm outline-none font-medium" placeholder="Food Item" />
                                        <input type="text" value={item.portion || ''} onChange={(e) => updateDietItem(meal.id, item.id, 'portion', e.target.value)} className="w-20 bg-white dark:bg-white/5 rounded-lg px-2 py-1.5 text-sm outline-none text-center" placeholder="Qty" />
                                        <button onClick={() => removeDietItem(meal.id, item.id)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <input type="number" value={item.calories || ''} onChange={(e) => updateDietItem(meal.id, item.id, 'calories', e.target.value)} className="bg-transparent text-xs outline-none border-b border-gray-200 dark:border-gray-700 pb-1 text-center" placeholder="Cals" />
                                        <input type="number" value={item.protein || ''} onChange={(e) => updateDietItem(meal.id, item.id, 'protein', e.target.value)} className="bg-transparent text-xs outline-none border-b border-blue-200 dark:border-blue-900 pb-1 text-center text-blue-500" placeholder="Prot" />
                                        <input type="number" value={item.carbs || ''} onChange={(e) => updateDietItem(meal.id, item.id, 'carbs', e.target.value)} className="bg-transparent text-xs outline-none border-b border-orange-200 dark:border-orange-900 pb-1 text-center text-orange-500" placeholder="Carb" />
                                        <input type="number" value={item.fats || ''} onChange={(e) => updateDietItem(meal.id, item.id, 'fats', e.target.value)} className="bg-transparent text-xs outline-none border-b border-yellow-200 dark:border-yellow-900 pb-1 text-center text-yellow-500" placeholder="Fat" />
                                    </div>
                                </div>
                            ))}
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => addDietItem(meal.id)} className="text-xs font-bold text-blue-500 flex items-center gap-1"><Plus size={14}/> Custom Item</button>
                                <button onClick={() => setShowFoodPicker({ mealId: meal.id })} className="text-xs font-bold text-purple-500 flex items-center gap-1"><Book size={14}/> Add from Library</button>
                            </div>
                            
                            {/* Detailed Notes Field */}
                            <div className="mt-3 relative">
                                <FileText size={12} className="absolute top-3 left-3 text-gray-400"/>
                                <textarea 
                                  value={meal.notes || ''} 
                                  onChange={(e) => updateMeal(meal.id, 'notes', e.target.value)} 
                                  className="w-full bg-gray-50 dark:bg-black/20 rounded-xl py-2.5 pl-8 pr-3 text-xs text-gray-600 dark:text-gray-300 outline-none resize-none h-14" 
                                  placeholder="Preparation instructions, recipes, or notes..." 
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
            <button onClick={addMeal} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition"><Utensils size={18}/> Add Meal</button>

            {/* Library Picker Modal */}
            {showFoodPicker && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[40px] w-full max-w-sm shadow-2xl animate-slideUp max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">Select Food</h3>
                            <button onClick={() => { setShowFoodPicker(null); setFoodSearch(''); }} className="p-1 text-gray-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input type="text" value={foodSearch} onChange={e => setFoodSearch(e.target.value)} placeholder="Search library..." className="w-full bg-gray-100 dark:bg-white/5 pl-10 pr-4 py-3 rounded-2xl outline-none" autoFocus />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                             {foodLibrary.filter(f => f.name.toLowerCase().includes(foodSearch.toLowerCase())).map(food => (
                                 <button key={food.id} onClick={() => addDietItemFromLibrary(showFoodPicker.mealId, food)} className="w-full text-left p-3 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 transition">
                                     <p className="font-bold text-sm text-black dark:text-white">{food.name}</p>
                                     <p className="text-[10px] text-gray-500 font-medium">
                                        {food.calories} kcal • P:{food.protein} C:{food.carbs} F:{food.fats} • {food.servingSize}
                                     </p>
                                 </button>
                             ))}
                             {foodLibrary.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Library is empty. Add foods in the Library tab.</p>}
                        </div>
                    </div>
                </div>
            )}

        </div>
      );
  } else {
      const workoutData = (data || []) as WorkoutDay[];
      return (
        <div className="space-y-4 animate-fadeIn">
            {workoutData.map((day) => (
                <div key={day.id} className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 relative group">
                    <div className="flex justify-between items-center mb-3">
                        <input type="text" value={day.name || ''} onChange={(e) => updateWorkoutDay(day.id, 'name', e.target.value)} className="font-bold text-lg bg-transparent outline-none text-black dark:text-white placeholder-gray-400" placeholder="Day Name (e.g. Push Day)" />
                        <button onClick={() => removeWorkoutDay(day.id)} className="bg-red-50 text-red-500 p-1.5 rounded-full"><Trash2 size={12}/></button>
                    </div>
                    <div className="space-y-4">
                        {/* Detailed Notes Field */}
                        <div className="relative">
                            <FileText size={12} className="absolute top-3 left-3 text-gray-400"/>
                            <textarea 
                              value={day.notes || ''} 
                              onChange={(e) => updateWorkoutDay(day.id, 'notes', e.target.value)} 
                              className="w-full bg-gray-50 dark:bg-black/20 rounded-xl py-2.5 pl-8 pr-3 text-xs text-gray-600 dark:text-gray-300 outline-none resize-none h-14 mb-2" 
                              placeholder="Day instructions (e.g. Warm-up 5 mins, Focus on form...)" 
                            />
                        </div>

                        {day.exercises.map((ex) => (
                            <div key={ex.id} className="bg-gray-50 dark:bg-black/20 p-3 rounded-xl">
                                    <div className="flex justify-between items-start mb-2">
                                        <input type="text" value={ex.name || ''} onChange={(e) => updateExercise(day.id, ex.id, 'name', e.target.value)} className="flex-1 bg-transparent text-sm font-bold outline-none border-b border-transparent focus:border-gray-300" placeholder="Exercise Name" />
                                        <button onClick={() => removeExercise(day.id, ex.id)} className="text-gray-400 hover:text-red-500 ml-2"><X size={14}/></button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mb-2">
                                        <div className="bg-white dark:bg-white/5 rounded-lg p-1.5">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold text-center">Sets</p>
                                            <input type="text" value={ex.sets || ''} onChange={(e) => updateExercise(day.id, ex.id, 'sets', e.target.value)} className="w-full bg-transparent text-center text-xs font-bold outline-none" placeholder="3" />
                                        </div>
                                        <div className="bg-white dark:bg-white/5 rounded-lg p-1.5">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold text-center">Reps</p>
                                            <input type="text" value={ex.reps || ''} onChange={(e) => updateExercise(day.id, ex.id, 'reps', e.target.value)} className="w-full bg-transparent text-center text-xs font-bold outline-none" placeholder="12" />
                                        </div>
                                        <div className="bg-white dark:bg-white/5 rounded-lg p-1.5">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold text-center">Rest</p>
                                            <input type="text" value={ex.rest || ''} onChange={(e) => updateExercise(day.id, ex.id, 'rest', e.target.value)} className="w-full bg-transparent text-center text-xs font-bold outline-none" placeholder="60s" />
                                        </div>
                                        <div className="bg-white dark:bg-white/5 rounded-lg p-1.5">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold text-center">RPE</p>
                                            <input type="text" value={ex.rpe || ''} onChange={(e) => updateExercise(day.id, ex.id, 'rpe', e.target.value)} className="w-full bg-transparent text-center text-xs font-bold outline-none" placeholder="8" />
                                        </div>
                                    </div>

                                    {/* Advanced Fields: Equipment, Difficulty, Video */}
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                         <div className="relative bg-white dark:bg-white/5 rounded-lg p-1.5 flex items-center">
                                            <Dumbbell size={10} className="absolute left-2 text-gray-400"/>
                                            <input type="text" value={ex.equipmentNeeded || ''} onChange={(e) => updateExercise(day.id, ex.id, 'equipmentNeeded', e.target.value)} className="w-full bg-transparent pl-4 text-[10px] outline-none" placeholder="Equipment" />
                                         </div>
                                         <div className="relative bg-white dark:bg-white/5 rounded-lg p-1.5 flex items-center">
                                            <Signal size={10} className="absolute left-2 text-gray-400"/>
                                            <select value={ex.difficulty || 'intermediate'} onChange={(e) => updateExercise(day.id, ex.id, 'difficulty', e.target.value)} className="w-full bg-transparent pl-4 text-[10px] outline-none appearance-none">
                                                <option value="beginner">Beginner</option>
                                                <option value="intermediate">Intermediate</option>
                                                <option value="advanced">Advanced</option>
                                            </select>
                                         </div>
                                         <div className="relative bg-white dark:bg-white/5 rounded-lg p-1.5 flex items-center">
                                            <Video size={10} className="absolute left-2 text-gray-400"/>
                                            <input type="text" value={ex.videoUrl || ''} onChange={(e) => updateExercise(day.id, ex.id, 'videoUrl', e.target.value)} className="w-full bg-transparent pl-4 text-[10px] outline-none" placeholder="Video URL" />
                                         </div>
                                    </div>

                                    <input type="text" value={ex.notes || ''} onChange={(e) => updateExercise(day.id, ex.id, 'notes', e.target.value)} className="w-full bg-transparent text-xs text-gray-500 outline-none italic" placeholder="Notes (e.g. slow tempo, dropset...)" />
                            </div>
                        ))}
                        <button onClick={() => addExercise(day.id)} className="text-xs font-bold text-blue-500 flex items-center gap-1 mt-2"><Plus size={14}/> Add Exercise</button>
                    </div>
                </div>
            ))}
            <button onClick={addWorkoutDay} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition"><Activity size={18}/> Add Workout Day</button>
        </div>
      );
  }
};

export default PlanBuilder;
