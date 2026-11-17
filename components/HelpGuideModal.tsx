import React, { useState, useEffect } from 'react';
import { AppMode } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  HelpCircle,
  Sparkles,
  Users,
  UserPlus,
  FileText,
  MessageSquare,
  BookOpen,
  Search,
  CheckCircle2,
  ArrowRight,
  Mail,
  Image,
  ShoppingCart,
  Sliders,
  History,
  Upload,
  ShieldCheck,
  Zap,
  RotateCcw,
  Edit2,
  BarChart2
} from 'lucide-react';

export type HelpGuideTabId =
  | 'quick_flow'
  | 'audiences'
  | 'synthetic_users'
  | 'marketing_brief'
  | 'focus_group'
  | 'rag_kb'
  | 'faq';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: AppMode;
  onNavigateMode: (mode: AppMode) => void;
  onOpenRagModal: () => void;
}

export const mapAppModeToHelpTab = (mode: AppMode): HelpGuideTabId => {
  switch (mode) {
    case AppMode.AUDIENCE_GEN:
      return 'audiences';
    case AppMode.SYNTHETIC_USERS:
      return 'synthetic_users';
    case AppMode.MARKETING_BRIEF:
      return 'marketing_brief';
    case AppMode.SYNTHETIC_FOCUS_GROUP:
      return 'focus_group';
    case AppMode.HOME:
    default:
      return 'quick_flow';
  }
};

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onNavigateMode,
  onOpenRagModal
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<HelpGuideTabId>('quick_flow');
  const [faqQuery, setFaqQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(mapAppModeToHelpTab(currentMode));
    }
  }, [isOpen, currentMode]);

  if (!isOpen) return null;

  const tabs: { id: HelpGuideTabId; label: string; badge?: string; icon: React.FC<any> }[] = [
    {
      id: 'quick_flow',
      label: t('Flujo Rápido (4 Pasos)', 'Quick Flow (4 Steps)'),
      badge: t('Inicio', 'Start'),
      icon: Sparkles
    },
    {
      id: 'audiences',
      label: t('1. Audiencias', '1. Audiences'),
      icon: Users
    },
    {
      id: 'synthetic_users',
      label: t('2. Usuarios Sintéticos', '2. Synthetic Users'),
      icon: UserPlus
    },
    {
      id: 'marketing_brief',
      label: t('3. Brief de Marketing', '3. Marketing Brief'),
      icon: FileText
    },
    {
      id: 'focus_group',
      label: t('4. Focus Group', '4. Focus Group'),
      icon: MessageSquare
    },
    {
      id: 'rag_kb',
      label: t('5. Base de Conocimiento (COFEPRIS y Marca)', '5. Knowledge Base (COFEPRIS & Brand)'),
      icon: BookOpen
    },
    {
      id: 'faq',
      label: t('Dudas Frecuentes / Buscador', 'FAQs & Quick Search'),
      icon: Search
    }
  ];

  const faqItems = [
    {
      id: 'faq_banner_agency',
      chip: t('¿Probar banner sin Brief?', 'Test banner without Brief?'),
      question: t(
        '¿Cómo pruebo una imagen o banner de mi agencia sin tener que generar un Brief de Marketing?',
        'How do I test an agency banner or image without generating a Marketing Brief first?'
      ),
      answer: t(
        'Ve a Focus Group ➔ pestaña "Imagen / Banner". En el panel izquierdo verás la tarjeta "Subir Imagen / Banner Propio". Haz clic en "Seleccionar Imagen (PNG, JPG, WEBP)", escribe opcionalmente el titular o copy que acompaña la pieza y presiona "Evaluar Materiales". Tus usuarios sintéticos calificarán el impacto visual, claridad en 3 segundos y apego a marca Chopo.',
        'Go to Focus Group ➔ "Image / Banner" tab. On the left panel you will see the "Upload Custom Creative / Banner" card. Click "Select Image (PNG, JPG, WEBP)", optionally enter the headline or companion copy, and click "Evaluate Assets".'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_single_audience',
      chip: t('¿Por qué veo 1 audiencia en Focus Group?', 'Why 1 audience in Focus Group?'),
      question: t(
        '¿Por qué en el Focus Group solo aparece 1 audiencia (o ciertas audiencias) en "Contexto de Audiencias"?',
        'Why does Focus Group only display 1 audience (or specific audiences) under "Audience Context"?'
      ),
      answer: t(
        'El Focus Group está sincronizado directamente con el módulo "Usuarios Sintéticos". Si en "Usuarios Sintéticos" seleccionaste 1 audiencia y generaste 5 participantes, el Focus Group mostrará exactamente esa audiencia y evaluará tus estímulos con esos 5 usuarios. Para incluir más audiencias o cambiar el tamaño de la muestra (1 a 15 por segmento), ve a "Usuarios Sintéticos", marca las audiencias deseadas y haz clic en "Generar Usuarios".',
        'Focus Group is directly synchronized with the "Synthetic Users" module. To include more audiences or change sample size (1 to 15 per segment), go to "Synthetic Users", check the desired audiences, and click "Generate Users".'
      ),
      relatedTab: 'synthetic_users' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_USERS
    },
    {
      id: 'faq_email_banner',
      chip: t('¿Subir imagen a un Email?', 'Upload image to Email?'),
      question: t(
        '¿Cómo subo o cambio la imagen de un correo electrónico (Email tipo Banner Visual)?',
        'How do I upload or change the banner image in an Email campaign?'
      ),
      answer: t(
        'Puedes hacerlo en dos lugares: (1) En "Brief de Marketing" (Paso 2 ➔ pestaña Email), haciendo clic en el botón "Subir / Cambiar Imagen" en la esquina superior derecha del banner; o (2) En "Focus Group" ➔ pestaña "Email", haciendo clic en "Imagen / Editar" sobre cualquier correo o en "Crear/Editar Emails". Ahí podrás subir una imagen desde tu computadora, editar el titular corto no invasivo sobre la imagen y ajustar el mensaje de 2 a 3 líneas.',
        'You can do this in two places: (1) In "Marketing Brief" (Step 2 ➔ Email tab) by clicking "Upload / Change Image" on the banner; or (2) In "Focus Group" ➔ "Email" tab by clicking "Image / Edit" on any queued email.'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_study_modality',
      chip: t('¿Sucursal vs. Domicilio?', 'Branch vs. Home Service?'),
      question: t(
        '¿Cómo configuro si un estudio está disponible en Sucursal y Domicilio, solo en Sucursal o solo a Domicilio?',
        'How do I configure whether a study is available at Branch & Home, Branch Only, or Home Draw Only?'
      ),
      answer: t(
        'En Focus Group ➔ pestaña "Compra de Estudios", haz clic en el botón "Configurar Estudios" (arriba a la derecha). En la ventana modal podrás cambiar con un selector desplegable la modalidad de cada estudio ("Disponible en Sucursal y Domicilio", "Disponible solo en Sucursal" para estudios de gabinete/imagen como Mastografía o Rayos X, o "Disponible solo a Domicilio"), además de editar su nombre o agregar nuevos estudios.',
        'In Focus Group ➔ "Study Purchase" tab, click "Configure Studies" (top right). You can change each study\'s modality dropdown, edit its title, or add new studies.'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_rag_pdf',
      chip: t('¿Subir PDF de COFEPRIS?', 'Upload COFEPRIS PDF?'),
      question: t(
        '¿Cómo agrego un documento PDF de COFEPRIS, manual de marca o ficha médica a la Base de Conocimiento (COFEPRIS y Marca)?',
        'How do I upload a COFEPRIS PDF, brand manual, or medical sheet to the Knowledge Base (COFEPRIS & Brand)?'
      ),
      answer: t(
        'Haz clic en el botón "Base de Conocimiento (COFEPRIS y Marca)" en la parte inferior del menú izquierdo. En la ventana que se abre, haz clic en "Subir PDF / TXT / MD". El sistema extraerá automáticamente el texto del PDF, guardará el archivo original en Cloud Storage, creará una versión en el Historial y lo inyectará de inmediato en la generación de Briefs y evaluaciones del Focus Group.',
        'Click "Knowledge Base (COFEPRIS & Brand)" at the bottom of the left sidebar, then click "Upload PDF / TXT / MD". The system automatically extracts PDF text, stores the file in Cloud Storage, versions it, and injects it into Briefs and Focus Groups.'
      ),
      relatedTab: 'rag_kb' as HelpGuideTabId
    },
    {
      id: 'faq_persistence',
      chip: t('¿Se borran mis cambios al recargar (F5)?', 'Are edits lost on refresh (F5)?'),
      question: t(
        '¿Se borran mis promociones, mensajes clave, correos o estudios personalizados si recargo la página (F5) o cambio de pestaña?',
        'Are my custom promotions, key messages, emails, or studies lost if I refresh the page (F5) or switch tabs?'
      ),
      answer: t(
        'No. Todas tus listas de trabajo en el Focus Group (Promociones, Mensajes Clave, Correos con Banner y Estudios) se guardan automáticamente en la sesión de tu navegador y en el servidor. Solo se reemplazarán si generas un Brief de Marketing completamente nuevo o si haces clic manualmente en el botón "Traer datos del último Brief".',
        'No. All working lists in Focus Group are automatically persisted in your browser session and server. They are only replaced if you generate a brand-new Marketing Brief or manually click "Load from latest Brief".'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_history_restore',
      chip: t('¿Cómo funciona el Historial?', 'How does History work?'),
      question: t(
        '¿Cómo consulto una simulación anterior y sé a qué pestaña o estudio pertenece?',
        'How do I inspect a previous simulation run and know which tab or study it belongs to?'
      ),
      answer: t(
        'En la esquina superior derecha del Focus Group, abre el menú "Historial". Cada corrida muestra una etiqueta de color con su categoría ("Promociones", "Brief / Email / Estudios", "Imagen / Banner" o "A/B Test"), el nombre del estudio clínico, el número de participantes y la fecha/hora. Al hacer clic en cualquier registro, el sistema te lleva automáticamente a esa pestaña y restaura tanto los resultados como las promociones, correos y mensajes exactos que se evaluaron en esa corrida.',
        'Open the "History" dropdown at the top right of Focus Group. Each entry displays a color-coded category badge, study name, participant count, and timestamp. Clicking an entry automatically switches to that tab and restores both the results and the exact stimuli tested.'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    }
  ];

  const filteredFaqs = faqItems.filter(item => {
    if (!faqQuery.trim()) return true;
    const q = faqQuery.toLowerCase();
    return (
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.chip.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Top Brand Accent Bar */}
        <div className="w-full h-1.5 bg-gradient-to-r from-[#0066FF] via-[#003B7A] to-[#78D600]" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#0066FF] shrink-0 shadow-sm">
              <HelpCircle size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[#003B7A]">
                  {t('Centro de Ayuda y Guía Interactiva Chopo', 'Chopo Interactive Help & Onboarding Guide')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0066FF] border border-blue-200 text-[11px] font-bold">
                  {t('Manual Paso a Paso', 'Step-by-Step Guide')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'Conoce cómo aprovechar cada módulo, botón y herramienta del Intelligence Hub de Laboratorios Chopo.',
                  'Learn how to use every module, button, and tool in the Laboratorios Chopo Intelligence Hub.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title={t('Cerrar guía', 'Close guide')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Layout: Left Navigation + Right Content */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left Sidebar Tabs */}
          <div className="w-full md:w-64 bg-[#F8FAFC] border-b md:border-b-0 md:border-r border-slate-200 p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left shrink-0 ${
                    isSelected
                      ? 'bg-[#0066FF] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-[#003B7A]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} className={isSelected ? 'text-white shrink-0' : 'text-[#0066FF] shrink-0'} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#EFF6FF] text-[#0066FF]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Scrollable Guide Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white custom-scrollbar">
            {/* TAB 0: FLUJO RÁPIDO (4 PASOS) */}
            {activeTab === 'quick_flow' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Recorrido Recomendado', 'Recommended Workflow')}
                    </span>
                    <h3 className="text-lg font-bold text-[#003B7A] mt-0.5">
                      {t('¿Cómo funciona el flujo completo en 4 pasos?', 'How does the complete 4-step workflow work?')}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {t(
                        'Puedes seguir el flujo lineal completo desde la definición de audiencias hasta el Focus Group, o entrar directo a cualquier módulo según tu necesidad del día.',
                        'You can follow the complete linear flow from audiences to Focus Group, or jump straight into any module as needed.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Paso 1 */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#0066FF]/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#0066FF] text-white text-xs font-bold">
                          {t('Paso 1', 'Step 1')}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase">B2C & B2B</span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <Users size={18} className="text-[#0066FF]" />
                        {t('Audiencias (Segmentos Base)', 'Audiences (Base Segments)')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {t(
                          'Consulta los 5 arquetipos clínicos semilla de Chopo (Pacientes B2C y Médicos Prescriptores B2B), edita sus puntos de dolor o genera nuevos segmentos con IA.',
                          'Review Chopo’s 5 clinical seed archetypes (B2C Patients and B2B Prescribing Physicians), edit pain points, or generate new AI segments.'
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('audiences')}
                        className="text-xs font-bold text-slate-500 hover:text-[#003B7A]"
                      >
                        {t('Ver detalle de pantalla', 'View screen details')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.AUDIENCE_GEN);
                          onClose();
                        }}
                        className="text-xs font-bold text-[#0066FF] hover:underline flex items-center gap-1"
                      >
                        {t('Ir a Audiencias', 'Go to Audiences')} <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Paso 2 */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#0066FF]/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#0066FF] text-white text-xs font-bold">
                          {t('Paso 2', 'Step 2')}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {t('Sincroniza con Focus Group', 'Syncs with Focus Group')}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <UserPlus size={18} className="text-[#0066FF]" />
                        {t('Usuarios Sintéticos (Muestra Activa)', 'Synthetic Users (Active Cohort)')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {t(
                          'Marca qué audiencia(s) quieres evaluar hoy y genera de 1 a 15 participantes individuales con edades, ciudades y psicografía propia para tu Focus Group.',
                          'Check which audience(s) you want to test today and generate 1 to 15 individual participants with unique ages, cities, and psychographics.'
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('synthetic_users')}
                        className="text-xs font-bold text-slate-500 hover:text-[#003B7A]"
                      >
                        {t('Ver detalle de pantalla', 'View screen details')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.SYNTHETIC_USERS);
                          onClose();
                        }}
                        className="text-xs font-bold text-[#0066FF] hover:underline flex items-center gap-1"
                      >
                        {t('Ir a Usuarios Sintéticos', 'Go to Synthetic Users')} <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Paso 3 */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#0066FF]/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#0066FF] text-white text-xs font-bold">
                          {t('Paso 3', 'Step 3')}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase">COFEPRIS & Marca</span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <FileText size={18} className="text-[#0066FF]" />
                        {t('Brief de Marketing y Materiales IA', 'Marketing Brief & AI Assets')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {t(
                          'Selecciona el estudio clínico (Check-up Diabetes, Mastografía, Rayos X, etc.), escribe tu objetivo creativo y genera el Brief + artes para Redes, Buscador, Email con Banner Visual, YouTube y Web.',
                          'Select the clinical study, write your creative goal, and generate the Brief + multi-channel assets including Visual Banner Emails.'
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('marketing_brief')}
                        className="text-xs font-bold text-slate-500 hover:text-[#003B7A]"
                      >
                        {t('Ver detalle de pantalla', 'View screen details')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.MARKETING_BRIEF);
                          onClose();
                        }}
                        className="text-xs font-bold text-[#0066FF] hover:underline flex items-center gap-1"
                      >
                        {t('Ir a Brief de Marketing', 'Go to Marketing Brief')} <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Paso 4 */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#0066FF]/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#0066FF] text-white text-xs font-bold">
                          {t('Paso 4', 'Step 4')}
                        </span>
                        <span className="text-[11px] font-bold text-[#003B7A] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {t('7 Herramientas de Prueba', '7 Testing Tools')}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <MessageSquare size={18} className="text-[#0066FF]" />
                        {t('Focus Group Sintético', 'Synthetic Focus Group')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {t(
                          'Evalúa Promociones, Mensajes del Brief, Correos con Banner Visual, Compra de Estudios (Sucursal/Domicilio), Imágenes propias o A/B Tests con tus usuarios sintéticos.',
                          'Test Promotions, Brief Messages, Visual Banner Emails, Study Purchases (Branch/Home), Custom Images, or A/B Tests with your synthetic users.'
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('focus_group')}
                        className="text-xs font-bold text-slate-500 hover:text-[#003B7A]"
                      >
                        {t('Ver las 7 pestañas', 'View all 7 tabs')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.SYNTHETIC_FOCUS_GROUP);
                          onClose();
                        }}
                        className="text-xs font-bold text-[#0066FF] hover:underline flex items-center gap-1"
                      >
                        {t('Ir a Focus Group', 'Go to Focus Group')} <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: AUDIENCIAS */}
            {activeTab === 'audiences' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo 1', 'Module 1')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('Audiencias: Catálogo Directo y Creador por Prompt con IA (B2C y B2B)', 'Audiences: Direct Catalog & AI Prompt Creator (B2C & B2B)')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateMode(AppMode.AUDIENCE_GEN);
                      onClose();
                    }}
                    className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    {t('Abrir Módulo de Audiencias', 'Open Audiences Module')} <ArrowRight size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. {t('Catálogo Directo de Perfiles Base (Pacientes B2C y Médicos B2B)', 'Direct Base Persona Catalog (B2C Patients & B2B Physicians)')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Desde el primer segundo que entras a Audiencias verás las tarjetas de los 5 perfiles base oficiales de Laboratorios Chopo (Pacientes B2C y Médicos Prescriptores B2B) sin tablas intermedias de CRM. Puedes filtrarlos por "Todos los Perfiles", "🏥 Pacientes B2C" o "🩺 Médicos B2B".',
                        'From the moment you open Audiences, you see Chopo’s 5 official base profiles (B2C Patients and B2B Prescribing Physicians) with track filters for All, B2C Patients, and B2B Physicians.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]/60">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. {t('✨ Crear Nuevo Perfil de Audiencia con IA (Prompt Directo)', '✨ Create New Audience Profile with AI (Direct Prompt)')}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {t(
                        'En la tarjeta superior elige la pista ("🏥 Paciente B2C" o "🩺 Médico Prescriptor B2B"), selecciona uno de los chips de ejemplos rápidos (ej. "Médico general recién egresado que acaba de terminar su servicio social" o "Mujer embarazada primeriza buscando ultrasonido prenatal") o escribe cualquier descripción libre, y haz clic en "+ Generar y Agregar Audiencia". La IA construirá el perfil clínico completo con su retrato y lo agregará al inicio de tu catálogo sin borrar los perfiles existentes.',
                        'Select the track ("🏥 B2C Patient" or "🩺 B2B Prescribing Physician"), click a quick example chip or write a custom description, and click "+ Generate & Add Audience" to add the new profile to the top of your catalog without overwriting existing profiles.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. {t('Edición, Historial con Rollback y Salto Directo a Usuarios Sintéticos', 'Editing, Version Rollback & Direct Jump to Synthetic Users')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'En cada tarjeta puedes hacer clic en "✏️ Editar Perfil", "🗑️ Eliminar" o en "👥 Crear Usuarios Sintéticos de este Perfil ➔" para saltar directo al módulo de Usuarios Sintéticos con ese perfil preseleccionado. Además, con "📜 Historial / Versiones" y "↺ Restaurar Perfiles Base" puedes recuperar cualquier versión anterior en 1 clic.',
                        'Each card includes "✏️ Edit Profile", "🗑️ Delete", and "👥 Create Synthetic Users for this Profile ➔" to jump straight to Synthetic Users with that profile preselected, plus "📜 History / Versions" and "↺ Restore Base Profiles".'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USUARIOS SINTÉTICOS */}
            {activeTab === 'synthetic_users' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo 2', 'Module 2')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('Usuarios Sintéticos: Selección y Generación de Participantes', 'Synthetic Users: Cohort Selection & Generation')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateMode(AppMode.SYNTHETIC_USERS);
                      onClose();
                    }}
                    className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    {t('Abrir Usuarios Sintéticos', 'Open Synthetic Users')} <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                  <strong className="font-bold block mb-1">
                    {t('💡 Diferencia clave entre "Audiencias" y "Usuarios Sintéticos":', '💡 Key difference between "Audiences" and "Synthetic Users":')}
                  </strong>
                  {t(
                    '"Audiencias" define los segmentos generales (el molde). En cambio, "Usuarios Sintéticos" genera a las personas individuales (con nombre propio, edad exacta, profesión, huella digital y fricciones cotidianas) que participarán en tus Focus Groups y entrevistas.',
                    '"Audiences" defines the macro segments. "Synthetic Users" generates the individual people (with specific names, ages, jobs, digital footprints, and daily friction) who participate in your Focus Groups.'
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. {t('Selecciona qué Audiencia(s) quieres evaluar hoy', 'Select Which Audience(s) to Test Today')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Haz clic en las tarjetas de audiencia para marcarlas o desmarcarlas. Las audiencias que selecciones aquí serán exactamente las que aparecerán en la barra "Contexto de Audiencias" dentro del Focus Group.',
                        'Click audience cards to check or uncheck them. The audiences selected here are the exact ones displayed in Focus Group.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. {t('Elige la Cantidad por Audiencia (1 a 15 usuarios)', 'Choose Count per Audience (1 to 15 users)')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Selecciona cuántos usuarios sintéticos deseas generar por cada audiencia marcada (por ejemplo, 5 usuarios de 1 audiencia = 5 participantes en total) y presiona "Generar Usuarios".',
                        'Select how many synthetic users to generate per checked audience (e.g., 5 users for 1 audience = 5 total participants) and click "Generate Users".'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. {t('Inspección Psicográfica Profunda', 'Deep Psychographic Inspection')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Cada tarjeta generada incluye Estilo Cognitivo (señal de confianza principal), Fricción de Estilo de Vida, Huella Digital (últimas 3 búsquedas en Google y detonante de baja) y Psicografía.',
                        'Each generated card includes Cognitive Style, Lifestyle Friction, Digital Footprint (last 3 search queries), and Psychographic Flavor.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BRIEF DE MARKETING */}
            {activeTab === 'marketing_brief' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo 3', 'Module 3')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('Brief de Marketing y Materiales Multicanal', 'Marketing Brief & Multi-Channel Creative Preview')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateMode(AppMode.MARKETING_BRIEF);
                      onClose();
                    }}
                    className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    {t('Abrir Brief de Marketing', 'Open Marketing Brief')} <ArrowRight size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. {t('Contexto Institucional y Objetivo de la Campaña (Prioridad Máxima)', 'Institutional Context & Campaign Goal (Highest Priority)')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Lo que escribas en "Objetivo de la Campaña" se envía al pie de la letra tanto al generador del Brief como al diseñador de materiales creativos. Si pides un tono emocional específico, una promoción puntual o un enfoque para mujeres jóvenes, la IA lo respetará en todos los canales sin inventar duraciones fijas (como "8 semanas") que no hayas solicitado.',
                        'Whatever you write in "Campaign Goal" is passed verbatim with highest priority to both the Brief generator and the multi-channel asset designer.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. {t('Selección de Estudio Clínico y Botón "Administrar Estudios Clínicos"', 'Clinical Study Selection & "Manage Clinical Studies" Button')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Al elegir una pastilla de estudio (ej. Check-up Control Diabetes, Mastografía Digital + Ultrasonido, Rayos X de Tórax), el sistema inyecta automáticamente qué estudios incluye, las indicaciones de preparación y ayuno, las reglas de realismo médico y los permisos COFEPRIS. Con el botón "Administrar Estudios Clínicos" puedes editar o agregar nuevos estudios y restaurar versiones.',
                        'Selecting a study pill automatically injects included studies, fasting preparation instructions, medical realism rules, and COFEPRIS permits.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. {t('Audiencias Objetivo Vinculadas', 'Linked Target Audiences')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Marca o desmarca las audiencias para las cuales deseas generar materiales creativos personalizados, o haz clic en "Ver más información" para consultar su ficha completa.',
                        'Check or uncheck the audiences you want to generate tailored creative assets for, or click "View details" to inspect their full profile.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1 flex items-center gap-2">
                      <Mail size={16} className="text-[#0066FF]" />
                      4. {t('Vista Previa Creativa (Sección 9): Social, Buscador, Email tipo Banner, YouTube y Web', 'Creative Preview (Section 9): Social, Search, Visual Banner Email, YouTube & Web')}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {t(
                        'En el Paso 2 del Brief puedes alternar entre cada audiencia y revisar los materiales en 5 canales. En la pestaña "Email", el correo se presenta en formato de Banner Visual (imagen con titular corto no invasivo + mensaje conciso de 2 a 3 líneas + botón CTA + pie legal COFEPRIS), e incluye el botón "Subir / Cambiar Imagen" para reemplazar la imagen del correo al instante.',
                        'In Step 2 of the Brief you can switch across audiences and preview 5 channels. In the "Email" tab, emails are rendered as Visual Banner Emails and include an "Upload / Change Image" button.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FOCUS GROUP */}
            {activeTab === 'focus_group' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo 4', 'Module 4')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('Focus Group Sintético: Controles Superiores y las 7 Pestañas', 'Synthetic Focus Group: Top Controls & All 7 Tabs')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateMode(AppMode.SYNTHETIC_FOCUS_GROUP);
                      onClose();
                    }}
                    className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    {t('Abrir Focus Group', 'Open Focus Group')} <ArrowRight size={14} />
                  </button>
                </div>

                {/* Controles Superiores */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    {t('Controles Superiores del Focus Group', 'Top Bar Controls in Focus Group')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <Users size={15} className="text-[#0066FF]" />
                        {t('Contexto de Audiencias y "Usuarios Evaluados"', 'Audience Context & "Evaluated Users"')}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t(
                          'Muestra la(s) audiencia(s) sincronizadas desde "Usuarios Sintéticos". Haz clic en la pastilla azul "Usuarios Evaluados: N" para ver la lista completa de participantes individuales.',
                          'Displays the audience(s) synced from "Synthetic Users". Click the blue "Evaluated Users: N" pill to inspect all active participants.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <Sliders size={15} className="text-[#0066FF]" />
                        {t('Criterios de Evaluación (Rúbricas)', 'Evaluation Criteria (Rubrics)')}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t(
                          'Abre el editor de rúbricas ponderadas (Claridad en 3 seg, Confianza Visual, Facilidad Digital, Rigor Clínico) para ajustar sus pesos (%) y anclas de calificación 0-100.',
                          'Opens the weighted rubric editor to customize weights (%) and 0-100 scoring anchors.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <RotateCcw size={15} className="text-[#0066FF]" />
                        {t('Botón "Traer datos del último Brief"', '"Load from latest Brief" Button')}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t(
                          'Importa automáticamente las promociones, mensajes clave, correos con banner y estudios del último Brief de Marketing generado. Tus ediciones manuales se conservan al recargar la página (F5).',
                          'Imports promotions, key messages, visual banner emails, and studies from the latest Marketing Brief. Your manual edits persist across page refreshes (F5).'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <History size={15} className="text-[#0066FF]" />
                        {t('Menú "Historial" Inteligente', 'Smart "History" Dropdown')}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t(
                          'Cada ejecución guardada muestra una etiqueta por categoría (Promociones, Brief / Email / Estudios, Imagen / Banner, A/B Test). Al seleccionarla, restaura los resultados y los estímulos exactos de esa corrida.',
                          'Each saved run displays a category badge and restores both the results and the exact stimuli evaluated in that run.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Las 7 Pestañas */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    {t('Las 7 Pestañas de Evaluación en Focus Group', 'The 7 Evaluation Tabs in Focus Group')}
                  </h4>
                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#0066FF] text-xs font-bold shrink-0 mt-0.5">1. Chat</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Conversa en vivo con un perfil individual o con todo el Focus Group al mismo tiempo. Ideal para hacer preguntas abiertas sobre precios, miedos al estudio o recordación de marca.',
                          'Chat live with an individual persona or the entire Focus Group simultaneously for open-ended qualitative questions.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#0066FF] text-xs font-bold shrink-0 mt-0.5">{t('2. Mensajes Clave', '2. Key Messages')}</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Evalúa el Nivel de Interés, Claridad y Relevancia Clínica de tus "Mensajes Clave de Campaña". Puedes editar cualquier mensaje, eliminar los que no necesites o agregar nuevos con Enter.',
                          'Evaluates Interest, Clarity, and Clinical Relevance of your Key Marketing Messages. Edit inline, delete, or add new messages.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0 mt-0.5">3. Promociones</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Mide la Conversión Estimada, Valor Percibido, Oferta Ganadora y barreras de tus promociones. Incluye edición inline (lápiz), eliminación y botón "+ Agregar".',
                          'Measures Estimated Conversion, Perceived Value, Winning Offer, and barriers across your promotional offers.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-blue-200 bg-[#EFF6FF]/60 flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#0066FF] text-white text-xs font-bold shrink-0 mt-0.5">4. Email</span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {t(
                          'Evalúa correos en formato de Banner Visual (imagen con titular corto no invasivo + texto conciso de 2 a 3 líneas). En cada tarjeta puedes hacer clic en "Imagen / Editar" para subir tu propia imagen de banner, cambiar el titular sobre la imagen y ver la Tasa de Apertura, CTR y comentario individual de cada perfil.',
                          'Evaluates Visual Banner Emails (banner image with non-invasive headline + concise 2-3 line copy). Upload custom banner images and view Open Rate, CTR, and persona-specific feedback.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#0066FF] text-xs font-bold shrink-0 mt-0.5">5. Compra de Estudios</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Simula qué estudios agendaría cada participante y por qué. Con el botón "Configurar Estudios" puedes definir si cada estudio está Disponible en Sucursal y Domicilio, Disponible solo en Sucursal (ej. Mastografía, Rayos X) o Disponible solo a Domicilio.',
                          'Simulates which studies each participant would book and lets you configure Branch & Home, Branch Only, or Home Draw Only modality.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold shrink-0 mt-0.5">6. Imagen / Banner</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Evalúa los artes generados en el Brief o sube cualquier imagen/banner propio desde tu computadora (sin requerir Brief previo) bajo las rúbricas de impacto visual, apego a marca y detención de scroll.',
                          'Evaluate Brief creatives or upload any custom image/banner from your computer without needing a prior Brief.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold shrink-0 mt-0.5">7. A/B Test</span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Genera y compara 5 variantes visuales estratégicas para descubrir qué composición fotográfica y enfoque creativo obtiene el mayor puntaje con tu audiencia.',
                          'Generates and compares 5 strategic visual variants to identify the winning creative direction.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: BASE DE CONOCIMIENTO (COFEPRIS Y MARCA) */}
            {activeTab === 'rag_kb' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo Transversal', 'Cross-Cutting Module')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('Base de Conocimiento (COFEPRIS y Marca)', 'Knowledge Base (COFEPRIS & Brand)')}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRagModal();
                    }}
                    className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    <BookOpen size={14} />
                    {t('Abrir Base de Conocimiento', 'Open Knowledge Base')}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. {t('¿Para qué sirve la Base de Conocimiento?', 'What is the Knowledge Base for?')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Es el cerebro normativo y clínico de la aplicación. Antes de redactar un Brief de Marketing o evaluar una campaña en el Focus Group, la IA consulta estos documentos para garantizar cumplimiento COFEPRIS, precios/vigencias oficiales, preparación clínica exacta (ayuno) y realismo visual médico.',
                        'It is the regulatory and clinical brain of the application, grounding every Marketing Brief and Focus Group evaluation in official COFEPRIS, brand, and clinical rules.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. {t('Subir Archivos (.PDF, .TXT, .MD) y Crear Nuevos Documentos', 'Upload Files (.PDF, .TXT, .MD) & Create New Documents')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Puedes subir manuales o circulares en formato PDF (el sistema extrae automáticamente todo el texto y respalda el archivo en Google Cloud Storage) o crear nuevos documentos normativos con el botón "Nuevo".',
                        'Upload PDF manuals or guidelines (text is automatically extracted and backed up to Google Cloud Storage) or create new documents.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. {t('Edición en Vivo e Historial con Restauración en 1 Clic', 'Live Editing & 1-Click Version Rollback')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Edita cualquier lineamiento directamente en el editor de texto, asigna una etiqueta opcional a tu cambio y presiona "Guardar Cambios". En la pestaña "Historial de Versiones" puedes volver a cualquier punto anterior o restaurar los documentos iniciales por defecto.',
                        'Edit any guideline directly, save with a version label, and use the "Version History" tab to roll back to any snapshot or official defaults.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: DUDAS FRECUENTES / BUSCADOR */}
            {activeTab === 'faq' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                    {t('Respuestas Inmediatas', 'Instant Answers')}
                  </span>
                  <h3 className="text-xl font-bold text-[#003B7A]">
                    {t('Dudas Frecuentes y Buscador de Funciones', 'Frequently Asked Questions & Feature Finder')}
                  </h3>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={faqQuery}
                    onChange={e => setFaqQuery(e.target.value)}
                    placeholder={t(
                      'Escribe una palabra clave (ej. "email", "banner", "pdf", "domicilio", "historial", "audiencia")...',
                      'Type a keyword (e.g. "email", "banner", "pdf", "home", "history", "audience")...'
                    )}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-medium text-[#003B7A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {faqItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFaqQuery(item.chip)}
                      className="px-2.5 py-1 rounded-full bg-[#EFF6FF] hover:bg-blue-100 text-[#0066FF] border border-blue-200 text-[11px] font-bold transition-colors"
                    >
                      {item.chip}
                    </button>
                  ))}
                  {faqQuery && (
                    <button
                      type="button"
                      onClick={() => setFaqQuery('')}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-colors"
                    >
                      {t('Ver todas', 'Show all')}
                    </button>
                  )}
                </div>

                {/* FAQ Cards */}
                <div className="space-y-3">
                  {filteredFaqs.map(item => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2">
                      <h4 className="text-sm font-bold text-[#003B7A]">{item.question}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.answer}</p>
                      <div className="pt-1 flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setActiveTab(item.relatedTab)}
                          className="text-[11px] font-bold text-[#0066FF] hover:underline"
                        >
                          {t('Ver guía de esa sección', 'View section guide')}
                        </button>
                        {item.targetMode && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateMode(item.targetMode!);
                              onClose();
                            }}
                            className="text-[11px] font-bold text-[#003B7A] hover:text-[#0066FF] flex items-center gap-1"
                          >
                            {t('Ir ahora a la pantalla', 'Go to screen now')} <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-[#78D600]" />
            <span>
              {t(
                'Tip: El botón flotante "¿Cómo usar esta sección?" abre siempre la guía de la pantalla donde te encuentres.',
                'Tip: The floating "How to use this section?" button always opens the guide for your current screen.'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0066FF] hover:bg-[#004ECC] text-white text-xs font-bold shadow-sm transition-colors"
          >
            {t('Entendido, cerrar guía', 'Got it, close guide')}
          </button>
        </div>
      </div>
    </div>
  );
};
