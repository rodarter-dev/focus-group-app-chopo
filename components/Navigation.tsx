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
  HelpCircle,
  Palette
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
  const { language, t } = useLanguage();
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
      descEs: 'Protocolo clínico de equipos médicos, vestimenta de pacientes y entrega digital',
      descEn: 'Clinical protocol for medical equipment, patient attire, and digital delivery',
      category: 'Realismo Clínico'
    }
  };

  const getFriendlyDocTitle = (filename: string): string => {
    const pillar = CORE_RAG_PILLARS[filename];
    if (pillar) {
      return language === 'es' ? pillar.es : pillar.en;
    }
    return filename.replace(/\.(md|txt|pdf)$/i, '').replace(/_/g, ' ').trim() || filename;
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
    if (!label) return t('Configuración Base por Defecto — Laboratorio Médico del Chopo', 'Default Baseline Configuration — Laboratorio Médico del Chopo');
    if (/MVP|Semilla Oficial/i.test(label)) {
      return t('Configuración Base por Defecto — Laboratorio Médico del Chopo', 'Default Baseline Configuration — Laboratorio Médico del Chopo');
    }
    if (/^Rollback a:\s*/i.test(label)) {
      return label.replace(/^Rollback a:\s*/i, t('Restaurado desde: ', 'Restored from: '));
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
      const friendlyName = getFriendlyDocTitle(selectedDocFilename);
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
        'Cambios guardados y sincronizados correctamente.',
        'Changes saved and synced successfully.'
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

    const displayName = getFriendlyDocTitle(cleanName);

    setIsUploadingFile(true);
    setRagStatusMsg(
      isPdf
        ? t(`Subiendo "${displayName}" y extrayendo contenido del PDF...`, `Uploading "${displayName}" and extracting PDF content...`)
        : t(`Cargando "${displayName}"...`, `Loading "${displayName}"...`)
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

        const uploadedDisplayName = getFriendlyDocTitle(uploaded.filename);
        const updatedDocs = {
          ...ragDocs,
          [uploaded.filename]: uploaded.content
        };
        setRagDocs(updatedDocs);
        setSelectedDocFilename(uploaded.filename);

        const saved = await saveRagDocs(
          updatedDocs,
          t(`Carga de PDF: ${uploadedDisplayName}`, `PDF Upload: ${uploadedDisplayName}`)
        );
        setRagDocs(saved);
        const versionsData = await fetchConfigVersions('rag_docs');
        setRagVersions(versionsData || []);
        setRagStatusMsg(t(
          `PDF "${uploadedDisplayName}" procesado, respaldado y disponible para edición.`,
          `PDF "${uploadedDisplayName}" processed, backed up, and ready for editing.`
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
          t(`Carga de documento: ${displayName}`, `Document upload: ${displayName}`)
        );
        setRagDocs(saved);
        const versionsData = await fetchConfigVersions('rag_docs');
        setRagVersions(versionsData || []);
        setRagStatusMsg(t(
          `Documento "${displayName}" cargado y sincronizado correctamente.`,
          `Document "${displayName}" uploaded and synced successfully.`
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
        versionId === 'OFFICIAL_SEED' || versionId.startsWith('v_seed_initial')
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
    return ext === 'PDF' ? 'PDF' : 'TEXTO';
  };

  return (
    <>
      {/* Mobile Header */}
      <div className={`md:hidden fixed top-0 left-0 w-full ${brandConfig.ui.button.primary} h-16 flex items-center justify-between px-4 z-50 text-white shadow-md`}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight">{name}</span>
        </div>
        <div className="flex items-center gap-3">
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
        <div className="hidden md:flex flex-col items-center justify-center p-6 border-b border-gray-200">
          <img src={brandConfig.logo.sidebar} alt="Laboratorio Médico del Chopo" className="h-14 w-auto" />
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
                      : `text-gray-600 hover:bg-gray-100 hover:text-[#005FFC]`}
                  `}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="px-4 pb-3 mt-auto space-y-2">
          <button
            type="button"
            onClick={() => setIsHelpGuideOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#EFF6FF] hover:bg-blue-100 text-[#004699] border border-blue-200 transition-all text-xs font-bold shadow-sm"
          >
            <HelpCircle size={17} className="text-[#005FFC] shrink-0" />
            <span className="whitespace-nowrap">{t('Guía de Uso / Ayuda', 'Help & Usage Guide')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(AppMode.BRAND_MANUAL);
              setIsMobileMenuOpen(false);
            }}
            title={t('Manual de Marca V4 — Laboratorio Médico del Chopo', 'Manual de Marca V4 — Laboratorio Médico del Chopo')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-bold shadow-sm ${
              currentMode === AppMode.BRAND_MANUAL
                ? 'bg-[#005FFC] text-white border-[#005FFC] shadow-md'
                : 'bg-[#EFF9FE] hover:bg-blue-100/80 text-[#004699] border-blue-200 hover:border-[#005FFC]'
            }`}
          >
            <Palette size={18} className={currentMode === AppMode.BRAND_MANUAL ? 'text-white shrink-0' : 'text-[#005FFC] shrink-0'} />
            <span className="whitespace-nowrap">{t('Manual de Marca V4', 'Manual de Marca V4')}</span>
          </button>
          <button
            type="button"
            onClick={openRagAdminModal}
            title={t('Base de Conocimiento (COFEPRIS y Clínico)', 'Base de Conocimiento (COFEPRIS y Clínico)')}
            aria-label={t('Base de Conocimiento (COFEPRIS y Clínico)', 'Base de Conocimiento (COFEPRIS y Clínico)')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-[#004699] border border-slate-200 hover:border-blue-200 transition-all text-left shadow-sm"
          >
            <BookOpen size={18} className="text-[#005FFC] shrink-0" />
            <div className="min-w-0 leading-tight">
              <span className="block text-sm font-semibold whitespace-nowrap">{t('Base de Conocimiento', 'Base de Conocimiento')}</span>
              <span className="block text-[11px] font-medium text-slate-500 whitespace-nowrap">{t('(COFEPRIS y Clínico)', '(COFEPRIS y Clínico)')}</span>
            </div>
          </button>
        </div>

        <div className="w-full px-4 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#005FFC] text-white flex items-center justify-center font-bold text-base shrink-0">
                {name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#004699] leading-tight whitespace-nowrap truncate">{name}</p>
                <p className="text-xs text-gray-500 font-medium">{t('Edición Empresarial', 'Enterprise Edition')}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 shrink-0 text-gray-400 hover:text-[#005FFC] transition-colors rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-gray-100"
              title={t('Configuración de Contexto de Empresa', 'Company Context Settings')}
            >
              <Settings size={18} />
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
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#005FFC]">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#004699]">
                    {t('Base de Conocimiento (COFEPRIS y Clínico)', 'Base de Conocimiento (COFEPRIS y Clínico)')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t(
                      'Documentos y PDFs de referencia para regulación COFEPRIS, catálogo de estudios clínicos y realismo médico.',
                      'Reference documents and PDFs for COFEPRIS regulations, clinical study catalog, and medical realism.'
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
                        ? 'bg-white text-[#004699] shadow-sm'
                        : 'text-slate-600 hover:text-[#004699]'
                    }`}
                  >
                    <FileCheck size={14} className={activeRagTab === 'docs' ? 'text-[#005FFC]' : ''} />
                    {t('Documentos Activos', 'Active Documents')} ({Object.keys(ragDocs).length})
                  </button>
                  <button
                    type="button"
                    disabled={isRagBusy}
                    onClick={() => setActiveRagTab('history')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 ${
                      activeRagTab === 'history'
                        ? 'bg-white text-[#004699] shadow-sm'
                        : 'text-slate-600 hover:text-[#004699]'
                    }`}
                  >
                    <History size={14} className={activeRagTab === 'history' ? 'text-[#005FFC]' : ''} />
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

            {/* Brand Manual V4 Callout Banner */}
            <div className="px-6 py-3 bg-[#EFF9FE] border-b border-[#BDD4F2] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[#004699] min-w-0 flex-1">
                <Palette size={16} className="text-[#005FFC] shrink-0" />
                <p className="leading-snug">
                  <strong className="font-bold">Identidad de Marca ahora en sección dedicada:</strong> Las reglas de voz, fotografía, colores, diseño y canales se administran por secciones en <strong className="font-bold">Manual de Marca V4</strong>. Aquí gestionas PDFs y documentos de COFEPRIS, Estudios Clínicos y Realismo Visual.
                </p>
              </div>
              <button
                type="button"
                disabled={isRagBusy}
                onClick={() => {
                  setIsRagModalOpen(false);
                  setMode(AppMode.BRAND_MANUAL);
                  setIsMobileMenuOpen(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white text-xs font-bold shadow-sm transition-colors shrink-0 whitespace-nowrap disabled:opacity-50"
              >
                {t('Ir al Manual de Marca V4 ➔', 'Ir al Manual de Marca V4 ➔')}
              </button>
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
                  {/* Action Buttons */}
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
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#004699] border border-slate-200 hover:border-blue-300 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                    >
                      {isUploadingFile ? <Loader2 size={15} className="animate-spin text-[#005FFC]" /> : <Upload size={15} className="text-[#005FFC]" />}
                      <span>{t('Subir PDF o Documento de Texto', 'Upload PDF or Text Document')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isRagBusy}
                      onClick={() => setIsAddingNewDoc(!isAddingNewDoc)}
                      className="px-3 py-2.5 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    >
                      <Plus size={15} />
                      <span>{t('Nuevo Documento', 'New Document')}</span>
                    </button>
                  </div>

                  {isAddingNewDoc && (
                    <div className="p-3.5 bg-white rounded-xl border border-blue-200 shadow-sm space-y-2.5">
                      <label className="block text-[11px] font-bold text-[#004699]">
                        {t('Nombre del nuevo documento', 'New document name')}
                      </label>
                      <input
                        type="text"
                        disabled={isRagBusy}
                        value={newDocNameInput}
                        onChange={(e) => setNewDocNameInput(e.target.value)}
                        placeholder={t('ej. Lineamientos Promociones', 'e.g. Promo Guidelines')}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005FFC] disabled:opacity-60"
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
                          className="px-3.5 py-1.5 bg-[#005FFC] hover:bg-[#004699] text-white rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                          {t('Crear', 'Create')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Document Cards */}
                  {isLoadingRag ? (
                    <div className="py-12 flex items-center justify-center text-slate-400 text-xs gap-2">
                      <Loader2 size={18} className="animate-spin text-[#005FFC]" />
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
                                ? 'bg-white border-[#005FFC] ring-2 ring-[#005FFC]/15 shadow-sm'
                                : 'bg-white hover:border-slate-300 text-slate-800 border-slate-200/90'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#005FFC]">
                                  {pillar ? pillar.category : getFileExtensionBadge(filename)}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-[#004699] leading-snug">
                                {getFriendlyDocTitle(filename)}
                              </p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {pillar
                                  ? (language === 'es' ? pillar.descEs : pillar.descEn)
                                  : t('Documento adicional de referencia cargado por el equipo', 'Additional reference document uploaded by the team')}
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
                      <h3 className="text-base font-bold text-[#004699]">
                        {getFriendlyDocTitle(selectedDocFilename)}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {CORE_RAG_PILLARS[selectedDocFilename]
                          ? `${t('Documento Oficial', 'Official Document')} • ${CORE_RAG_PILLARS[selectedDocFilename].category}`
                          : t('Documento Adicional', 'Additional Document')}{' '}
                        • {(ragDocs[selectedDocFilename] || '').length.toLocaleString()} {t('caracteres', 'characters')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        disabled={isRagBusy}
                        value={ragVersionLabel}
                        onChange={(e) => setRagVersionLabel(e.target.value)}
                        placeholder={t('Nota de versión (opcional)...', 'Version note (optional)...')}
                        className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005FFC] w-56 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={isRagBusy}
                        onClick={handleSaveRagDocs}
                        className="px-4 py-2 bg-[#005FFC] hover:bg-[#004699] text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
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
                    className="flex-1 w-full p-5 bg-slate-50/70 focus:bg-white text-slate-800 text-sm leading-relaxed rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005FFC] resize-none transition-colors disabled:opacity-60"
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
                      <h3 className="text-sm font-bold text-[#004699]">
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
                          <p className="text-sm font-bold text-[#004699] truncate">{sanitizeVersionLabel(ver.label)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatVersionDate(ver)} • {ver.itemCount || Object.keys(ragDocs).length} {t('documentos', 'documents')}
                            {(ver as any).updatedBy ? ` • ${(ver as any).updatedBy}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isRagBusy}
                          onClick={() => handleRestoreRagVersion(ver.versionId)}
                          className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-[#005FFC] text-[#005FFC] hover:text-white text-xs font-bold transition-colors shrink-0 disabled:opacity-50"
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
                <div className="p-2 bg-[#005FFC]/10 rounded-lg text-[#005FFC]">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#004699]">{t('Contexto de la Empresa', 'Company Context')}</h2>
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005FFC] focus:border-transparent transition-all outline-none font-medium text-gray-900 disabled:opacity-60"
                  placeholder={t('ej. Laboratorio Médico del Chopo', 'e.g. Laboratorio Médico del Chopo')}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{t('Descripción / Contexto de la Empresa', 'Company Description / Context')}</label>
                <textarea 
                  disabled={isSettingsBusy}
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#005FFC] focus:border-transparent transition-all outline-none font-medium text-gray-900 resize-none disabled:opacity-60"
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
                className="mr-auto px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-[#005FFC] transition-colors flex items-center gap-1 disabled:opacity-50"
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
                className="px-6 py-2.5 bg-[#005FFC] hover:bg-[#004699] text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
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
        className="fixed bottom-5 right-5 z-40 px-4 py-2.5 rounded-full bg-[#004699] hover:bg-[#005FFC] text-white shadow-xl border border-white/20 flex items-center gap-2 text-xs font-bold transition-all hover:scale-[1.02]"
        title={t('Abrir guía paso a paso de esta sección', 'Open step-by-step guide for this section')}
      >
        <span className="w-2 h-2 rounded-full bg-[#63CF00]" />
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
