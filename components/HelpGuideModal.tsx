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
  ArrowRight,
  Mail,
  History,
  Zap,
  RotateCcw,
  Trash2,
  ClipboardList
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
      label: t('Flujo de Trabajo (4 Pasos)', 'Workflow (4 Steps)'),
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
      label: t('📚 Base de Conocimiento (COFEPRIS y Marca)', '📚 Knowledge Base (COFEPRIS & Brand)'),
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
      id: 'faq_delete_restore_audiences_users',
      chip: t('¿Borrar/vaciar y recuperar perfiles?', 'Clear/delete & restore profiles?'),
      question: t(
        '¿Cómo borro o vacío las audiencias o los usuarios sintéticos para empezar desde cero, y cómo los recupero si borré uno por error?',
        'How do I delete or clear audiences or synthetic users to start from scratch, and how do I recover them if I deleted one by mistake?'
      ),
      answer: t(
        'En "1. Audiencias" puedes borrar un perfil individual con "🗑️ Eliminar" en su tarjeta o limpiar todo el catálogo con "🗑️ Vaciar Todos" para empezar desde cero. Antes de cada eliminación o vaciado, el sistema guarda automáticamente un respaldo en "📜 Historial / Versiones" (donde verás la vista previa "Incluye: ..." con los perfiles exactos que restaurará el botón "Rollback"), o bien puedes presionar "Restaurar Perfiles Base" para volver a los 5 perfiles oficiales de Laboratorios Chopo. En "2. Usuarios Sintéticos" puedes limpiar el lote completo con "🗑️ Vaciar Usuarios Sintéticos" / "🗑️ Borrar Todos", quitar a un participante específico con "🗑️ Eliminar" en su tarjeta, o recuperar la última sesión guardada con "Cargar Último".',
        'In "1. Audiences" you can remove a single profile using "🗑️ Delete" on its card or clear the entire catalog with "🗑️ Clear All" to start clean from scratch. Before any deletion or clear action, the system automatically saves a backup snapshot in "📜 History / Versions" (displaying an "Includes: ..." preview of the exact profiles that "Rollback" will restore), or you can click "Restore Base Profiles" to bring back Laboratorios Chopo’s 5 official base profiles. In "2. Synthetic Users" you can clear the full cohort with "🗑️ Clear Synthetic Users" / "🗑️ Clear All", remove an individual participant using "🗑️ Delete" on their card, or reload the last saved session via "Load Last".'
      ),
      relatedTab: 'audiences' as HelpGuideTabId,
      targetMode: AppMode.AUDIENCE_GEN
    },
    {
      id: 'faq_create_audience_ai',
      chip: t('¿Crear audiencia con IA?', 'Create AI audience?'),
      question: t(
        '¿Cómo creo un nuevo perfil de Paciente B2C o Médico Prescriptor B2B con inteligencia artificial?',
        'How do I create a new B2C Patient or B2B Prescribing Physician profile with AI?'
      ),
      answer: t(
        'Ve a "1. Audiencias" y en la tarjeta superior "✨ Crear Nuevo Perfil de Audiencia con IA" elige el segmento ("🏥 Paciente (B2C)" o "🩺 Médico Prescriptor (B2B)"), haz clic en uno de los 4 chips de ejemplos rápidos o escribe tu propia descripción, y presiona "Generar y Agregar Audiencia". El nuevo perfil limpio se agregará al inicio de tu catálogo con su retrato IA y podrás saltar directo a generar su muestra haciendo clic en "👥 Crear Usuarios Sintéticos de este Perfil ➔".',
        'Go to "1. Audiences" and in the top "✨ Create New Audience Profile with AI" card choose the segment ("🏥 Patient (B2C)" or "🩺 Prescribing Physician (B2B)"), click one of the 4 quick example chips or write a custom description, and click "Generate & Add Audience". The clean profile card is added to the top of your catalog with an AI portrait, and you can jump straight to generating participants via "👥 Create Synthetic Users for this Profile ➔".'
      ),
      relatedTab: 'audiences' as HelpGuideTabId,
      targetMode: AppMode.AUDIENCE_GEN
    },
    {
      id: 'faq_banner_agency',
      chip: t('¿Probar banner sin Brief?', 'Test banner without Brief?'),
      question: t(
        '¿Cómo pruebo una imagen, banner o creatividad de mi agencia sin tener que generar primero un Brief de Marketing?',
        'How do I test an agency banner, image, or creative piece without generating a Marketing Brief first?'
      ),
      answer: t(
        'Desde "Inicio" usa el banner "Atajo Rápido para Agencia / Parrilla" haciendo clic en "Ir Directo al Focus Group ➔", o entra a "4. Focus Group" ➔ pestaña "Imagen / Banner". En la tarjeta "Subir Imagen / Banner Propio", haz clic en "Cargar Imagen / Banner", escribe opcionalmente el "Titular / Encabezado (Opcional)" y el "Copy / Pie de Publicación (Opcional)", y presiona "Evaluar Imagen / Banner". Los participantes evaluarán atractivo visual, afinidad con la marca Chopo, intención de agendar, impacto visual y cada criterio de las rúbricas.',
        'From "Home" use the "Agency / Grid Fast-Track" banner by clicking "Go Straight to Focus Group ➔", or open "4. Focus Group" ➔ "Creative" tab. In the "Upload Custom Creative" card, click "Upload Custom Image", optionally fill in "Custom Headline / Title (Optional)" and "Social Copy / Caption (Optional)", and click "Run Creative Simulation". Participants will score visual appeal, Chopo brand fit, conversion likelihood, visual impact, and every active rubric criterion.'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_single_audience',
      chip: t('¿Participantes en Focus Group?', 'Participants in Focus Group?'),
      question: t(
        '¿Por qué en el Focus Group aparecen ciertas audiencias en "Contexto de Audiencias" y cómo inspecciono a los participantes evaluados?',
        'Why does Focus Group display specific audiences under "Audience Context" and how do I inspect the evaluated participants?'
      ),
      answer: t(
        '"4. Focus Group" está sincronizado directamente con tus audiencias activas de "1. Audiencias" y la muestra creada en "2. Usuarios Sintéticos". Haz clic en el botón "👥 Ver / Inspeccionar Participantes Evaluados (N)" para revisar el perfil detallado de cada participante activo. Para incluir otras audiencias, enriquecer matices con "Contexto Clínico Adicional (Opcional)" o cambiar la cantidad por segmento (1, 2, 3, 5, 10 o 15), ve a "2. Usuarios Sintéticos", filtra por segmento ("Todos", "🏥 Solo Pacientes B2C", "🩺 Solo Médicos B2B"), marca las audiencias deseadas y presiona "Generar Usuarios".',
        '"4. Focus Group" is directly synchronized with your active audiences from "1. Audiences" and the cohort generated in "2. Synthetic Users". Click "👥 View / Inspect Evaluated Participants (N)" inside Focus Group to inspect every active participant. To test other audiences, enrich nuances via "Additional Clinical Context (Optional)", or change the count per segment (1, 2, 3, 5, 10, or 15), go to "2. Synthetic Users", filter by segment ("All", "🏥 B2C Patients Only", "🩺 B2B Physicians Only"), check the desired audiences, and click "Generate Users".'
      ),
      relatedTab: 'synthetic_users' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_USERS
    },
    {
      id: 'faq_email_banner',
      chip: t('¿Subir imagen a un Email?', 'Upload image to Email?'),
      question: t(
        '¿Cómo subo o cambio la imagen de un correo electrónico en formato Banner Visual?',
        'How do I upload or change the banner image in a Visual Banner Email campaign?'
      ),
      answer: t(
        'Puedes hacerlo en dos lugares: (1) En "3. Brief de Marketing" (Sección 9 "Vista Previa Creativa de Campaña" ➔ pestaña "Email"), haciendo clic en el botón "Subir / Cambiar Imagen" en la esquina superior derecha del banner; o (2) En "4. Focus Group" ➔ pestaña "Email", haciendo clic en "Imagen / Editar" sobre cualquier correo o en el botón "Crear/Editar Emails" (donde encontrarás "Subir / Cambiar Imagen del Correo", edición de asunto, cintillo, titular corto no invasivo sobre la imagen y mensaje de 2 a 3 líneas).',
        'You can do this in two places: (1) In "3. Marketing Brief" (Section 9 "Campaign Creative Preview" ➔ "Email" tab) by clicking "Upload / Change Image" at the top-right corner of the banner; or (2) In "4. Focus Group" ➔ "Email" tab by clicking "Image / Edit" on any queued email card or clicking "Create/Edit Emails" (where you can use "Upload / Change Email Image" and customize the subject line, badge subheadline, non-invasive banner headline, and 2–3 line companion copy).'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_study_modality',
      chip: t('¿Sucursal vs. Domicilio?', 'Branch vs. Home Service?'),
      question: t(
        '¿Cómo configuro si un estudio está disponible en Sucursal y Domicilio, Solo Sucursal o Solo Domicilio?',
        'How do I configure whether a study is available at Branch & Home Service, Branch Only, or Home Draw Only?'
      ),
      answer: t(
        'En "4. Focus Group" ➔ pestaña "Compra de Estudios", haz clic en el botón "Crear/Editar Estudios" (arriba a la derecha) o en "Ver Todos / Editar" dentro del catálogo de estudios. En el modal podrás seleccionar la modalidad de atención de cada estudio ("Disponible en Sucursal y Domicilio", "Disponible solo en Sucursal" para estudios de gabinete e imagenología como Mastografía o Rayos X, o "Disponible solo a Domicilio"), editar su nombre/parámetros clínicos o agregar nuevos estudios.',
        'In "4. Focus Group" ➔ "Purchase" tab, click "Create/Edit Products" (top right) or "View All / Edit" on the target studies card. In the modal you can switch each study’s service modality dropdown ("Branch & Home Service", "Branch Only" for imaging/cabinet studies like Mammography or X-Ray, or "Home Draw Only"), edit its title/clinical parameters, or add new studies.'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_chat_suggested',
      chip: t('¿Preguntas sugeridas en Chat?', 'Suggested questions in Chat?'),
      question: t(
        '¿Cómo funcionan las entrevistas cualitativas y los 4 chips de preguntas sugeridas en la pestaña Chat del Focus Group?',
        'How do qualitative interviews and the 4 suggested question chips work in the Focus Group Chat tab?'
      ),
      answer: t(
        'En "4. Focus Group" ➔ pestaña "Chat" encontrarás el "Centro de Entrevistas Cualitativas" con 4 chips de "Preguntas Sugeridas en 1 Clic:" listos para evaluar barreras de agendamiento en línea/WhatsApp, percepción de precio promocional, claridad de indicaciones de ayuno y criterios diagnósticos para médicos B2B. Haz clic en cualquier chip (o escribe tu pregunta) y presiona "Iniciar Entrevista" para obtener respuestas con repreguntas automáticas, sentimiento, cita textual, transcripción completa y hallazgo clave.',
        'In "4. Focus Group" ➔ "Chat" tab you will find the "Qualitative Interview Hub" with 4 "1-Click Suggested Questions:" chips covering online/WhatsApp booking barriers, promo price & branch trust, fasting instruction clarity, and B2B physician diagnostic requirements. Click any chip (or type your own question) and press "Start Interview" to run deep-dive interviews with automated follow-ups, sentiment tags, verbatim quotes, full transcripts, and key insights.'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_kb_pdf',
      chip: t('¿Subir PDF de COFEPRIS?', 'Upload COFEPRIS PDF?'),
      question: t(
        '¿Cómo agrego un documento PDF de COFEPRIS, manual de marca o ficha médica a la Base de Conocimiento (COFEPRIS y Marca)?',
        'How do I upload a COFEPRIS PDF, brand manual, or medical sheet to the Knowledge Base (COFEPRIS & Brand)?'
      ),
      answer: t(
        'Haz clic en el botón "📚 Base de Conocimiento (COFEPRIS y Marca)" en la parte inferior del menú lateral izquierdo. En la pestaña "Documentos Activos", haz clic en "Subir PDF / TXT / MD" (o en "Nuevo Documento" para redactar uno nuevo) y presiona "Guardar Cambios". El sistema extrae automáticamente el texto del PDF, guarda el respaldo en Cloud Storage, crea una versión en "Historial de Versiones" (con restauración en 1 clic o "Restaurar Valores por Defecto") y aplica sus lineamientos al generar Briefs y evaluar campañas en el Focus Group.',
        'Click "📚 Knowledge Base (COFEPRIS & Brand)" at the bottom of the left sidebar. Under "Active Documents", click "Upload PDF / TXT / MD" (or "New Document" to create one from scratch) and click "Save Changes". The system automatically extracts PDF text, stores the file in Cloud Storage, versions it under "Version History" (with 1-click restore or "Restore Default Values"), and applies its rules to Briefs and Focus Groups.'
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
        'No. Todas tus listas de trabajo en "4. Focus Group" ("Mensajes Clave", "Promociones", "Email" con Banner Visual y "Compra de Estudios") se guardan automáticamente en tu navegador y en el servidor. Solo se reemplazarán si generas un Brief completamente nuevo en "3. Brief de Marketing" o si haces clic manualmente en el botón "Traer datos del último Brief".',
        'No. All working lists in "4. Focus Group" ("Key Messages", "Acquisition" promotions, Visual Banner "Email" drafts, and "Purchase" studies) are automatically persisted in your browser and on the server. They are only replaced if you generate a brand-new Marketing Brief or manually click "Load from latest Brief".'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_history_restore',
      chip: t('¿Historial y Criterios de Evaluación?', 'History & Evaluation Criteria?'),
      question: t(
        '¿Cómo consulto una simulación anterior en "Historial" y cómo ajusto los "Criterios de Evaluación" (Rúbricas)?',
        'How do I inspect a previous simulation in "History" and customize or roll back "Evaluation Rubrics"?'
      ),
      answer: t(
        'En la esquina superior derecha de "4. Focus Group" dispones de ambos botones: (1) "📋 Criterios de Evaluación (Rúbricas)" abre el editor de rúbricas ponderadas con pesos (%), anclas 0–100 e historial con Rollback; y (2) "Historial" despliega tus ejecuciones guardadas con etiquetas de color por categoría ("Promociones", "Brief / Email / Estudios", "Imagen / Banner" o "A/B Test"). Al hacer clic en cualquier registro de "Historial", el sistema abre su pestaña correspondiente y restaura tanto los resultados como las promociones, correos, estudios y mensajes exactos evaluados.',
        'At the top right of "4. Focus Group" you have both controls: (1) "📋 Evaluation Rubrics" opens the weighted rubric editor with weights (%), 0–100 anchors, and version Rollback; and (2) "History" lists saved runs with color-coded category badges ("Promotions", "Brief / Email / Studies", "Image / Banner", or "A/B Test"). Clicking any entry automatically switches to that tab and restores both the results and the exact stimuli tested.'
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
                  {t('Centro de Ayuda y Guía Interactiva — Chopo Intelligence Hub', 'Interactive Help & Onboarding Guide — Chopo Intelligence Hub')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#0066FF] border border-blue-200 text-[11px] font-bold">
                  {t('Manual Paso a Paso', 'Step-by-Step Guide')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'Referencia actualizada de la plataforma 100% en español para Laboratorios Chopo: cada módulo numerado, botón, control de limpieza y respaldo del Chopo Intelligence Hub.',
                  'Referencia actualizada de la plataforma 100% en español para Laboratorios Chopo: cada módulo numerado, botón, control de limpieza y respaldo del Chopo Intelligence Hub.'
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
            {/* TAB 0: FLUJO DE TRABAJO (4 PASOS) */}
            {activeTab === 'quick_flow' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-5 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Chopo Intelligence Hub', 'Chopo Intelligence Hub')}
                    </span>
                    <h3 className="text-lg font-bold text-[#003B7A] mt-0.5">
                      {t('Flujo de Trabajo — Chopo Intelligence Hub', 'Chopo Intelligence Hub Workflow')}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {t(
                        'Sigue el menú lateral numerado (1. Audiencias ➔ 2. Usuarios Sintéticos ➔ 3. Brief de Marketing ➔ 4. Focus Group), respaldado transversalmente por 📚 Base de Conocimiento (COFEPRIS y Marca).',
                        'Follow the numbered sidebar menu (1. Audiences ➔ 2. Synthetic Users ➔ 3. Marketing Brief ➔ 4. Focus Group), grounded across every step by 📚 Knowledge Base (COFEPRIS & Brand).'
                      )}
                    </p>
                  </div>
                </div>

                {/* Atajo Rápido para Agencia / Parrilla */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#EFF6FF] via-blue-50 to-emerald-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#0066FF] bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                      <Zap size={12} />
                      {t('Atajo Rápido para Agencia / Parrilla', 'Agency / Grid Fast-Track')}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-[#003B7A] leading-snug">
                      {t(
                        '⚡ ¿Ya tienes un banner, correo o promoción lista de tu agencia? Sáltate el Brief desde el banner de Inicio y evalúalo directo con tus usuarios sintéticos.',
                        '⚡ Already have a ready-made banner, email, or promotion from your agency? Skip the Brief from the Home banner and evaluate it directly with your synthetic users.'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateMode(AppMode.SYNTHETIC_FOCUS_GROUP);
                      onClose();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-sm transition-all shrink-0 whitespace-nowrap"
                  >
                    {t('Ir Directo al Focus Group ➔', 'Go Straight to Focus Group ➔')}
                  </button>
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
                        {t('1. Audiencias', '1. Audiences')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {t(
                          'Consulta los 5 perfiles base oficiales de Chopo, crea nuevos segmentos con "✨ Crear Nuevo Perfil de Audiencia con IA" (+ chips rápidos), o vacía/restaura el catálogo con respaldo automático en "📜 Historial / Versiones".',
                          'Explore Chopo’s 5 official base profiles, create new segments via "✨ Create New Audience Profile with AI" (+ quick chips), or clear/restore the catalog with automatic backup in "📜 History / Versions".'
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
                        {t('Ir a 1. Audiencias', 'Go to 1. Audiences')} <ArrowRight size={13} />
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
                        {t('2. Usuarios Sintéticos', '2. Synthetic Users')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {t(
                          'Muestra tus audiencias activas de "1. Audiencias" con filtros por segmento, cantidad (1, 2, 3, 5, 10, 15), "Contexto Clínico Adicional (Opcional)", borrado individual/total y salto rápido al Paso 3 o Paso 4.',
                          'Displays your active audiences from "1. Audiences" with segment filters, count selector (1, 2, 3, 5, 10, 15), "Additional Clinical Context (Optional)", individual/batch delete, and fast-forward buttons to Step 3 or Step 4.'
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
                        {t('Ir a 2. Usuarios Sintéticos', 'Go to 2. Synthetic Users')} <ArrowRight size={13} />
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
                        {t('3. Brief de Marketing', '3. Marketing Brief')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {t(
                          'Define el Objetivo Estratégico (con contexto institucional compacto en 1 línea), elige el Estudio Clínico de la Parrilla, vincula audiencias y genera Brief + piezas multicanal con Email en formato Banner Visual.',
                          'Set your Strategic Campaign Objective (with compact 1-line institutional context), pick the Clinical Study, link target audiences, and generate the Brief + multi-channel assets including Visual Banner Emails.'
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
                        {t('Ir a 3. Brief de Marketing', 'Go to 3. Marketing Brief')} <ArrowRight size={13} />
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
                          {t('7 Pestañas de Prueba', '7 Testing Tabs')}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <MessageSquare size={18} className="text-[#0066FF]" />
                        {t('4. Focus Group', '4. Focus Group')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {t(
                          'Evalúa tus campañas en 7 pestañas exactas: Chat (con 4 preguntas sugeridas en 1 clic), Mensajes Clave, Promociones, Email, Compra de Estudios, Imagen / Banner y A/B Test.',
                          'Evaluate your campaigns across 7 exact tabs: Chat (with 4 1-click suggested questions), Key Messages, Acquisition, Email, Purchase, Creative (Image / Banner), and A/B Test.'
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
                        {t('Ir a 4. Focus Group', 'Go to 4. Focus Group')} <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: 1. AUDIENCIAS */}
            {activeTab === 'audiences' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo 1', 'Module 1')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('1. Audiencias: Generador con IA y Catálogo Directo (B2C y B2B)', '1. Audiences: AI Generator & Direct Catalog (B2C & B2B)')}
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
                    {t('Abrir 1. Audiencias', 'Open 1. Audiences')} <ArrowRight size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]/60">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. {t('✨ Crear Nuevo Perfil de Audiencia con IA', '✨ Create New Audience Profile with AI')}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {t(
                        'En la tarjeta superior selecciona el segmento exacto ("🏥 Paciente (B2C)" o "🩺 Médico Prescriptor (B2B)"), haz clic en cualquiera de los 4 chips de ejemplos rápidos (médico general recién egresado, oncólogo clínico, mujer embarazada primeriza o adulto joven deportista) o escribe una descripción libre, y presiona "Generar y Agregar Audiencia". La IA construirá el perfil clínico completo con su retrato y lo agregará al inicio de tu catálogo.',
                        'In the top card select the exact segment ("🏥 Patient (B2C)" or "🩺 Prescribing Physician (B2B)"), click any of the 4 quick example chips (newly graduated GP, clinical oncologist, first-time pregnant woman, or young athlete) or write a custom prompt, and click "Generate & Add Audience" to add the complete profile with an AI portrait to the top of your catalog.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1 flex items-center gap-2">
                      <History size={15} className="text-[#0066FF]" />
                      2. {t('Filtros por Segmento, "📜 Historial / Versiones" con Respaldo Automático y "🗑️ Vaciar Todos"', 'Segment Filters, "📜 History / Versions" with Auto-Backup & "🗑️ Clear All"')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'En la barra de controles puedes filtrar por "Todos los Perfiles", "🏥 Pacientes B2C" o "🩺 Médicos B2B", usar "🗑️ Vaciar Todos" para dejar el catálogo limpio desde cero o hacer clic en "Restaurar Perfiles Base" para restablecer los 5 perfiles oficiales de Chopo. Antes de eliminar un perfil o vaciar el catálogo, "📜 Historial / Versiones" guarda un respaldo automático y muestra la vista previa "Incluye: ..." indicando qué perfiles exactos restaurará cada "Rollback".',
                        'Use the control bar to filter by "All Profiles", "🏥 B2C Patients", or "🩺 B2B Physicians", click "🗑️ Clear All" to start a clean catalog from scratch, or click "Restore Base Profiles" to restore Chopo’s 5 official base profiles. Before any delete or clear action, "📜 History / Versions" saves an automatic backup and displays an "Includes: ..." preview showing the exact profiles each "Rollback" will restore.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. {t('Tarjetas Clínicas Limpias y Salto Directo a Usuarios Sintéticos', 'Clean Clinical Cards & Direct Jump to Synthetic Users')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Cada tarjeta presenta de forma limpia el retrato (con botón "Generar Retrato IA" si aún no tiene foto), edad, demografía, contexto clínico, dolores/barreras, motivadores y estudios recomendados. En el pie de cada tarjeta dispones de tres botones exactos: "✏️ Editar Perfil", "🗑️ Eliminar" y "👥 Crear Usuarios Sintéticos de este Perfil ➔" (que abre "2. Usuarios Sintéticos" con ese segmento ya preseleccionado).',
                        'Each clean card displays the persona portrait (with a "Generate AI Portrait" button if needed), age, demographics, clinical context, pain points/barriers, goals, and recommended studies. At the bottom of every card you have three exact actions: "✏️ Edit Profile", "🗑️ Delete", and "👥 Create Synthetic Users for this Profile ➔" (which opens "2. Synthetic Users" with that segment preselected).'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 2. USUARIOS SINTÉTICOS */}
            {activeTab === 'synthetic_users' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo 2', 'Module 2')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('2. Usuarios Sintéticos: Muestra Activa, Contexto Clínico y Limpieza', '2. Synthetic Users: Active Cohort, Clinical Context & Cleanup')}
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
                    {t('Abrir 2. Usuarios Sintéticos', 'Open 2. Synthetic Users')} <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                  <strong className="font-bold block mb-1">
                    {t('💡 Sincronización directa con 1. Audiencias y 4. Focus Group:', '💡 Direct sync with 1. Audiences and 4. Focus Group:')}
                  </strong>
                  {t(
                    'Este módulo muestra exactamente las audiencias activas configuradas en "1. Audiencias" (incluyendo las personalizadas que hayas creado o las que hayas conservado) y genera a las personas individuales que participarán en todas las pruebas del Focus Group.',
                    'This module displays the exact active audiences configured in "1. Audiences" (reflecting any custom additions or deletions) and generates the individual people who participate across all Focus Group evaluations.'
                  )}
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. {t('Filtros por Segmento, Cantidad (1 a 15) y "Contexto Clínico Adicional (Opcional)"', 'Segment Filters, Count (1 to 15) & "Additional Clinical Context (Optional)"')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Filtra los perfiles con "Todos", "🏥 Solo Pacientes B2C" o "🩺 Solo Médicos B2B" (además de "Seleccionar Todos" / "Limpiar Selección"), elige en "Usuarios por Segmento" entre 1, 2, 3, 5, 10 o 15 participantes y redacta en "Contexto Clínico Adicional (Opcional)" cualquier matiz específico (ej. dudas sobre el ayuno o zonas metropolitanas) para enriquecer directamente cada perfil generado al presionar "Generar Usuarios".',
                        'Filter base personas with "All", "🏥 B2C Patients Only", or "🩺 B2B Physicians Only" (plus "Select All" / "Clear Selection"), pick 1, 2, 3, 5, 10, or 15 under "Users to Generate", and enter "Additional Clinical Context (Optional)" to directly enrich the clinical nuances of every generated participant when clicking "Generate Users".'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1 flex items-center gap-2">
                      <Trash2 size={15} className="text-rose-600" />
                      2. {t('Controles de Limpieza Individual y por Lote + Psicografía Profunda', 'Individual & Batch Cleanup Controls + Deep Psychographics')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Puedes vaciar el lote completo en cualquier momento con "🗑️ Vaciar Usuarios Sintéticos" o "🗑️ Borrar Todos", quitar únicamente a un participante específico con el botón "Eliminar" (icono 🗑️) de su tarjeta, o recuperar la corrida previa con "Cargar Último". Cada tarjeta detalla Estilo Cognitivo, Estilo de Vida y Fricción, Huella Digital y Perfil Psicográfico.',
                        'Clear the entire cohort anytime using "🗑️ Clear Synthetic Users" or "🗑️ Clear All", remove a single participant with the "Delete" (🗑️) button on their card, or reload your previous batch via "Load Last". Each card details Cognitive Style, Lifestyle & Friction, Digital Footprint, and Psychographic Flavor.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]/60">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. {t('Botones de Avance Rápido al Terminar', 'Fast-Forward Navigation Buttons')}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {t(
                        'En cuanto tu muestra queda lista puedes avanzar con "Siguiente Paso: 3. Crear Brief de Campaña ➔" para diseñar mensajes y creatividades con IA, o saltar sin escalas con "O ir directo a: 4. Evaluar en Focus Group ➔" si ya cuentas con materiales propios.',
                        'Once your cohort is generated, continue with "Next Step: 3. Create Campaign Brief ➔" to design AI messaging and creatives, or jump straight ahead via "Or jump straight to: 4. Evaluate in Focus Group ➔" if you already have assets to test.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 3. BRIEF DE MARKETING */}
            {activeTab === 'marketing_brief' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo 3', 'Module 3')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('3. Brief de Marketing y Vista Previa Multicanal', '3. Marketing Brief & Multi-Channel Creative Preview')}
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
                    {t('Abrir 3. Brief de Marketing', 'Open 3. Marketing Brief')} <ArrowRight size={14} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. {t('Objetivo Estratégico Protagonista y Contexto Institucional Compacto en 1 Línea', 'Prominent Strategic Objective & Compact 1-Line Institutional Context')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'El Contexto Institucional de Laboratorios Chopo se muestra resumido en 1 sola línea (desplegable cuando quieras con el botón "Editar Contexto Institucional de Laboratorios Chopo"), dando total protagonismo a "1. Objetivo Estratégico de la Campaña / Promoción", el cual se respeta al pie de la letra al redactar tanto el Brief como las piezas creativas.',
                        'Laboratorios Chopo’s Institutional Context is summarized on a single compact line (expandable anytime via "Edit Laboratorios Chopo Institutional Context"), giving center stage to "1. Campaign / Promotion Strategic Objective", which is followed verbatim across both the Brief and creative asset generation.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. {t('2. Selección de Estudio Clínico de la Parrilla y Modal "Administrar Estudios Clínicos"', '2. Clinical Study Selection & "Manage Clinical Studies" Modal')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Al seleccionar un estudio (ej. Check-up Control Diabetes, Hemoglobina Glicosilada HbA1c, Check-up Completo Chopo, Mastografía Digital + Ultrasonido o Rayos X de Tórax Digital), se vinculan automáticamente sus parámetros incluidos, preparación/ayuno, reglas de realismo médico y permisos COFEPRIS. Con "Administrar Estudios Clínicos" puedes crear/editar estudios y usar su pestaña "Historial de Versiones" para hacer Rollback ("Restaurar esta versión" o "Restaurar Valores por Defecto").',
                        'Selecting a clinical study card automatically links its included parameters, fasting/preparation instructions, medical realism rules, and COFEPRIS permits. Click "Manage Clinical Studies" to add or edit studies and use its "Version History" tab to roll back ("Restore this version" or "Restore Default Values").'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. {t('3. Audiencias Objetivo Vinculadas y Generación', '3. Linked Target Audiences & Generation')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Filtra con "Todas", "Solo Pacientes B2C" o "Solo Médicos B2B", marca o desmarca cada tarjeta, consulta su detalle en "Ver más información" y presiona "Generar Brief y Materiales de Campaña" (o recupera una entrega previa con "Cargar Último Brief").',
                        'Filter with "All", "B2C Patients Only", or "B2B Physicians Only", toggle audience cards, inspect details via "More info", and click "Generate Campaign Brief & Assets" (or reload your last saved brief via "Load Last Brief").'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1 flex items-center gap-2">
                      <Mail size={16} className="text-[#0066FF]" />
                      4. {t('Email en Formato Banner Visual y Salto Directo al Focus Group', 'Visual Banner Email Preview & Direct Jump to Focus Group')}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {t(
                        'En la Sección 9 ("Vista Previa Creativa de Campaña") puedes revisar Social, Buscador, Email, YouTube y Sitio Web por cada audiencia. En "Email", el correo se presenta en formato Banner Visual con botón "Subir / Cambiar Imagen" para cargar tu propia imagen al instante, y al finalizar cuentas con el botón "Siguiente Paso: 4. Evaluar esta Campaña en Focus Group ➔".',
                        'In Section 9 ("Campaign Creative Preview") you can preview Social, Search, Email, YouTube, and Website per audience. Under "Email", campaigns render in Visual Banner format with an "Upload / Change Image" button to upload custom artwork, followed by the "Next Step: 4. Evaluate this Campaign in Focus Group ➔" button.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 4. FOCUS GROUP */}
            {activeTab === 'focus_group' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo 4', 'Module 4')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('4. Focus Group: Controles Superiores y las 7 Pestañas Exactas', '4. Focus Group: Top Controls & All 7 Exact Tabs')}
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
                    {t('Abrir 4. Focus Group', 'Open 4. Focus Group')} <ArrowRight size={14} />
                  </button>
                </div>

                {/* Controles Superiores */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    {t('Botones y Controles Clave del Focus Group', 'Key Controls & Buttons in Focus Group')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <Users size={15} className="text-[#0066FF]" />
                        {t('👥 Ver / Inspeccionar Participantes Evaluados (N)', '👥 View / Inspect Evaluated Participants (N)')}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t(
                          'Junto a la barra "Contexto de Audiencias" y en el encabezado de cada herramienta puedes abrir el modal con la ficha completa de los N usuarios sintéticos activos.',
                          'Located in the "Audience Context" bar and tool headers, this button opens the modal listing all N active synthetic participants.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <ClipboardList size={15} className="text-[#0066FF]" />
                        {t('📋 Criterios de Evaluación (Rúbricas)', '📋 Evaluation Rubrics')}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t(
                          'Permite editar pesos (%), preguntas y anclas de calificación 0–100, agregar nuevos criterios y restaurar versiones anteriores con Rollback.',
                          'Customize rubric weights (%), evaluation questions, and 0–100 scoring anchors, add new criteria, and roll back to previous versions.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <RotateCcw size={15} className="text-[#0066FF]" />
                        {t('Traer datos del último Brief', 'Load from latest Brief')}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t(
                          'Importa bajo demanda los mensajes clave, promociones, correos con banner, estudios e imágenes del último Brief de Marketing sin perder tus ediciones al recargar (F5).',
                          'Imports key messages, promotions, visual banner emails, studies, and images from the latest Marketing Brief on demand while keeping manual edits across F5 refreshes.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <History size={15} className="text-[#0066FF]" />
                        {t('Historial', 'History')}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {t(
                          'Muestra tus corridas etiquetadas por categoría ("Promociones", "Brief / Email / Estudios", "Imagen / Banner", "A/B Test") y restaura resultados y estímulos en 1 clic.',
                          'Displays saved runs tagged by category ("Promotions", "Brief / Email / Studies", "Image / Banner", "A/B Test") and restores both results and stimuli in 1 click.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Las 7 Pestañas */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    {t('Las 7 Pestañas de Evaluación en 4. Focus Group', 'The 7 Evaluation Tabs in 4. Focus Group')}
                  </h4>
                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#0066FF] text-xs font-bold shrink-0 mt-0.5">
                        {t('1. Chat', '1. Chat')}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Abre el "Centro de Entrevistas Cualitativas" con 4 chips de "Preguntas Sugeridas en 1 Clic:" y botón "Iniciar Entrevista". Realiza entrevistas profundas con repreguntas automáticas, transcripción completa y hallazgo clave (con "Cargar Última Sesión").',
                          'Opens the "Qualitative Interview Hub" featuring 4 "1-Click Suggested Questions:" chips and "Start Interview" for deep-dive interviews with automated follow-ups, full transcripts, and key researcher insights (plus "Load Last Session").'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#0066FF] text-xs font-bold shrink-0 mt-0.5">
                        {t('2. Mensajes Clave', '2. Key Messages')}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Evalúa el Nivel de Interés, Claridad del Mensaje y Relevancia Clínica de tus "Mensajes Clave de Campaña". Permite editar cualquier mensaje en línea, eliminarlo o usar "+ Agregar" antes de "Ejecutar Simulación".',
                          'Evaluates Interest Score, Clarity Score, and Relevance Score across your "Key Marketing Messages". Edit messages inline, delete them, or click "+ Add" before clicking "Run Simulation".'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0 mt-0.5">
                        {t('3. Promociones', '3. Acquisition')}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Mide la probabilidad de conversión, valor percibido, oferta ganadora y barreras de tus "Promociones y Beneficios de Captación", con edición en línea, borrado y botón "+ Agregar".',
                          'Measures conversion likelihood, perceived value, winning offer, and barriers across your "Acquisition Offers", with inline editing, deletion, and "+ Add".'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-blue-200 bg-[#EFF6FF]/60 flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#0066FF] text-white text-xs font-bold shrink-0 mt-0.5">
                        4. Email
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {t(
                          'Evalúa correos en formato Banner Visual. Con "Crear/Editar Emails", "+ Agregar Correo" o "Imagen / Editar" sobre cada banner puedes abrir el modal editor para "Subir / Cambiar Imagen del Correo", ajustar titular y copy corto, y medir Tasa de Apertura, CTR y reacción por perfil.',
                          'Evaluates Visual Banner Emails. Use "Create/Edit Emails", "+ Add Email", or "Image / Edit" on any banner card to open the modal editor, click "Upload / Change Email Image", refine the overlay headline and short copy, and simulate Open Rate, CTR, and per-persona feedback.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#0066FF] text-xs font-bold shrink-0 mt-0.5">
                        {t('5. Compra de Estudios', '5. Purchase')}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Simula qué estudios agendaría cada perfil y por qué. Con "Crear/Editar Estudios" o "Ver Todos / Editar" configuras la modalidad exacta de cada estudio: "Disponible en Sucursal y Domicilio" (Sucursal y Domicilio), "Disponible solo en Sucursal" (Solo Sucursal) o "Disponible solo a Domicilio" (Solo Domicilio).',
                          'Simulates which studies each persona would book and why. Click "Create/Edit Products" or "View All / Edit" to set each study’s modality: "Branch & Home Service", "Branch Only", or "Home Draw Only".'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold shrink-0 mt-0.5">
                        {t('6. Imagen / Banner', '6. Creative')}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Evalúa artes del Brief o sube creatividad propia de tu agencia en "Subir Imagen / Banner Propio" ("Cargar Imagen / Banner" + titular/copy opcional) y presiona "Evaluar Imagen / Banner" para calificarla con tus rúbricas dinámicas.',
                          'Test Brief creatives or upload agency artwork in "Upload Custom Creative" ("Upload Custom Image" + optional headline/caption) and click "Run Creative Simulation" to score it against your dynamic rubrics.'
                        )}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold shrink-0 mt-0.5">
                        7. A/B Test
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {t(
                          'Genera automáticamente 5 variantes visuales estratégicas a partir de tu campaña o imagen cargada y ejecuta una prueba multivariante ("Ejecutar Simulación") con ranking promedio y retroalimentación por perfil.',
                          'Automatically generates 5 strategic visual variants from your campaign or uploaded creative and runs a multi-variant simulation ("Run Simulation") with average scores and per-persona rationale.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: 📚 BASE DE CONOCIMIENTO (COFEPRIS Y MARCA) */}
            {activeTab === 'rag_kb' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0066FF]">
                      {t('Módulo Transversal', 'Cross-Cutting Module')}
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      {t('📚 Base de Conocimiento (COFEPRIS y Marca)', '📚 Knowledge Base (COFEPRIS & Brand)')}
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
                      1. {t('¿Para qué sirve la Base de Conocimiento (COFEPRIS y Marca)?', 'What is the Knowledge Base (COFEPRIS & Brand) for?')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Reúne los 4 pilares normativos y clínicos oficiales de Laboratorios Chopo (Lineamientos Regulatorios COFEPRIS, Manual de Identidad y Marca Chopo, Catálogo de Estudios y Preparación Clínica, y Reglas de Imagen y Realismo Clínico) para blindar cada Brief de Marketing y cada evaluación del Focus Group.',
                        'Houses Laboratorios Chopo’s 4 official regulatory and clinical pillars (COFEPRIS Regulatory Guidelines, Chopo Brand & Identity Manual, Clinical Studies & Preparation Catalog, and Visual & Clinical Realism Rules) to ground every Marketing Brief and Focus Group evaluation.'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. {t('Botones "Subir PDF / TXT / MD" y "Nuevo Documento"', '"Upload PDF / TXT / MD" & "New Document" Buttons')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'En la pestaña "Documentos Activos" puedes cargar circulares regulatorias o fichas médicas con "Subir PDF / TXT / MD" (extrayendo automáticamente el texto y respaldando el archivo en Google Cloud Storage) o redactar lineamientos adicionales con "Nuevo Documento".',
                        'Under the "Active Documents" tab you can upload regulatory circulars or medical sheets via "Upload PDF / TXT / MD" (automatically extracting text and backing up the file to Google Cloud Storage) or draft additional rules using "New Document".'
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. {t('Edición en Vivo e "Historial de Versiones" en 1 Clic', 'Live Editing & 1-Click "Version History"')}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t(
                        'Edita cualquier documento en vivo, agrega una nota opcional y presiona "Guardar Cambios". En la pestaña "Historial de Versiones" puedes usar "Restaurar esta versión" sobre cualquier copia previa o "Restaurar Valores por Defecto".',
                        'Edit any document live, add an optional version note, and click "Save Changes". Switch to the "Version History" tab anytime to click "Restore this version" on any snapshot or "Restore Default Values".'
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
                      'Escribe una palabra clave (ej. "vaciar", "rollback", "banner", "email", "domicilio", "chat", "pdf")...',
                      'Type a keyword (e.g. "clear", "rollback", "banner", "email", "home", "chat", "pdf")...'
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
                'Tip: El botón flotante "¿Cómo usar esta sección?" y "Guía de Uso / Ayuda" abren siempre la guía contextual de tu pantalla actual.',
                'Tip: The floating "How to use this section?" button and "Help & Usage Guide" always open the contextual guide for your current screen.'
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
