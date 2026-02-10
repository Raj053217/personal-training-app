
import React, { useState, useEffect } from 'react';
import { Client, PlanTemplate, DietMeal, WorkoutDay, FoodItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, Trash2, FileText, Download, ChevronRight, Save, ArrowLeft, Copy, Printer, Eye, X, Utensils, Book } from 'lucide-react';
import PlanBuilder from './PlanBuilder';
import PlanPDF from './PlanPDF';
import { saveTemplates, loadTemplates, saveFoodLibrary, loadFoodLibrary } from '../services/storage';

interface PlanManagerProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
  viewingClient?: Client; // Client Mode prop
}

const PlanManager: React.FC<PlanManagerProps> = ({ clients, onUpdateClient, viewingClient }) => {
  // If viewingClient is present, default to 'clients' tab (which we will repurpose as 'My Plan')
  const [activeTab, setActiveTab] = useState<'templates' | 'clients' | 'library'>(viewingClient ? 'clients' : 'templates');
  const [templateType, setTemplateType] = useState<'diet' | 'workout'>('diet');
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [foodLibrary, setFoodLibrary] = useState<FoodItem[]>([]);
  
  // Editor State
  const [editingTemplate, setEditingTemplate] = useState<PlanTemplate | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editorData, setEditorData] = useState<DietMeal[] | WorkoutDay[]>([]);
  const [templateName, setTemplateName] = useState('');

  // Food Library Inputs
  const [newFood, setNewFood] = useState<FoodItem>({ id: '', name: '', servingSize: '', calories: '', protein: '', carbs: '', fats: '' });
  const [showAddFood, setShowAddFood] = useState(false);

  // Save as Template Modal
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // PDF State
  const [showPdf, setShowPdf] = useState<{ type: 'diet'|'workout'|'full', clientName: string, data?: any, client?: Client } | null>(null);
  const [pdfNameInput, setPdfNameInput] = useState('');

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTemplates(loadTemplates());
    setFoodLibrary(loadFoodLibrary());
  }, []);

  // --- Food Library Logic ---
  const handleAddFood = () => {
    if (!newFood.name || !newFood.calories) return alert("Name and Calories are required");
    const item: FoodItem = { ...newFood, id: uuidv4() };
    const updated = [...foodLibrary, item];
    setFoodLibrary(updated);
    saveFoodLibrary(updated);
    setNewFood({ id: '', name: '', servingSize: '', calories: '', protein: '', carbs: '', fats: '' });
    setShowAddFood(false);
  };

  const handleDeleteFood = (id: string) => {
    const updated = foodLibrary.filter(f => f.id !== id);
    setFoodLibrary(updated);
    saveFoodLibrary(updated);
  };

  // --- Template Logic ---

  const handleSaveTemplate = () => {
      if(!templateName) return alert("Enter template name");
      
      const newTemplate: PlanTemplate = {
          id: editingTemplate ? editingTemplate.id : uuidv4(),
          name: templateName,
          type: templateType,
          data: editorData as any,
          createdAt: new Date().toISOString()
      };

      let updated;
      if (editingTemplate) {
          // Update existing template by matching ID
          updated = templates.map(t => t.id === editingTemplate.id ? newTemplate : t);
      } else {
          // Add new template
          updated = [...templates, newTemplate];
      }
      
      setTemplates(updated);
      saveTemplates(updated);
      setEditingTemplate(null);
      setEditorData([]);
      setTemplateName('');
      alert("Template saved successfully!");
  };

  const saveCurrentPlanAsTemplate = () => {
      if (!newTemplateName) return alert("Please enter a template name");
      if (editorData.length === 0) return alert("Plan is empty");

      // Deep copy to ensure fresh IDs if loaded later
      const dataCopy = JSON.parse(JSON.stringify(editorData));

      const newTemplate: PlanTemplate = {
          id: uuidv4(),
          name: newTemplateName,
          type: templateType,
          data: dataCopy,
          createdAt: new Date().toISOString()
      };

      const updated = [...templates, newTemplate];
      setTemplates(updated);
      saveTemplates(updated);
      setShowSaveAsTemplate(false);
      setNewTemplateName('');
      alert("Plan saved as Sample Template!");
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(!window.confirm("Delete template?")) return;
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      saveTemplates(updated);
  };

  const startEditTemplate = (t: PlanTemplate) => {
      setEditingTemplate(t);
      setTemplateType(t.type);
      setTemplateName(t.name);
      setEditorData(t.data);
  };

  const startCreateTemplate = () => {
      setEditingTemplate(null);
      setTemplateName('');
      setEditorData([]);
      // templateType is already set by the tab
  };

  const handleSaveClientPlan = () => {
      if(!editingClient) return;
      const updatedClient = {
          ...editingClient,
          [templateType === 'diet' ? 'dietPlan' : 'workoutRoutine']: editorData
      };
      onUpdateClient(updatedClient);
      setEditingClient(null); 
      alert("Client plan updated!");
  };

  const startEditClient = (c: Client) => {
      if (viewingClient) {
          // In Client View, clicking usually does nothing or opens a read-only view. 
          // But we will use the PDF preview for the read-only view.
          const hasDiet = Array.isArray(c.dietPlan) && c.dietPlan.length > 0;
          const hasWorkout = Array.isArray(c.workoutRoutine) && c.workoutRoutine.length > 0;
          if (hasDiet || hasWorkout) {
               setShowPdf({ 
                    type: (hasDiet && hasWorkout) ? 'full' : (hasDiet ? 'diet' : 'workout'), 
                    clientName: c.name, 
                    data: undefined, 
                    client: c
               });
          }
          return;
      }

      setEditingClient(c);
      // Load existing data or empty
      const existing = templateType === 'diet' ? c.dietPlan : c.workoutRoutine;
      setEditorData(Array.isArray(existing) ? existing : []);
  };

  const importTemplateToClient = (t: PlanTemplate) => {
      if (!window.confirm("Import template? This will overwrite current entries.")) return;
      // Deep copy with new IDs
      if(t.type === 'diet') {
          const fresh = (t.data as DietMeal[]).map(m => ({ ...m, id: uuidv4(), items: m.items.map(i => ({...i, id: uuidv4()})) }));
          setEditorData(fresh);
      } else {
          const fresh = (t.data as WorkoutDay[]).map(d => ({ ...d, id: uuidv4(), exercises: d.exercises.map(e => ({...e, id: uuidv4()})) }));
          setEditorData(fresh);
      }
  };

  const handlePreviewPdf = () => {
      setShowPdf({
          type: templateType,
          clientName: editingClient ? editingClient.name : (templateName || "Template Preview"),
          data: editorData,
          client: editingClient || { name: pdfNameInput || "Client Name" } as Client
      });
  };

  // --- Render ---

  // 1. Editor View (Full-screen Overlay)
  if (editingTemplate || editingClient) {
      return (
          <div className="fixed inset-0 z-[60] bg-[#F2F2F7] dark:bg-black overflow-y-auto pb-32 animate-slideUp">
              {/* Header */}
              <div className="sticky top-0 z-30 bg-[#F2F2F7]/95 dark:bg-black/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 h-16 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <button onClick={() => { setEditingTemplate(null); setEditingClient(null); }} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full transition active:scale-90"><X size={20}/></button>
                      <div className="min-w-0">
                          <h2 className="text-lg font-black text-black dark:text-white leading-none truncate max-w-[150px] sm:max-w-none">
                              {editingClient ? editingClient.name : (editingTemplate ? 'Edit Template' : 'New Template')}
                          </h2>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{templateType} Plan</p>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                      <button onClick={handlePreviewPdf} className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl hover:bg-blue-100 transition active:scale-90 shadow-sm border border-blue-100 dark:border-blue-900/30">
                          <Printer size={18} />
                      </button>
                      <button onClick={editingClient ? handleSaveClientPlan : handleSaveTemplate} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition">
                          Save
                      </button>
                  </div>
              </div>

              <div className="max-w-2xl mx-auto p-4 space-y-6 pt-6">
                  {/* Template Name Input (Only if editing template) */}
                  {!editingClient && (
                      <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Template Title</label>
                          <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. 12-Week Fat Loss Phase 1" className="w-full bg-transparent text-xl font-bold outline-none text-black dark:text-white" />
                      </div>
                  )}

                  {/* Type Switcher (Only if editing Client) */}
                  {editingClient && (
                      <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-2xl">
                          <button onClick={() => { setTemplateType('diet'); setEditorData(Array.isArray(editingClient.dietPlan) ? editingClient.dietPlan : []); }} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${templateType === 'diet' ? 'bg-white dark:bg-[#2C2C2E] shadow text-black dark:text-white' : 'text-gray-500'}`}>Nutrition</button>
                          <button onClick={() => { setTemplateType('workout'); setEditorData(Array.isArray(editingClient.workoutRoutine) ? editingClient.workoutRoutine : []); }} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${templateType === 'workout' ? 'bg-white dark:bg-[#2C2C2E] shadow text-black dark:text-white' : 'text-gray-500'}`}>Training</button>
                      </div>
                  )}

                  {/* Import Strip */}
                  {editingClient && templates.filter(t => t.type === templateType).length > 0 && (
                      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap pb-2 no-scrollbar">
                          <span className="text-[10px] font-black text-gray-400 uppercase shrink-0">Templates:</span>
                          {templates.filter(t => t.type === templateType).map(t => (
                              <button key={t.id} onClick={() => importTemplateToClient(t)} className="inline-flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] text-blue-600 dark:text-blue-400 text-xs font-bold px-4 py-2 rounded-full shadow-sm border border-gray-100 dark:border-white/5 active:scale-95 transition">
                                  <Copy size={12}/> {t.name}
                              </button>
                          ))}
                      </div>
                  )}

                  {/* Builder */}
                  <PlanBuilder type={templateType} data={editorData} onChange={setEditorData} foodLibrary={foodLibrary} />

                  {/* Footer Action: Save as Template */}
                  {editingClient && editorData.length > 0 && (
                      <button onClick={() => setShowSaveAsTemplate(true)} className="w-full py-4 border-2 border-dashed border-blue-200 dark:border-blue-900/30 rounded-3xl text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition">
                          <Save size={18}/> Save these settings as a new template
                      </button>
                  )}
              </div>

              {/* Save As Template Modal */}
              {showSaveAsTemplate && (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[40px] w-full max-w-sm shadow-2xl animate-slideUp">
                          <h3 className="text-2xl font-black text-black dark:text-white mb-2 uppercase tracking-tight">Save as Sample</h3>
                          <p className="text-sm text-gray-500 mb-6">Create a template from this current plan to reuse it with other clients later.</p>
                          <input type="text" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="Template Name" className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold mb-6 text-black dark:text-white" autoFocus />
                          
                          <div className="flex gap-3">
                              <button onClick={() => setShowSaveAsTemplate(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-bold text-gray-500">Cancel</button>
                              <button onClick={saveCurrentPlanAsTemplate} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20">Save Template</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // 2. Main List View
  return (
    <div className="animate-fadeIn min-h-screen">
      <div className="pt-2 px-1 mb-4 flex justify-between items-end">
         <h1 className="text-[34px] font-black text-black dark:text-white leading-tight tracking-tight">{viewingClient ? 'My Plan' : 'Plans'}</h1>
         {!viewingClient && (
            <button onClick={() => activeTab === 'library' ? setShowAddFood(true) : startCreateTemplate()} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg active:scale-90 transition mb-1">
                <Plus size={24} />
            </button>
         )}
      </div>

      {/* Main Tabs (Hidden in Client Mode) */}
      {!viewingClient && (
          <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-6">
              <button onClick={() => setActiveTab('templates')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-white dark:bg-[#2C2C2E] shadow text-black dark:text-white' : 'text-gray-500'}`}>Samples</button>
              <button onClick={() => setActiveTab('clients')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'clients' ? 'bg-white dark:bg-[#2C2C2E] shadow text-black dark:text-white' : 'text-gray-500'}`}>My Clients</button>
              <button onClick={() => setActiveTab('library')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-white dark:bg-[#2C2C2E] shadow text-black dark:text-white' : 'text-gray-500'}`}>Food Lib</button>
          </div>
      )}

      {/* --- FOOD LIBRARY TAB --- */}
      {activeTab === 'library' && (
         <div className="space-y-4">
            <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search foods..." className="w-full bg-white dark:bg-[#1C1C1E] pl-12 pr-4 py-4 rounded-3xl outline-none shadow-sm border border-gray-100 dark:border-white/5" />
            </div>

            <div className="grid gap-3">
               {foodLibrary.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(food => (
                  <div key={food.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 flex justify-between items-center group">
                     <div>
                        <div className="flex items-center gap-2">
                           <h3 className="font-bold text-black dark:text-white">{food.name}</h3>
                           <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-gray-500">{food.servingSize}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider flex gap-3">
                             <span>{food.calories} kcal</span>
                             <span className="text-blue-500">P:{food.protein}</span>
                             <span className="text-orange-500">C:{food.carbs}</span>
                             <span className="text-yellow-500">F:{food.fats}</span>
                        </div>
                     </div>
                     <button onClick={() => handleDeleteFood(food.id)} className="p-2 bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-red-600 rounded-full transition"><Trash2 size={16}/></button>
                  </div>
               ))}
               {foodLibrary.length === 0 && <div className="text-center py-10 text-gray-400 italic">No foods in library. Tap + to add.</div>}
            </div>

            {/* Add Food Modal */}
            {showAddFood && (
               <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                   <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[40px] w-full max-w-sm shadow-2xl animate-slideUp">
                       <h3 className="text-2xl font-black text-black dark:text-white mb-4 uppercase tracking-tight">Add Food</h3>
                       <div className="space-y-3">
                           <input type="text" placeholder="Food Name (e.g. Chicken Breast)" value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} className="w-full bg-gray-100 dark:bg-white/5 p-3 rounded-2xl outline-none" />
                           <div className="grid grid-cols-2 gap-3">
                               <input type="text" placeholder="Serving (e.g. 100g)" value={newFood.servingSize} onChange={e => setNewFood({...newFood, servingSize: e.target.value})} className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl outline-none" />
                               <input type="number" placeholder="Calories" value={newFood.calories} onChange={e => setNewFood({...newFood, calories: e.target.value})} className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl outline-none" />
                           </div>
                           <div className="grid grid-cols-3 gap-3">
                               <input type="number" placeholder="Prot (g)" value={newFood.protein} onChange={e => setNewFood({...newFood, protein: e.target.value})} className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl outline-none text-blue-500 placeholder-blue-300" />
                               <input type="number" placeholder="Carb (g)" value={newFood.carbs} onChange={e => setNewFood({...newFood, carbs: e.target.value})} className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl outline-none text-orange-500 placeholder-orange-300" />
                               <input type="number" placeholder="Fat (g)" value={newFood.fats} onChange={e => setNewFood({...newFood, fats: e.target.value})} className="bg-gray-100 dark:bg-white/5 p-3 rounded-2xl outline-none text-yellow-500 placeholder-yellow-300" />
                           </div>
                       </div>
                       <div className="flex gap-3 mt-6">
                           <button onClick={() => setShowAddFood(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl font-bold text-gray-500">Cancel</button>
                           <button onClick={handleAddFood} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20">Add Food</button>
                       </div>
                   </div>
               </div>
            )}
         </div>
      )}

      {activeTab === 'templates' && (
          <div className="space-y-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                   <button onClick={() => setTemplateType('diet')} className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${templateType === 'diet' ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>Nutrition</button>
                   <button onClick={() => setTemplateType('workout')} className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${templateType === 'workout' ? 'bg-black dark:bg-white text-white dark:text-black shadow-md' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>Training</button>
              </div>

              <div className="grid gap-3">
                  {templates.filter(t => t.type === templateType).map(t => (
                      <div key={t.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 flex justify-between items-center group cursor-pointer active:scale-[0.98] transition" onClick={() => startEditTemplate(t)}>
                          <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === 'diet' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/20'}`}>
                                  {t.type === 'diet' ? <Utensils size={24}/> : <FileText size={24}/>}
                              </div>
                              <div>
                                  <h3 className="font-black text-black dark:text-white text-lg tracking-tight">{t.name}</h3>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{(t.data as any[]).length} {t.type === 'diet' ? 'Meals' : 'Days'} Configured</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setPdfNameInput(''); setShowPdf({ type: t.type, clientName: '', data: t.data }); }} className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition">
                                  <Printer size={18}/>
                              </button>
                              <button onClick={(e) => handleDeleteTemplate(t.id, e)} className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-red-600 transition"><Trash2 size={18}/></button>
                          </div>
                      </div>
                  ))}
                  {templates.filter(t => t.type === templateType).length === 0 && (
                      <div className="text-center py-20 bg-white dark:bg-[#1C1C1E] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                          <p className="text-gray-400 font-bold">No {templateType} templates found.</p>
                          <button onClick={startCreateTemplate} className="mt-4 text-blue-500 font-black uppercase text-xs">Create First Template</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'clients' && (
          <div className="space-y-4">
              {!viewingClient && (
                  <div className="relative mb-6">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search client plans..." className="w-full bg-white dark:bg-[#1C1C1E] pl-12 pr-4 py-4 rounded-3xl outline-none shadow-sm border border-gray-100 dark:border-white/5" />
                  </div>
              )}

              {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => {
                  const hasDiet = Array.isArray(c.dietPlan) && c.dietPlan.length > 0;
                  const hasWorkout = Array.isArray(c.workoutRoutine) && c.workoutRoutine.length > 0;
                  
                  // In Client Mode, verify this is the active client
                  if (viewingClient && c.id !== viewingClient.id) return null;

                  return (
                    <div key={c.id} onClick={() => startEditClient(c)} className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 flex justify-between items-center cursor-pointer active:scale-[0.99] transition">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl">
                                {c.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-black text-black dark:text-white text-lg leading-none mb-1">{viewingClient ? "Your Active Plan" : c.name}</h3>
                                <div className="flex gap-2">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${hasDiet ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-400 dark:bg-white/5'}`}>Nutrition</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${hasWorkout ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-gray-100 text-gray-400 dark:bg-white/5'}`}>Training</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             {(hasDiet || hasWorkout) && (
                                 <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setShowPdf({ 
                                            type: (hasDiet && hasWorkout) ? 'full' : (hasDiet ? 'diet' : 'workout'), 
                                            clientName: c.name, 
                                            data: undefined, 
                                            client: c
                                        }); 
                                    }} 
                                    className={`p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition shadow-sm border border-blue-100 dark:border-blue-900/30 ${viewingClient ? 'px-6 flex gap-2 font-bold text-xs items-center' : ''}`}
                                 >
                                     <Download size={18} />
                                     {viewingClient && <span>View Plan</span>}
                                 </button>
                             )}
                             {!viewingClient && <ChevronRight size={20} className="text-gray-300"/>}
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {/* Quick PDF Modal */}
      {showPdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
              <div className="bg-white dark:bg-[#1C1C1E] p-8 rounded-[40px] w-full max-w-sm shadow-2xl relative">
                  <button onClick={() => setShowPdf(null)} className="absolute top-6 right-6 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition"><X size={20}/></button>
                  
                  {(!showPdf.clientName && !showPdf.client) ? (
                      <div className="animate-fadeIn">
                        <h3 className="text-2xl font-black text-black dark:text-white mb-2 uppercase tracking-tight">Print Setup</h3>
                        <p className="text-sm text-gray-500 mb-6">Enter a client's name to personalize the program header.</p>
                        <input type="text" value={pdfNameInput} onChange={e => setPdfNameInput(e.target.value)} placeholder="Enter Name..." className="w-full bg-gray-100 dark:bg-white/5 p-4 rounded-2xl outline-none font-bold mb-6 text-black dark:text-white" autoFocus />
                        <div className="flex gap-3">
                            <button onClick={() => setShowPdf(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl font-bold text-gray-500">Cancel</button>
                            <button 
                                onClick={() => setShowPdf({ ...showPdf, clientName: pdfNameInput, client: { name: pdfNameInput } as Client })} 
                                disabled={!pdfNameInput}
                                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                Generate
                            </button>
                        </div>
                      </div>
                  ) : (
                      <PlanPDF 
                        client={showPdf.client || { name: showPdf.clientName } as Client} 
                        type={showPdf.type} 
                        dietData={showPdf.data ? (showPdf.type === 'diet' ? showPdf.data : undefined) : (showPdf.client?.dietPlan as DietMeal[])} 
                        workoutData={showPdf.data ? (showPdf.type === 'workout' ? showPdf.data : undefined) : (showPdf.client?.workoutRoutine as WorkoutDay[])}
                        onClose={() => setShowPdf(null)} 
                      />
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default PlanManager;
