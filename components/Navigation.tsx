import React from 'react';
import { AppMode, ConfigVersionSnapshot } from '../types';
import { brandConfig } from '../config';
import {
  Home,
  Menu,
  X,
  Users,
  FileText,
  MessageSquare,
  UserPlus,
  Settings,
  Save,
  RotateCcw,
  Loader2,
  BookOpen,
  Upload,
  Plus,
  History,
  CheckCircle2,
  Trash2,
  FileCheck,
  HelpCircle
} from 'lucide-react';
import { HelpGuideModal } from './HelpGuideModal';
import { useCompanyContext } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchRagDocs,
  saveRagDocs,
  uploadRagFile,
  fetchConfigVersions,
  restoreConfigVersion
} from '../services/geminiService';

interface NavigationProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentMode, setMode, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { name, description, saveContext, loadLast } = useCompanyContext();
  const { language, setLanguage, t } = useLanguage();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [tempName, setTempName] = React.useState(name);
  const [tempDesc, setTempDesc] = React.useState(description);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingLast, setIsLoadingLast] = React.useState(false);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = React.useState(false);

  // Knowledge Base (RAG) State
  const [isRagModalOpen, setIsRagModalOpen] = React.useState(false);
  const [activeRagTab, setActiveRagTab] = React.useState<'docs' | 'history'>('docs');
  const [ragDocs, setRagDocs] = React.useState<Record<string, string>>({});
  const [selectedDocFilename, setSelectedDocFilename] = React.useState<string>('01_cofepris_lineamientos.md');
  const [ragVersions, setRagVersions] = React.useState<ConfigVersionSnapshot[]>([]);
  const [ragVersionLabel, setRagVersionLabel] = React.useState('');
  const [newDocNameInput, setNewDocNameInput] = React.useState('');
  const [isAddingNewDoc, setIsAddingNewDoc] = React.useState(false);
  const [isLoadingRag, setIsLoadingRag] = React.useState(false);
  const [isSavingRag, setIsSavingRag] = React.useState(false);
  const [isUploadingFile, setIsUploadingFile] = React.useState(false);
  const [ragStatusMsg, setRagStatusMsg] = React.useState<string | null>(null);
  const ragFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const isRagBusy = isLoadingRag || isSavingRag || isUploadingFile;
  const isSettingsBusy = isSaving || isLoadingLast;

  const CORE_RAG_PILLARS: Record<string, { es: string; en: string; descEs: string; descEn: string; category: string }> = {
    '01_cofepris_lineamientos.md': {
      es: 'Lineamientos Regulatorios COFEPRIS',
      en: 'COFEPRIS Regulatory Guidelines',
      descEs: 'Leyendas precautorias, folios sanitarios y restricciones legales',
      descEn: 'Mandatory disclaimers, sanitary permits, and legal restrictions',
      category: 'Regulatorio'
    },
    '02_chopo_brand_manual.md': {
      es: 'Manual de Identidad y Marca Chopo',
      en: 'Chopo Brand & Identity Manual',
      descEs: 'Tono de comunicación (B2C / B2B), paleta visual y vigencias',
      descEn: 'Tone of voice (B2C / B2B), visual palette, and promo terms',
      category: 'Marca'
    },
    '03_catalogo_estudios_diabetes.md': {
      es: 'Catálogo de Estudios y Preparación Clínica',
      en: 'Clinical Studies & Preparation Catalog',
      descEs: 'Perfiles diagnósticos, estudios incluidos e indicaciones de ayuno',
      descEn: 'Diagnostic panels, included tests, and fasting instructions',
      category: 'Área Médica'
    },
    '04_reglas_realismo_clinico_y_operativo.md': {
      es: 'Reglas de Imagen y Realismo Clínico',
      en: 'Visual & Clinical Realism Rules',
      descEs: 'Equipamiento médico, vestimenta de pacientes y entrega digital',
      descEn: 'Medical equipment, patient attire, and digital delivery rules',
      category: 'Realismo Visual'
    }
  };

  const formatVersionDate = (ver: ConfigVersionSnapshot): string => {
    const rawDate = ver.timestamp || (ver as any).createdAt;
    if (!rawDate) return t('Versión base', 'Baseline version');
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) return t('Versión base', 'Baseline version');
    return parsed.toLocaleString(language === 'es' ? 'es-MX' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sanitizeVersionLabel = (label?: string): string => {
    if (!label) return t('Configuración Base por Defecto — Laboratorios Chopo', 'Default Baseline Configuration — Laboratorios Chopo');
    if (/MVP|Semilla Oficial/i.test(label)) {
      return t('Configuración Base por Defecto — Laboratorios Chopo', 'Default Baseline Configuration — Laboratorios Chopo');
    }
    return label;
  };

  const openRagAdminModal = async () => {
    setIsRagModalOpen(true);
    setActiveRagTab('docs');
    setIsLoadingRag(true);
    setRagStatusMsg(null);
    try {
      const [docsData, versionsData] = await Promise.all([
        fetchRagDocs(),
        fetchConfigVersions('rag_docs')
      ]);
      setRagDocs(docsData || {});
      setRagVersions(versionsData || []);
      const keys = Object.keys(docsData || {}).sort();
      if (keys.length > 0 && (!selectedDocFilename || !docsData[selectedDocFilename])) {
        setSelectedDocFilename(keys[0]);
      }
    } catch (e) {
      console.error('Error loading RAG docs:', e);
    } finally {
      setIsLoadingRag(false);
    }
  };

  const handleSaveRagDocs = async () => {
    setIsSavingRag(true);
    setRagStatusMsg(null);
    try {
      const docMeta = CORE_RAG_PILLARS[selectedDocFilename];
      const friendlyName = docMeta ? docMeta.es : selectedDocFilename;
      const label = ragVersionLabel.trim() || t(
        `Actualización: ${friendlyName}`,
        `Updated: ${friendlyName}`
      );
      const saved = await saveRagDocs(ragDocs, label);
      setRagDocs(saved);
      setRagVersionLabel('');
      const versionsData = await fetchConfigVersions('rag_docs');
      setRagVersions(versionsData || []);
      setRagStatusMsg(t(
        'Cambios guardados y sincronizados en Cloud Storage y Firestore.',
        'Changes saved and synced to Cloud Storage and Firestore.'
      ));
    } catch (e) {
      alert(t('No se pudieron guardar los cambios.', 'Failed to save changes.'));
    } finally {
      setIsSavingRag(false);
    }
  };

  const handleUploadRagFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    let cleanName = file.name.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
    const lower = cleanName.toLowerCase();
    const isPdf = lower.endsWith('.pdf') || file.type === 'application/pdf';

    if (!isPdf && !lower.endsWith('.md') && !lower.endsWith('.txt')) {
      cleanName = `${cleanName}.txt`;
    }

    setIsUploadingFile(true);
    setRagStatusMsg(
      isPdf
        ? t(`Subiendo "${file.name}" y extrayendo contenido del PDF...`, `Uploading "${file.name}" and extracting PDF content...`)
        : t(`Cargando "${file.name}"...`, `Loading "${file.name}"...`)
    );

    try {
      if (isPdf) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploaded = await uploadRagFile({
          filename: cleanName,
          mimeType: 'application/pdf',
          base64Data
        });

        const updatedDocs = {
          ...ragDocs,
          [uploaded.filename]: uploaded.content
        };
        setRagDocs(updatedDocs);
        setSelectedDocFilename(uploaded.filename);

        const saved = await saveRagDocs(
          updatedDocs,
          t(`Carga de PDF: ${uploaded.filename}`, `PDF Upload: ${uploaded.filename}`)
        );
        setRagDocs(saved);
        const versionsData = await fetchConfigVersions('rag_docs');
        setRagVersions(versionsData || []);
        setRagStatusMsg(t(
          `PDF "${uploaded.filename}" procesado, guardado en el bucket y disponible para edición.`,
          `PDF "${uploaded.filename}" processed, stored in bucket, and ready for editing.`
        ));
      } else {
        const textContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = reject;
          reader.readAsText(file);
        });

        await uploadRagFile({
          filename: cleanName,
          mimeType: file.type || 'text/plain',
          textContent
        });

        const updatedDocs = {
          ...ragDocs,
          [cleanName]: textContent
        };
        setRagDocs(updatedDocs);
        setSelectedDocFilename(cleanName);

        const saved = await saveRagDocs(
          updatedDocs,
          t(`Carga de documento: ${cleanName}`, `Document upload: ${cleanName}`)
        );
        setRagDocs(saved);
        const versionsData = await fetchConfigVersions('rag_docs');
        setRagVersions(versionsData || []);
        setRagStatusMsg(t(
          `Documento "${cleanName}" cargado y sincronizado correctamente.`,
          `Document "${cleanName}" uploaded and synced successfully.`
        ));
      }
    } catch (err) {
      console.error('Error uploading RAG file:', err);
      alert(t('Ocurrió un error al procesar el archivo.', 'Failed to process the uploaded file.'));
      setRagStatusMsg(null);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleCreateNewRagDoc = () => {
    const raw = newDocNameInput.trim();
    if (!raw) return;
    let cleanName = raw.replace(/[^a-zA-Z0-9._-]/g, '_');
    const lower = cleanName.toLowerCase();
    if (!lower.endsWith('.md') && !lower.endsWith('.txt') && !lower.endsWith('.pdf')) {
      cleanName = `${cleanName}.md`;
    }
    const title = raw.replace(/\.(md|txt|pdf)$/i, '');
    const defaultTemplate = `# ${title}\n\nEscribe aquí los lineamientos, criterios médicos o reglas de comunicación que deben tomarse en cuenta al generar y evaluar campañas.\n`;
    setRagDocs(prev => ({
      ...prev,
      [cleanName]: prev[cleanName] || defaultTemplate
    }));
    setSelectedDocFilename(cleanName);
    setNewDocNameInput('');
    setIsAddingNewDoc(false);
  };

  const handleDeleteCustomRagDoc = (filename: string) => {
    if (CORE_RAG_PILLARS[filename]) return;
    const next = { ...ragDocs };
    delete next[filename];
    setRagDocs(next);
    const remainingKeys = Object.keys(next).sort();
    if (selectedDocFilename === filename && remainingKeys.length > 0) {
      setSelectedDocFilename(remainingKeys[0]);
    }
  };

  const handleRestoreRagVersion = async (versionId: string) => {
    setIsSavingRag(true);
    setRagStatusMsg(null);
    try {
      const res = await restoreConfigVersion('rag_docs', versionId);
      if (res?.data && typeof res.data === 'object') {
        setRagDocs(res.data);
        const keys = Object.keys(res.data).sort();
        if (keys.length > 0 && !res.data[selectedDocFilename]) {
          setSelectedDocFilename(keys[0]);
        }
      } else {
        const docsData = await fetchRagDocs();
        setRagDocs(docsData || {});
      }
      const versionsData = await fetchConfigVersions('rag_docs');
      setRagVersions(versionsData || []);
      setRagStatusMsg(
        versionId === 'OFFICIAL_SEED'
          ? t('Se restauraron los documentos iniciales por defecto.', 'Default initial documents restored.')
          : t('Se restauró la versión seleccionada correctamente.', 'Selected version restored successfully.')
      );
      setActiveRagTab('docs');
    } catch (e) {
      alert(t('No se pudo restaurar la versión seleccionada.', 'Failed to restore the selected version.'));
    } finally {
      setIsSavingRag(false);
    }
  };

  React.useEffect(() => {
    if (isSettingsOpen) {
      setTempName(name);
      setTempDesc(description);
    }
  }, [isSettingsOpen, name, description]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveContext(tempName, tempDesc);
      setIsSettingsOpen(false);
    } catch (e) {
      alert(t("Error al guardar el contexto de la empresa.", "Failed to save company context."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadLast = async () => {
    setIsLoadingLast(true);
    try {
      await loadLast();
    } catch (e) {
      alert(t("Error al cargar el último contexto guardado.", "Failed to load last saved context."));
    } finally {
      setIsLoadingLast(false);
    }
  };

  const navItems = [
    { id: AppMode.HOME, label: t('Inicio', 'Home'), icon: Home },
    { id: AppMode.AUDIENCE_GEN, label: t('1. Audiencias', '1. Audiences'), icon: Users },
    { id: AppMode.SYNTHETIC_USERS, label: t('2. Usuarios Sintéticos', '2. Synthetic Users'), icon: UserPlus },
    { id: AppMode.MARKETING_BRIEF, label: t('3. Brief de Marketing', '3. Marketing Brief'), icon: FileText },
    { id: AppMode.SYNTHETIC_FOCUS_GROUP, label: t('4. Focus Group', '4. Focus Group'), icon: MessageSquare },
  ];

  const getFileExtensionBadge = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase() || 'DOC';
    return ext;
  };

  return (
    <>
      {/* Mobile Header */}
      <div className={`md:hidden fixed top-0 left-0 w-full ${brandConfig.ui.button.primary} h-16 flex items-center justify-between px-4 z-50 text-white shadow-md`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight">{name}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center bg-white/15 rounded-full p-0.5 border border-white/25 text-xs font-bold">
            <button
              type="button"
              onClick={() => setLanguage('es')}
              className={`px-2.5 py-1 rounded-full transition-all ${language === 'es' ? 'bg-white text-[#0066FF] shadow-sm' : 'text-white/90 hover:text-white'}`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-full transition-all ${language === 'en' ? 'bg-white text-[#0066FF] shadow-sm' : 'text-white/90 hover:text-white'}`}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsHelpGuideOpen(true)}
            className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
            title={t('Guía de Uso / Ayuda', 'Help & Guide')}
          >
            <HelpCircle size={18} />
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop & Mobile Overlay) */}
      <nav className={`
        nav-sidebar transition-transform duration-300 ease-in-out pt-16 md:pt-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="hidden md:flex flex-col items-center justify-center p-6 border-b border-gray-200 gap-3">
          <img src={brandConfig.logo.sidebar} alt="Chopo AI" className="h-14 w-auto" />
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 border border-gray-200 w-full max-w-[160px] justify-center">
            <button
              type="button"
              onClick={() => setLanguage('es')}
              className={`flex-1 py-1 rounded-full text-xs font-bold transition-all ${language === 'es' ? 'bg-[#0066FF] text-white shadow-sm' : 'text-gray-600 hover:text-[#0066FF]'}`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1 rounded-full text-xs font-bold transition-all ${language === 'en' ? 'bg-[#0066FF] text-white shadow-sm' : 'text-gray-600 hover:text-[#0066FF]'}`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon!;
            const isActive = currentMode === item.id;
            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => {
                    setMode(item.id as AppMode);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium text-sm
                    ${isActive
                      ? `${brandConfig.ui.button.primary}`
                      : `text-gray-600 hover:bg-gray-100 hover:text-[#0066FF]`}
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="px-4 pb-3 mt-auto space-y-2">
          <button
            type="button"
            onClick={() => setIsHelpGuideOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#EFF6FF] hover:bg-blue-100 text-[#003B7A] border border-blue-200 transition-all text-xs font-bold shadow-sm"
          >
            <HelpCircle size={17} className="text-[#0066FF] shrink-0" />
            <span className="truncate">{t('Guía de Uso / Ayuda', 'Help & Usage Guide')}</span>
          </button>
          <button
            type="button"
            onClick={openRagAdminModal}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-[#003B7A] border border-slate-200 hover:border-blue-200 transition-all text-sm font-semibold shadow-sm"
          >
            <BookOpen size={18} className="text-[#0066FF] shrink-0" />
            <span className="truncate">{t('Base de Conocimiento (COFEPRIS y Marca)', 'Knowledge Base (COFEPRIS & Brand)')}</span>
          </button>
        </div>

        <div className="w-full p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-[#0066FF] text-white flex items-center justify-center font-bold text-lg shrink-0">
                {name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-[#003B7A] truncate">{name}</p>
                <p className="text-xs text-gray-500 font-medium">{t('Edición Empresarial', 'Enterprise Edition')}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-[#0066FF] transition-colors rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-gray-100"
              title={t('Configuración de Contexto de Empresa', 'Company Context Settings')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Clean Corporate Knowledge Base Modal */}
      {isRagModalOpen && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 md:p-6 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[86vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Top Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF]">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#003B7A]">
                    {t('Base de Conocimiento (COFEPRIS y Marca)', 'Knowledge Base (COFEPRIS & Brand)')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t(
                      'Documentos de referencia para validación regulatoria, identidad de marca y criterios clínicos.',
                      'Reference documents for regulatory compliance, brand identity, and clinical criteria.'
                    )}
                  </p>
                </div>
              </div>

              {/* Clean View Switcher Tabs */}
              <div className="flex items-center gap-3">
                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    disabled={isRagBusy}
                    onClick={() => setActiveRagTab('docs')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      activeRagTab === 'docs'
                        ? 'bg-white text-[#003B7A] shadow-sm'
                        : 'text-slate-600 hover:text-[#003B7A]'
                    }`}
                  >
                    <FileCheck size={14} className={activeRagTab === 'docs' ? 'text-[#0066FF]' : ''} />
                    {t('Documentos Activos', 'Active Documents')} ({Object.keys(ragDocs).length})
                  </button>
                  <button
                    type="button"
                    disabled={isRagBusy}
                    onClick={() => setActiveRagTab('history')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      activeRagTab === 'history'
                        ? 'bg-white text-[#003B7A] shadow-sm'
                        : 'text-slate-600 hover:text-[#003B7A]'
                    }`}
                  >
                    <History size={14} className={activeRagTab === 'history' ? 'text-[#0066FF]' : ''} />
                    {t('Historial de Versiones', 'Version History')}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isRagBusy}
                  onClick={() => setIsRagModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {ragStatusMsg && (
              <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                  <span>{ragStatusMsg}</span>
                </div>
                <button
                  type="button"
                  disabled={isRagBusy}
                  onClick={() => setRagStatusMsg(null)}
                  className="text-emerald-600 hover:text-emerald-900 disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* TAB 1: ACTIVE DOCUMENTS */}
            {activeRagTab === 'docs' ? (
              <div className={`flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 ${isRagBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                {/* Left Column: Clean Document List */}
                <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/60 p-5 flex flex-col gap-4 overflow-y-auto">
                  {/* Action Buttons (Well spaced, no emojis, supports PDF/TXT/MD) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      ref={ragFileInputRef}
                      type="file"
                      disabled={isRagBusy}
                      accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                      onChange={handleUploadRagFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isRagBusy}
                      onClick={() => ragFileInputRef.current?.click()}
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#003B7A] border border-slate-200 hover:border-blue-300 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                      {isUploadingFile ? <Loader2 size={15} className="animate-spin text-[#0066FF]" /> : <Upload size={15} className="text-[#0066FF]" />}
                      <span>{t('Subir PDF / TXT / MD', 'Upload PDF / TXT / MD')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isRagBusy}
                      onClick={() => setIsAddingNewDoc(!isAddingNewDoc)}
                      className="px-3 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    >
                      <Plus size={15} />
                      <span>{t('Nuevo Documento', 'New Document')}</span>
                    </button>
                  </div>

                  {isAddingNewDoc && (
                    <div className="p-3.5 bg-white rounded-xl border border-blue-200 shadow-sm space-y-2.5">
                      <label className="block text-[11px] font-bold text-[#003B7A]">
                        {t('Nombre del nuevo documento', 'New document name')}
                      </label>
                      <input
                        type="text"
                        disabled={isRagBusy}
                        value={newDocNameInput}
                        onChange={(e) => setNewDocNameInput(e.target.value)}
                        placeholder={t('ej. Lineamientos_Promociones', 'e.g. Promo_Guidelines')}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF] disabled:opacity-60"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isRagBusy}
                          onClick={() => setIsAddingNewDoc(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
                        >
                          {t('Cancelar', 'Cancel')}
                        </button>
                        <button
                          type="button"
                          disabled={isRagBusy}
                          onClick={handleCreateNewRagDoc}
                          className="px-3.5 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                          {t('Crear', 'Create')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Document Cards */}
                  {isLoadingRag ? (
                    <div className="py-12 flex items-center justify-center text-slate-400 text-xs gap-2">
                      <Loader2 size={18} className="animate-spin text-[#0066FF]" />
                      <span>{t('Cargando documentos...', 'Loading documents...')}</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.keys(ragDocs).sort().map((filename) => {
                        const pillar = CORE_RAG_PILLARS[filename];
                        const isSelected = selectedDocFilename === filename;
                        return (
                          <div
                            key={filename}
                            onClick={() => {
                              if (isRagBusy) return;
                              setSelectedDocFilename(filename);
                            }}
                            className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'bg-white border-[#0066FF] ring-2 ring-[#0066FF]/15 shadow-sm'
                                : 'bg-white hover:border-slate-300 text-slate-800 border-slate-200/90'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#0066FF]">
                                  {pillar ? pillar.category : getFileExtensionBadge(filename)}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-[#003B7A] leading-snug">
                                {pillar ? (language === 'es' ? pillar.es : pillar.en) : filename.replace(/\.(md|txt|pdf)$/i, '').replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {pillar ? (language === 'es' ? pillar.descEs : pillar.descEn) : filename}
                              </p>
                            </div>
                            {!pillar && (
                              <button
                                type="button"
                                disabled={isRagBusy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isRagBusy) return;
                                  handleDeleteCustomRagDoc(filename);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title={t('Eliminar documento', 'Delete document')}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Clean Light-Mode Document Viewer & Editor */}
                <div className="md:col-span-8 p-6 flex flex-col h-full overflow-hidden bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-[#003B7A]">
                        {CORE_RAG_PILLARS[selectedDocFilename]
                          ? (language === 'es' ? CORE_RAG_PILLARS[selectedDocFilename].es : CORE_RAG_PILLARS[selectedDocFilename].en)
                          : selectedDocFilename}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedDocFilename} • {(ragDocs[selectedDocFilename] || '').length.toLocaleString()} {t('caracteres', 'characters')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        disabled={isRagBusy}
                        value={ragVersionLabel}
                        onChange={(e) => setRagVersionLabel(e.target.value)}
                        placeholder={t('Nota de versión (opcional)...', 'Version note (optional)...')}
                        className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF] w-56 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={isRagBusy}
                        onClick={handleSaveRagDocs}
                        className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isSavingRag ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        <span>{t('Guardar Cambios', 'Save Changes')}</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    disabled={isRagBusy}
                    value={ragDocs[selectedDocFilename] || ''}
                    onChange={(e) =>
                      setRagDocs((prev) => ({
                        ...prev,
                        [selectedDocFilename]: e.target.value
                      }))
                    }
                    className="flex-1 w-full p-5 bg-slate-50/70 focus:bg-white text-slate-800 text-sm leading-relaxed rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-none transition-colors disabled:opacity-60"
                    placeholder={t('Escribe o edita aquí el contenido del documento...', 'Write or edit the document content here...')}
                  />
                </div>
              </div>
            ) : (
              /* TAB 2: SPACIOUS VERSION HISTORY & RESTORE */
              <div className={`flex-1 p-6 overflow-y-auto bg-slate-50/50 ${isRagBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
                <div className="max-w-4xl mx-auto space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                    <div>
                      <h3 className="text-sm font-bold text-[#003B7A]">
                        {t('Control de Versiones de la Base de Conocimiento', 'Knowledge Base Version Control')}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t(
                          'Cada vez que guardas un cambio o subes un documento se conserva una copia para que puedas restaurarla cuando lo necesites.',
                          'Every time you save a change or upload a document, a snapshot is kept so you can restore it whenever needed.'
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isRagBusy}
                      onClick={() => handleRestoreRagVersion('OFFICIAL_SEED')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      <span>{t('Restaurar Valores por Defecto', 'Restore Default Values')}</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {ragVersions.map((ver) => (
                      <div
                        key={ver.versionId}
                        className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-4 shadow-sm hover:border-blue-200 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#003B7A] truncate">{sanitizeVersionLabel(ver.label)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatVersionDate(ver)} • {ver.itemCount || Object.keys(ragDocs).length} {t('documentos', 'documents')}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isRagBusy}
                          onClick={() => handleRestoreRagVersion(ver.versionId)}
                          className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-[#0066FF] text-[#0066FF] hover:text-white text-xs font-bold transition-colors shrink-0 disabled:opacity-50"
                        >
                          {t('Restaurar esta versión', 'Restore this version')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0066FF]/10 rounded-lg text-[#0066FF]">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#003B7A]">{t('Contexto de la Empresa', 'Company Context')}</h2>
                  <p className="text-xs text-gray-500">{t('Configuración global para agentes de IA', 'Global configuration for AI agents')}</p>
                </div>
              </div>
              <button 
                disabled={isSettingsBusy}
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className={`p-6 sm:p-8 space-y-6 ${isSettingsBusy ? 'pointer-events-none opacity-65 select-none' : ''}`}>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{t('Nombre de la Empresa', 'Company Name')}</label>
                <input 
                  type="text" 
                  disabled={isSettingsBusy}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all outline-none font-medium text-gray-900 disabled:opacity-60"
                  placeholder={t('ej. Laboratorios Chopo', 'e.g. Laboratorios Chopo')}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{t('Descripción / Contexto de la Empresa', 'Company Description / Context')}</label>
                <textarea 
                  disabled={isSettingsBusy}
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all outline-none font-medium text-gray-900 resize-none disabled:opacity-60"
                  placeholder={t('Describe tu empresa, estudios clínicos, audiencias objetivo y propuestas de valor...', 'Describe your company, products, target audience, and key value propositions...')}
                />
                <p className="mt-2 text-[11px] text-gray-400 italic">
                  {t(
                    'Este contexto será utilizado por todas las herramientas de IA (briefs de marketing, perfiles sintéticos, focus groups, etc.) para alinear los resultados con tu marca y objetivos.',
                    'This context will be used by all AI features (marketing briefs, synthetic personas, focus groups, etc.) to tailor outputs to your specific brand and goals.'
                  )}
                </p>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={handleLoadLast}
                disabled={isSettingsBusy}
                className="mr-auto px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-[#0066FF] transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw size={14} className={isLoadingLast ? 'animate-spin' : ''} />
                {isLoadingLast ? t('Cargando...', 'Loading...') : t('Cargar Último', 'Load Last')}
              </button>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                disabled={isSettingsBusy}
              >
                {t('Cancelar', 'Cancel')}
              </button>
              <button 
                onClick={handleSaveSettings}
                disabled={isSettingsBusy}
                className="px-6 py-2.5 bg-[#0066FF] hover:bg-[#004ECC] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? t('Guardando...', 'Saving...') : t('Guardar Cambios', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Contextual Help Pill (Bottom-Right) */}
      <button
        type="button"
        onClick={() => setIsHelpGuideOpen(true)}
        className="fixed bottom-5 right-5 z-40 px-4 py-2.5 rounded-full bg-[#003B7A] hover:bg-[#0066FF] text-white shadow-xl border border-white/20 flex items-center gap-2 text-xs font-bold transition-all hover:scale-[1.02]"
        title={t('Abrir guía paso a paso de esta sección', 'Open step-by-step guide for this section')}
      >
        <span className="w-2 h-2 rounded-full bg-[#78D600]" />
        <HelpCircle size={16} className="text-white shrink-0" />
        <span>{t('¿Cómo usar esta sección?', 'How to use this section?')}</span>
      </button>

      {/* Interactive Help & Onboarding Guide Modal */}
      <HelpGuideModal
        isOpen={isHelpGuideOpen}
        onClose={() => setIsHelpGuideOpen(false)}
        currentMode={currentMode}
        onNavigateMode={(mode) => {
          setMode(mode);
          setIsMobileMenuOpen(false);
        }}
        onOpenRagModal={openRagAdminModal}
      />
    </>
  );
};
