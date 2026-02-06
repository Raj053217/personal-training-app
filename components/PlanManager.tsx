import React, { useState, useEffect } from 'react';
import { Client, PlanTemplate, DietMeal, WorkoutDay } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Search, Plus, Trash2, FileText, Download, ChevronRight, User, FolderOpen, Save, ArrowLeft, Copy, Printer, Eye } from 'lucide-react';
import PlanBuilder from './PlanBuilder';
import PlanPDF from './PlanPDF';
import { saveTemplates, loadTemplates } from '../services/storage';

interface PlanManagerProps {
  clients: Client[];
  onUpdateClient: (client: Client) => void;
}

const PlanManager: React.FC<PlanManagerProps> = ({ clients, onUpdateClient }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'clients'>('templates');
  const [templateType, setTemplateType] = useState<'diet' | 'workout'>('diet');
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  
  // Editor State
  const [editingTemplate, setEditingTemplate] = useState<PlanTemplate | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editorData, setEditorData] = useState<DietMeal[] | WorkoutDay[]>([]);
  const [templateName, setTemplateName] = useState('');

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
  }, []);

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
          // FIX: Ensure we only update the matching ID
          updated = templates.map(t => t.id === editingTemplate.id ? newTemplate : t);
      } else {
          updated = [...templates, newTemplate];
      }
      
      setTemplates(updated);
      saveTemplates(updated);
      setEditingTemplate(null);
      setEditorData([]);
      setTemplateName('');
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
      setEditingClient(null); // Return to list
  };

  const startEditClient = (c: Client) => {
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
      const name = editingClient ? editingClient.name : (pdfNameInput || "Client Name");
      
      setShowPdf({
          type: templateType,
          clientName: editingClient ? editingClient.name : (templateName || "Template Preview"),
          data: editorData,
          client: editingClient || { name: pdfNameInput || "Client Name" } as Client
      });
  };

  // --- Render ---

  // 1. Editor View (Used for both Template and Client)
  if (editingTemplate || editingClient) {
      return (
          <div className="animate-fadeIn pb-24">
              <div className="flex items-center gap-3 mb-6 px-1 pt-2">
                  <button onClick={() => { setEditingTemplate(null); setEditingClient(null); }} className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full"><ArrowLeft size={20}/></button>
                  <div>
                      <h2 className="text-2xl font-black text-black dark:text-white leading-none">
                          {editingClient ? `Editing ${editingClient.name}` : (editingTemplate ? 'Edit Template' : 'New Template')}
                      </h2>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{templateType} Plan</p>
                  </div>
              </div>

              {/* Template Name Input (Only if editing template) */}
              {!editingClient && (
                  <div className="mb-6">
                      <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template Name (e.g. Fat Loss Phase 1)" className="w-full bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl text-lg font-bold outline-none shadow-sm" />
                  </div>
              )}

              {/* Client Type Switcher (Only if editing Client) */}
              {editingClient && (
                  <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4">
                      <button onClick={() => { setTemplateType('diet'); setEditorData(Array.isArray(editingClient.dietPlan) ? editingClient.dietPlan : []); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${templateType === 'diet' ? 'bg-white dark:bg-[#2C2C2E] shadow' : 'text-gray-500'}`}>Diet</button>
                      <button onClick={() => { setTemplateType('workout'); setEditorData(Array.isArray(editingClient.workoutRoutine) ? editingClient.workoutRoutine : []); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${templateType === 'workout' ? 'bg-white dark:bg-[#2C2C2E] shadow' : 'text-gray-500'}`}>Workout</button>
                  </div>
              )}

              {/* Import Template Button (Only if editing Client) */}
              {editingClient && (
                  <div className="mb-4 overflow-x-auto whitespace-nowrap pb-2">
                      {templates.filter(t => t.type === templateType).map(t => (
                          <button key={t.id} onClick={() => importTemplateToClient(t)} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-lg mr-2 border border-blue-100 dark:border-blue-900/30">
                              <Copy size={12}/> Import: {t.name}
                          </button>
                      ))}
                      {templates.filter(t => t.type === templateType).length === 0 && <span className="text-xs text-gray-400 italic">No templates available. Create one in the Templates tab.</span>}
                  </div>
              )}

              {/* Builder */}
              <PlanBuilder type={templateType} data={editorData} onChange={setEditorData} />

              {/* Footer Actions */}
              <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 flex gap-3 safe-bottom z-30 overflow-x-auto">
                  <button onClick={() => { setEditingTemplate(null); setEditingClient(null); }} className="px-4 py-3 rounded-2xl font-bold text-gray-500 bg-gray-100 dark:bg-gray-800">Cancel</button>
                  
                  {/* Preview PDF Button */}
                  <button onClick={handlePreviewPdf} className="px-4 py-3 rounded-2xl font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-2">
                     <Eye size={18} /> <span className="hidden sm:inline">Preview PDF</span>
                  </button>

                  {editingClient && (
                      <button onClick={() => setShowSaveAsTemplate(true)} className="px-4 py-3 rounded-2xl font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 whitespace-nowrap">Save as Template</button>
                  )}
                  
                  <button onClick={editingClient ? handleSaveClientPlan : handleSaveTemplate} className="flex-1 px-4 py-3 rounded-2xl font-bold text-white bg-blue-600 shadow-lg shadow-blue-500/30 whitespace-nowrap">Save {editingClient ? 'Plan' : 'Template'}</button>
              </div>

              {/* Save As Template Modal */}
              {showSaveAsTemplate && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-3xl w-full max-w-sm shadow-2xl">
                          <h3 className="text-xl font-black text-black dark:text-white mb-2">Save as Sample</h3>
                          <p className="text-sm text-gray-500 mb-4">Save this plan as a template to reuse later.</p>
                          <input type="text" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="Template Name (e.g. Hypertrophy Beginner)" className="w-full bg-gray-100 dark:bg-white/5 p-3 rounded-xl outline-none font-bold mb-4" autoFocus />
                          
                          <div className="flex gap-2">
                              <button onClick={() => setShowSaveAsTemplate(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-gray-500">Cancel</button>
                              <button onClick={saveCurrentPlanAsTemplate} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Save</button>
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
      <div className="pt-2 px-1 mb-4">
         <h1 className="text-[34px] font-bold text-black dark:text-white leading-tight">Plans Library</h1>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
          <button onClick={() => setActiveTab('templates')} className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'templates' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}>Templates</button>
          <button onClick={() => setActiveTab('clients')} className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'clients' ? 'border-black dark:border-white text-black dark:text-white' : 'border-transparent text-gray-400'}`}>Client Plans</button>
      </div>

      {activeTab === 'templates' && (
          <div className="space-y-6">
              <div className="flex gap-2 mb-4">
                   <button onClick={() => setTemplateType('diet')} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${templateType === 'diet' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>Diet Templates</button>
                   <button onClick={() => setTemplateType('workout')} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${templateType === 'workout' ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}>Workout Templates</button>
              </div>

              <div className="grid gap-3">
                  <button onClick={startCreateTemplate} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition mb-2">
                      <Plus size={20}/> Create New {templateType === 'diet' ? 'Diet' : 'Workout'} Template
                  </button>

                  {templates.filter(t => t.type === templateType).map(t => (
                      <div key={t.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex justify-between items-center group cursor-pointer" onClick={() => startEditTemplate(t)}>
                          <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-xl ${t.type === 'diet' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                  {t.type === 'diet' ? <FileText size={20}/> : <Download size={20}/>}
                              </div>
                              <div>
                                  <h3 className="font-bold text-black dark:text-white">{t.name}</h3>
                                  <p className="text-xs text-gray-400 font-medium">{(t.data as any[]).length} {t.type === 'diet' ? 'Meals' : 'Days'}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setPdfNameInput(''); setShowPdf({ type: t.type, clientName: '', data: t.data }); }} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition flex items-center gap-1 px-3">
                                  <Printer size={16}/> <span className="text-[10px] font-bold">PDF</span>
                              </button>
                              <button onClick={(e) => handleDeleteTemplate(t.id, e)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
                  {templates.filter(t => t.type === templateType).length === 0 && <p className="text-center text-gray-400 py-10 italic">No templates found.</p>}
              </div>
          </div>
      )}

      {activeTab === 'clients' && (
          <div className="space-y-4">
              <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search Clients..." className="w-full bg-gray-100 dark:bg-white/10 pl-10 pr-4 py-3 rounded-xl outline-none" />
              </div>

              {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => {
                  const hasDiet = Array.isArray(c.dietPlan) && c.dietPlan.length > 0;
                  const hasWorkout = Array.isArray(c.workoutRoutine) && c.workoutRoutine.length > 0;
                  
                  return (
                    <div key={c.id} onClick={() => startEditClient(c)} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex justify-between items-center cursor-pointer active:scale-[0.99] transition">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                                {c.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-black dark:text-white">{c.name}</h3>
                                <p className="text-xs text-gray-400">
                                    {hasDiet ? 'Diet ✓' : 'No Diet'} • {hasWorkout ? 'Workout ✓' : 'No Workout'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                                    className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-200 transition"
                                 >
                                     <Download size={16} />
                                 </button>
                             )}
                            <ChevronRight size={20} className="text-gray-300"/>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {/* Quick PDF Modal */}
      {showPdf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-3xl w-full max-w-sm shadow-2xl">
                  {(!showPdf.clientName && !showPdf.client) ? (
                      <>
                        <h3 className="text-xl font-black text-black dark:text-white mb-2">Print Template</h3>
                        <p className="text-sm text-gray-500 mb-4">Enter a name to appear on the PDF.</p>
                        <input type="text" value={pdfNameInput} onChange={e => setPdfNameInput(e.target.value)} placeholder="Client Name" className="w-full bg-gray-100 dark:bg-white/5 p-3 rounded-xl outline-none font-bold mb-4" autoFocus />
                        <div className="flex gap-2">
                            <button onClick={() => setShowPdf(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-gray-500">Cancel</button>
                            <button 
                                onClick={() => setShowPdf({ ...showPdf, clientName: pdfNameInput, client: { name: pdfNameInput } as Client })} 
                                disabled={!pdfNameInput}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                      </>
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