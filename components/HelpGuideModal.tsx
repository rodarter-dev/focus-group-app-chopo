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
  ClipboardList,
  Palette
} from 'lucide-react';

export type HelpGuideTabId =
  | 'quick_flow'
  | 'audiences'
  | 'synthetic_users'
  | 'marketing_brief'
  | 'focus_group'
  | 'brand_manual'
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
    case AppMode.BRAND_MANUAL:
      return 'brand_manual';
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
      label: t('Flujo de Trabajo (4 Pasos)', 'Flujo de Trabajo (4 Pasos)'),
      badge: t('Inicio', 'Inicio'),
      icon: Sparkles
    },
    {
      id: 'audiences',
      label: t('1. Audiencias', '1. Audiencias'),
      icon: Users
    },
    {
      id: 'synthetic_users',
      label: t('2. Usuarios Sintéticos', '2. Usuarios Sintéticos'),
      icon: UserPlus
    },
    {
      id: 'marketing_brief',
      label: t('3. Brief de Marketing', '3. Brief de Marketing'),
      icon: FileText
    },
    {
      id: 'focus_group',
      label: t('4. Focus Group', '4. Focus Group'),
      icon: MessageSquare
    },
    {
      id: 'brand_manual',
      label: t('Manual de Marca V4', 'Manual de Marca V4'),
      badge: 'V4',
      icon: Palette
    },
    {
      id: 'rag_kb',
      label: t('Base de Conocimiento (COFEPRIS y Clínico)', 'Base de Conocimiento (COFEPRIS y Clínico)'),
      icon: BookOpen
    },
    {
      id: 'faq',
      label: t('Dudas Frecuentes / Buscador', 'Dudas Frecuentes / Buscador'),
      icon: Search
    }
  ];

  const faqItems = [
    {
      id: 'faq_brand_manual_v4',
      chip: t('¿Dónde edito el Manual de Marca V4?', '¿Dónde edito el Manual de Marca V4?'),
      question: t(
        '¿Dónde administro la voz de marca, los colores oficiales, la Línea Basal y las reglas por canal (Redes, Mailing, Web y PDV Sucursal)?',
        '¿Dónde administro la voz de marca, los colores oficiales, la Línea Basal y las reglas por canal (Redes, Mailing, Web y PDV Sucursal)?'
      ),
      answer: t(
        'En el botón "Manual de Marca V4" del menú lateral izquierdo (o desde el acceso rápido en Inicio). Está organizado en 5 pestañas editables: 1. Identidad y Voz (B2C Pacientes, B2D Médicos, B2B Empresas y etapas del Funnel Awareness / Consideration / Performance), 2. Fotografía e Imagen, 3. Paleta y Contrastes, 4. Diseño Gráfico y Línea Basal, y 5. Reglas por Canal (Redes Sociales, Mailing / E-commerce, Sitio Web, PDV Sucursal y nuevos canales). Al presionar "Guardar Cambios", los ajustes aplican automáticamente en Briefs, imágenes y evaluaciones, y siempre puedes volver atrás desde "Historial de Versiones" o "Restaurar Manual V4 Oficial".',
        'En el botón "Manual de Marca V4" del menú lateral izquierdo (o desde el acceso rápido en Inicio). Está organizado en 5 pestañas editables: 1. Identidad y Voz (B2C Pacientes, B2D Médicos, B2B Empresas y etapas del Funnel Awareness / Consideration / Performance), 2. Fotografía e Imagen, 3. Paleta y Contrastes, 4. Diseño Gráfico y Línea Basal, y 5. Reglas por Canal (Redes Sociales, Mailing / E-commerce, Sitio Web, PDV Sucursal y nuevos canales). Al presionar "Guardar Cambios", los ajustes aplican automáticamente en Briefs, imágenes y evaluaciones, y siempre puedes volver atrás desde "Historial de Versiones" o "Restaurar Manual V4 Oficial".'
      ),
      relatedTab: 'brand_manual' as HelpGuideTabId,
      targetMode: AppMode.BRAND_MANUAL
    },
    {
      id: 'faq_delete_restore_audiences_users',
      chip: t('¿Borrar/vaciar y recuperar perfiles?', '¿Borrar/vaciar y recuperar perfiles?'),
      question: t(
        '¿Cómo borro o vacío las audiencias o los usuarios sintéticos para empezar desde cero, y cómo los recupero si borré uno por error?',
        '¿Cómo borro o vacío las audiencias o los usuarios sintéticos para empezar desde cero, y cómo los recupero si borré uno por error?'
      ),
      answer: t(
        'En "1. Audiencias" puedes borrar un perfil individual con "🗑️ Eliminar" en su tarjeta o limpiar todo el catálogo con "🗑️ Vaciar Todos" para empezar desde cero. Antes de cada eliminación o vaciado, el sistema guarda automáticamente un respaldo en "📜 Historial / Versiones" (donde verás la vista previa "Incluye: ..." con los perfiles exactos que restaurará cada versión), o bien puedes presionar "Restaurar Perfiles Base" para volver a los perfiles oficiales de Laboratorio Médico del Chopo. En "2. Usuarios Sintéticos" puedes limpiar el lote completo con "🗑️ Vaciar Usuarios Sintéticos" / "🗑️ Borrar Todos", quitar a un participante específico con "🗑️ Eliminar" en su tarjeta, o recuperar la última sesión guardada con "Cargar Último".',
        'En "1. Audiencias" puedes borrar un perfil individual con "🗑️ Eliminar" en su tarjeta o limpiar todo el catálogo con "🗑️ Vaciar Todos" para empezar desde cero. Antes de cada eliminación o vaciado, el sistema guarda automáticamente un respaldo en "📜 Historial / Versiones" (donde verás la vista previa "Incluye: ..." con los perfiles exactos que restaurará cada versión), o bien puedes presionar "Restaurar Perfiles Base" para volver a los perfiles oficiales de Laboratorio Médico del Chopo. En "2. Usuarios Sintéticos" puedes limpiar el lote completo con "🗑️ Vaciar Usuarios Sintéticos" / "🗑️ Borrar Todos", quitar a un participante específico con "🗑️ Eliminar" en su tarjeta, o recuperar la última sesión guardada con "Cargar Último".'
      ),
      relatedTab: 'audiences' as HelpGuideTabId,
      targetMode: AppMode.AUDIENCE_GEN
    },
    {
      id: 'faq_create_audience_ai',
      chip: t('¿Crear audiencia B2C / B2D / B2B?', '¿Crear audiencia B2C / B2D / B2B?'),
      question: t(
        '¿Cómo creo un nuevo perfil de Pacientes B2C, Médicos B2D o Empresas B2B con inteligencia artificial?',
        '¿Cómo creo un nuevo perfil de Pacientes B2C, Médicos B2D o Empresas B2B con inteligencia artificial?'
      ),
      answer: t(
        'Ve a "1. Audiencias" y en la tarjeta superior "✨ Crear Nuevo Perfil de Audiencia con IA" elige el segmento oficial ("Pacientes B2C", "Médicos B2D" o "Empresas B2B"), haz clic en uno de los chips de ejemplos rápidos o escribe tu propia descripción, y presiona "Generar y Agregar Audiencia". El nuevo perfil se agregará al inicio de tu catálogo con su retrato IA y podrás saltar directo a generar su muestra haciendo clic en "👥 Crear Usuarios Sintéticos de este Perfil ➔".',
        'Ve a "1. Audiencias" y en la tarjeta superior "✨ Crear Nuevo Perfil de Audiencia con IA" elige el segmento oficial ("Pacientes B2C", "Médicos B2D" o "Empresas B2B"), haz clic en uno de los chips de ejemplos rápidos o escribe tu propia descripción, y presiona "Generar y Agregar Audiencia". El nuevo perfil se agregará al inicio de tu catálogo con su retrato IA y podrás saltar directo a generar su muestra haciendo clic en "👥 Crear Usuarios Sintéticos de este Perfil ➔".'
      ),
      relatedTab: 'audiences' as HelpGuideTabId,
      targetMode: AppMode.AUDIENCE_GEN
    },
    {
      id: 'faq_banner_agency',
      chip: t('¿Probar banner sin Brief?', '¿Probar banner sin Brief?'),
      question: t(
        '¿Cómo pruebo una imagen, banner o arte final de mi agencia sin tener que generar primero un Brief de Marketing?',
        '¿Cómo pruebo una imagen, banner o arte final de mi agencia sin tener que generar primero un Brief de Marketing?'
      ),
      answer: t(
        'Desde "Inicio" usa el banner "Atajo Rápido para Agencia / Parrilla" haciendo clic en "Ir Directo al Focus Group ➔", o entra a "4. Focus Group" ➔ pestaña "Imagen / Banner". En la tarjeta "Subir Imagen / Banner Propio", haz clic en "Cargar Imagen / Banner", selecciona el canal (Redes Sociales, Mailing, Sitio Web o PDV Sucursal) y etapa del Funnel, escribe opcionalmente el titular y copy, y presiona "Evaluar Imagen / Banner". Los participantes evaluarán atractivo visual, afinidad con Laboratorio Médico del Chopo, intención de agendar y cumplimiento con el Manual de Marca V4.',
        'Desde "Inicio" usa el banner "Atajo Rápido para Agencia / Parrilla" haciendo clic en "Ir Directo al Focus Group ➔", o entra a "4. Focus Group" ➔ pestaña "Imagen / Banner". En la tarjeta "Subir Imagen / Banner Propio", haz clic en "Cargar Imagen / Banner", selecciona el canal (Redes Sociales, Mailing, Sitio Web o PDV Sucursal) y etapa del Funnel, escribe opcionalmente el titular y copy, y presiona "Evaluar Imagen / Banner". Los participantes evaluarán atractivo visual, afinidad con Laboratorio Médico del Chopo, intención de agendar y cumplimiento con el Manual de Marca V4.'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_single_audience',
      chip: t('¿Participantes en Focus Group?', '¿Participantes en Focus Group?'),
      question: t(
        '¿Por qué en el Focus Group aparecen ciertas audiencias en "Contexto de Audiencias" y cómo inspecciono a los participantes evaluados?',
        '¿Por qué en el Focus Group aparecen ciertas audiencias en "Contexto de Audiencias" y cómo inspecciono a los participantes evaluados?'
      ),
      answer: t(
        '"4. Focus Group" está sincronizado directamente con tus audiencias activas de "1. Audiencias" y la muestra creada en "2. Usuarios Sintéticos". Haz clic en el botón "👥 Ver / Inspeccionar Participantes Evaluados (N)" para revisar el perfil detallado de cada participante activo. Para incluir otras audiencias (B2C Pacientes, B2D Médicos o B2B Empresas), enriquecer matices con "Contexto Clínico Adicional (Opcional)" o cambiar la cantidad por segmento (1, 2, 3, 5, 10 o 15), ve a "2. Usuarios Sintéticos", marca las audiencias deseadas y presiona "Generar Usuarios".',
        '"4. Focus Group" está sincronizado directamente con tus audiencias activas de "1. Audiencias" y la muestra creada en "2. Usuarios Sintéticos". Haz clic en el botón "👥 Ver / Inspeccionar Participantes Evaluados (N)" para revisar el perfil detallado de cada participante activo. Para incluir otras audiencias (B2C Pacientes, B2D Médicos o B2B Empresas), enriquecer matices con "Contexto Clínico Adicional (Opcional)" o cambiar la cantidad por segmento (1, 2, 3, 5, 10 o 15), ve a "2. Usuarios Sintéticos", marca las audiencias deseadas y presiona "Generar Usuarios".'
      ),
      relatedTab: 'synthetic_users' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_USERS
    },
    {
      id: 'faq_email_banner',
      chip: t('¿Subir imagen a un Email?', '¿Subir imagen a un Email?'),
      question: t(
        '¿Cómo subo o cambio la imagen de un correo electrónico en formato Banner Visual?',
        '¿Cómo subo o cambio la imagen de un correo electrónico en formato Banner Visual?'
      ),
      answer: t(
        'Puedes hacerlo en dos lugares: (1) En "3. Brief de Marketing" (Sección 9 "Vista Previa Creativa de Campaña" ➔ pestaña "Email"), haciendo clic en el botón "Subir / Cambiar Imagen" en la esquina superior derecha del banner; o (2) En "4. Focus Group" ➔ pestaña "Email", haciendo clic en "Imagen / Editar" sobre cualquier correo o en el botón "Crear/Editar Emails".',
        'Puedes hacerlo en dos lugares: (1) En "3. Brief de Marketing" (Sección 9 "Vista Previa Creativa de Campaña" ➔ pestaña "Email"), haciendo clic en el botón "Subir / Cambiar Imagen" en la esquina superior derecha del banner; o (2) En "4. Focus Group" ➔ pestaña "Email", haciendo clic en "Imagen / Editar" sobre cualquier correo o en el botón "Crear/Editar Emails".'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_study_modality',
      chip: t('¿Sucursal vs. Domicilio?', '¿Sucursal vs. Domicilio?'),
      question: t(
        '¿Cómo configuro si un estudio está disponible en Sucursal y Domicilio, Solo Sucursal o Solo Domicilio?',
        '¿Cómo configuro si un estudio está disponible en Sucursal y Domicilio, Solo Sucursal o Solo Domicilio?'
      ),
      answer: t(
        'En "4. Focus Group" ➔ pestaña "Compra de Estudios", haz clic en el botón "Crear/Editar Estudios" (arriba a la derecha) o en "Ver Todos / Editar" dentro del catálogo de estudios. En el modal podrás seleccionar la modalidad de atención de cada estudio ("Disponible en Sucursal y Domicilio", "Disponible solo en Sucursal" para gabinete e imagenología como Mastografía o Rayos X, o "Disponible solo a Domicilio").',
        'En "4. Focus Group" ➔ pestaña "Compra de Estudios", haz clic en el botón "Crear/Editar Estudios" (arriba a la derecha) o en "Ver Todos / Editar" dentro del catálogo de estudios. En el modal podrás seleccionar la modalidad de atención de cada estudio ("Disponible en Sucursal y Domicilio", "Disponible solo en Sucursal" para gabinete e imagenología como Mastografía o Rayos X, o "Disponible solo a Domicilio").'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_chat_suggested',
      chip: t('¿Preguntas sugeridas en Chat?', '¿Preguntas sugeridas en Chat?'),
      question: t(
        '¿Cómo funcionan las entrevistas cualitativas y los 4 chips de preguntas sugeridas en la pestaña Chat del Focus Group?',
        '¿Cómo funcionan las entrevistas cualitativas y los 4 chips de preguntas sugeridas en la pestaña Chat del Focus Group?'
      ),
      answer: t(
        'En "4. Focus Group" ➔ pestaña "Chat" encontrarás el "Centro de Entrevistas Cualitativas" con 4 chips de "Preguntas Sugeridas en 1 Clic:" listos para evaluar barreras de agendamiento en línea/WhatsApp, percepción de precio promocional, claridad de indicaciones de ayuno y criterios diagnósticos para médicos B2D y convenios B2B. Haz clic en cualquier chip (o escribe tu pregunta) y presiona "Iniciar Entrevista".',
        'En "4. Focus Group" ➔ pestaña "Chat" encontrarás el "Centro de Entrevistas Cualitativas" con 4 chips de "Preguntas Sugeridas en 1 Clic:" listos para evaluar barreras de agendamiento en línea/WhatsApp, percepción de precio promocional, claridad de indicaciones de ayuno y criterios diagnósticos para médicos B2D y convenios B2B. Haz clic en cualquier chip (o escribe tu pregunta) y presiona "Iniciar Entrevista".'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_kb_pdf',
      chip: t('¿Subir PDF de COFEPRIS o Clínico?', '¿Subir PDF de COFEPRIS o Clínico?'),
      question: t(
        '¿Cómo agrego un documento PDF de COFEPRIS, ficha clínica o regla de realismo médico a la Base de Conocimiento (COFEPRIS y Clínico)?',
        '¿Cómo agrego un documento PDF de COFEPRIS, ficha clínica o regla de realismo médico a la Base de Conocimiento (COFEPRIS y Clínico)?'
      ),
      answer: t(
        'Haz clic en el botón "Base de Conocimiento (COFEPRIS y Clínico)" en la parte inferior del menú lateral izquierdo. En la pestaña "Documentos Activos", haz clic en "Subir PDF / TXT / MD" (o en "Nuevo Documento") y presiona "Guardar Cambios". El sistema extrae automáticamente el texto del PDF, guarda un respaldo en "Historial de Versiones" y aplica sus criterios regulatorios y médicos al generar Briefs y evaluar campañas. (Recuerda que las reglas de identidad y tono de marca se editan ahora en "Manual de Marca V4").',
        'Haz clic en el botón "Base de Conocimiento (COFEPRIS y Clínico)" en la parte inferior del menú lateral izquierdo. En la pestaña "Documentos Activos", haz clic en "Subir PDF / TXT / MD" (o en "Nuevo Documento") y presiona "Guardar Cambios". El sistema extrae automáticamente el texto del PDF, guarda un respaldo en "Historial de Versiones" y aplica sus criterios regulatorios y médicos al generar Briefs y evaluar campañas. (Recuerda que las reglas de identidad y tono de marca se editan ahora en "Manual de Marca V4").'
      ),
      relatedTab: 'rag_kb' as HelpGuideTabId
    },
    {
      id: 'faq_persistence',
      chip: t('¿Se borran mis cambios al recargar (F5)?', '¿Se borran mis cambios al recargar (F5)?'),
      question: t(
        '¿Se borran mis promociones, mensajes clave, correos o estudios personalizados si recargo la página (F5) o cambio de pestaña?',
        '¿Se borran mis promociones, mensajes clave, correos o estudios personalizados si recargo la página (F5) o cambio de pestaña?'
      ),
      answer: t(
        'No. Todas tus listas de trabajo en "4. Focus Group" ("Mensajes Clave", "Promociones", "Email" con Banner Visual y "Compra de Estudios") se guardan automáticamente. Solo se reemplazarán si generas un Brief completamente nuevo en "3. Brief de Marketing" o si haces clic manualmente en el botón "Traer datos del último Brief".',
        'No. Todas tus listas de trabajo en "4. Focus Group" ("Mensajes Clave", "Promociones", "Email" con Banner Visual y "Compra de Estudios") se guardan automáticamente. Solo se reemplazarán si generas un Brief completamente nuevo en "3. Brief de Marketing" o si haces clic manualmente en el botón "Traer datos del último Brief".'
      ),
      relatedTab: 'focus_group' as HelpGuideTabId,
      targetMode: AppMode.SYNTHETIC_FOCUS_GROUP
    },
    {
      id: 'faq_history_restore',
      chip: t('¿Historial y Criterios de Evaluación?', '¿Historial y Criterios de Evaluación?'),
      question: t(
        '¿Cómo consulto una simulación anterior en "Historial" y cómo ajusto los "Criterios de Evaluación" (Rúbricas)?',
        '¿Cómo consulto una simulación anterior en "Historial" y cómo ajusto los "Criterios de Evaluación" (Rúbricas)?'
      ),
      answer: t(
        'En la esquina superior derecha de "4. Focus Group" dispones de ambos botones: (1) "📋 Criterios de Evaluación (Rúbricas)" abre el editor de rúbricas ponderadas con pesos (%), anclas 0–100 e historial de versiones; y (2) "Historial" despliega tus ejecuciones guardadas con etiquetas de color por categoría ("Promociones", "Brief / Email / Estudios", "Imagen / Banner" o "A/B Test"). Al hacer clic en cualquier registro de "Historial", el sistema abre su pestaña correspondiente y restaura tanto los resultados como los materiales exactos evaluados.',
        'En la esquina superior derecha de "4. Focus Group" dispones de ambos botones: (1) "📋 Criterios de Evaluación (Rúbricas)" abre el editor de rúbricas ponderadas con pesos (%), anclas 0–100 e historial de versiones; y (2) "Historial" despliega tus ejecuciones guardadas con etiquetas de color por categoría ("Promociones", "Brief / Email / Estudios", "Imagen / Banner" o "A/B Test"). Al hacer clic en cualquier registro de "Historial", el sistema abre su pestaña correspondiente y restaura tanto los resultados como los materiales exactos evaluados.'
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
        <div className="w-full h-1.5 bg-gradient-to-r from-[#005FFC] via-[#004699] to-[#63CF00]" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EFF9FE] border border-blue-200 flex items-center justify-center text-[#005FFC] shrink-0 shadow-sm">
              <HelpCircle size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[#003B7A]">
                  {t('Centro de Ayuda y Guía Interactiva — Chopo Intelligence Hub', 'Centro de Ayuda y Guía Interactiva — Chopo Intelligence Hub')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EFF9FE] text-[#005FFC] border border-blue-200 text-[11px] font-bold">
                  {t('Manual Paso a Paso', 'Manual Paso a Paso')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t(
                  'Referencia actualizada de la plataforma 100% en español para Laboratorio Médico del Chopo: flujo de 4 pasos, Manual de Marca V4 y Base de Conocimiento (COFEPRIS y Clínico).',
                  'Referencia actualizada de la plataforma 100% en español para Laboratorio Médico del Chopo: flujo de 4 pasos, Manual de Marca V4 y Base de Conocimiento (COFEPRIS y Clínico).'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title={t('Cerrar guía', 'Cerrar guía')}
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
                      ? 'bg-[#005FFC] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-[#003B7A]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={16} className={isSelected ? 'text-white shrink-0' : 'text-[#005FFC] shrink-0'} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#EFF9FE] text-[#005FFC]'
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
                <div className="p-5 rounded-2xl bg-[#EFF9FE] border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC]">
                      Laboratorio Médico del Chopo · Chopo Intelligence Hub
                    </span>
                    <h3 className="text-lg font-bold text-[#003B7A] mt-0.5">
                      Flujo de Trabajo — Chopo Intelligence Hub
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Sigue el menú lateral numerado (1. Audiencias ➔ 2. Usuarios Sintéticos ➔ 3. Brief de Marketing ➔ 4. Focus Group), respaldado transversalmente por el <strong className="text-[#004699]">Manual de Marca V4</strong> y la <strong className="text-[#004699]">Base de Conocimiento (COFEPRIS y Clínico)</strong>.
                    </p>
                  </div>
                </div>

                {/* Accesos Rápidos: Agencia + Manual V4 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EFF6FF] via-blue-50 to-emerald-50/70 border border-blue-200 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#0066FF] bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                        <Zap size={12} />
                        Atajo Rápido para Agencia / Parrilla
                      </span>
                      <p className="text-xs font-bold text-[#003B7A] leading-snug">
                        ⚡ ¿Ya tienes un banner, correo o promoción lista de tu agencia? Sáltate el Brief desde Inicio y evalúalo directo con tus usuarios sintéticos.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.SYNTHETIC_FOCUS_GROUP);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap"
                      >
                        Ir Directo al Focus Group ➔
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#EFF9FE] border border-[#BDD4F2] flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#004699] bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                        <Palette size={12} className="text-[#005FFC]" />
                        Manual de Marca V4 (5 Pestañas)
                      </span>
                      <p className="text-xs font-bold text-[#003B7A] leading-snug">
                        Administra por secciones la voz B2C/B2D/B2B, fotografía cálida, paleta oficial, Línea Basal y reglas para Redes, Mailing, Web y PDV Sucursal.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.BRAND_MANUAL);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap"
                      >
                        Ir al Manual de Marca V4 ➔
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Paso 1 */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#005FFC]/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#005FFC] text-white text-xs font-bold">
                          Paso 1
                        </span>
                        <span className="text-[11px] font-bold text-[#004699] bg-[#EFF9FE] px-2 py-0.5 rounded border border-blue-200">
                          B2C · B2D · B2B
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <Users size={18} className="text-[#005FFC]" />
                        1. Audiencias
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        Consulta los perfiles base oficiales de Chopo para <strong>B2C Pacientes</strong>, <strong>B2D Médicos</strong> y <strong>B2B Empresas</strong>, crea nuevos segmentos con &ldquo;✨ Crear Nuevo Perfil de Audiencia con IA&rdquo; o restaura versiones anteriores desde &ldquo;📜 Historial / Versiones&rdquo;.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('audiences')}
                        className="text-xs font-bold text-slate-500 hover:text-[#003B7A]"
                      >
                        Ver detalle de pantalla
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.AUDIENCE_GEN);
                          onClose();
                        }}
                        className="text-xs font-bold text-[#005FFC] hover:underline flex items-center gap-1"
                      >
                        Ir a 1. Audiencias <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Paso 2 */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#005FFC]/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#005FFC] text-white text-xs font-bold">
                          Paso 2
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Sincroniza con Focus Group
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <UserPlus size={18} className="text-[#005FFC]" />
                        2. Usuarios Sintéticos
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        Muestra tus audiencias activas de &ldquo;1. Audiencias&rdquo; con filtros para B2C Pacientes, B2D Médicos y B2B Empresas, cantidad (1 a 15), &ldquo;Contexto Clínico Adicional (Opcional)&rdquo; y salto rápido al Paso 3 o Paso 4.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('synthetic_users')}
                        className="text-xs font-bold text-slate-500 hover:text-[#003B7A]"
                      >
                        Ver detalle de pantalla
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.SYNTHETIC_USERS);
                          onClose();
                        }}
                        className="text-xs font-bold text-[#005FFC] hover:underline flex items-center gap-1"
                      >
                        Ir a 2. Usuarios Sintéticos <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Paso 3 */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#005FFC]/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#005FFC] text-white text-xs font-bold">
                          Paso 3
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          Funnel y 4 Canales
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <FileText size={18} className="text-[#005FFC]" />
                        3. Brief de Marketing
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        Configura etapa del Funnel (<strong>Awareness / Consideration / Performance</strong>), canal (<strong>Redes, Mailing, Web o PDV Sucursal</strong>) y estudio clínico para generar estrategias y materiales fieles al Manual V4 y COFEPRIS.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('marketing_brief')}
                        className="text-xs font-bold text-slate-500 hover:text-[#003B7A]"
                      >
                        Ver detalle de pantalla
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.MARKETING_BRIEF);
                          onClose();
                        }}
                        className="text-xs font-bold text-[#005FFC] hover:underline flex items-center gap-1"
                      >
                        Ir a 3. Brief de Marketing <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Paso 4 */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between gap-4 hover:border-[#005FFC]/50 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#005FFC] text-white text-xs font-bold">
                          Paso 4
                        </span>
                        <span className="text-[11px] font-bold text-[#003B7A] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          7 Pestañas de Prueba
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#003B7A] flex items-center gap-2">
                        <MessageSquare size={18} className="text-[#005FFC]" />
                        4. Focus Group
                      </h4>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        Evalúa tus campañas en 7 pestañas exactas: Chat (con 4 preguntas sugeridas en 1 clic), Mensajes Clave, Promociones, Email, Compra de Estudios, Imagen / Banner y A/B Test.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setActiveTab('focus_group')}
                        className="text-xs font-bold text-slate-500 hover:text-[#003B7A]"
                      >
                        Ver las 7 pestañas
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateMode(AppMode.SYNTHETIC_FOCUS_GROUP);
                          onClose();
                        }}
                        className="text-xs font-bold text-[#005FFC] hover:underline flex items-center gap-1"
                      >
                        Ir a 4. Focus Group <ArrowRight size={13} />
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC]">
                      Módulo 1
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      1. Audiencias: Generador con IA y Catálogo Directo (B2C, B2D y B2B)
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
                    Abrir 1. Audiencias <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#EFF9FE] border border-[#BDD4F2] text-xs text-[#004699] leading-relaxed">
                  <strong className="font-bold block mb-1">
                    3 Segmentos Oficiales del Manual de Marca V4:
                  </strong>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>B2C Pacientes</strong> (trato cercano de &ldquo;Tú&rdquo;): personas y familias que buscan certeza, prevención y conveniencia digital.</li>
                    <li><strong>B2D Médicos</strong> (trato de &ldquo;Tú&rdquo; respetuoso y profesional): aliados clínicos que valoran precisión diagnóstica y expediente digital.</li>
                    <li><strong>B2B Empresas</strong> (trato formal de &ldquo;Usted&rdquo;): directivos de Recursos Humanos y salud ocupacional para convenios corporativos.</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]/60">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. ✨ Crear Nuevo Perfil de Audiencia con IA
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      En la tarjeta superior selecciona el segmento oficial (&ldquo;B2C Pacientes&rdquo;, &ldquo;B2D Médicos&rdquo; o &ldquo;B2B Empresas&rdquo;), haz clic en cualquiera de los chips de ejemplos rápidos o escribe una descripción libre, y presiona &ldquo;Generar y Agregar Audiencia&rdquo;. La IA construirá el perfil completo con su retrato y lo agregará al inicio de tu catálogo.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1 flex items-center gap-2">
                      <History size={15} className="text-[#005FFC]" />
                      2. Filtros por Segmento, &ldquo;📜 Historial / Versiones&rdquo; con Respaldo Automático y &ldquo;🗑️ Vaciar Todos&rdquo;
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      En la barra de controles puedes filtrar por &ldquo;Todos los Perfiles&rdquo;, &ldquo;B2C Pacientes&rdquo;, &ldquo;B2D Médicos&rdquo; o &ldquo;B2B Empresas&rdquo;, usar &ldquo;🗑️ Vaciar Todos&rdquo; para dejar el catálogo limpio desde cero o hacer clic en &ldquo;Restaurar Perfiles Base&rdquo; para restablecer los perfiles oficiales de Laboratorio Médico del Chopo. Antes de eliminar un perfil o vaciar el catálogo, &ldquo;📜 Historial / Versiones&rdquo; guarda un respaldo automático y muestra la vista previa &ldquo;Incluye: ...&rdquo; indicando qué perfiles exactos restaurará cada versión guardada.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. Tarjetas Limpias y Salto Directo a Usuarios Sintéticos
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cada tarjeta presenta el retrato (con botón &ldquo;Generar Retrato IA&rdquo; si aún no tiene foto), edad, demografía, contexto clínico, barreras, motivadores y estudios recomendados. Al pie dispones de tres acciones directas: &ldquo;✏️ Editar Perfil&rdquo;, &ldquo;🗑️ Eliminar&rdquo; y &ldquo;👥 Crear Usuarios Sintéticos de este Perfil ➔&rdquo;.
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC]">
                      Módulo 2
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      2. Usuarios Sintéticos: Muestra Activa, Contexto Clínico y Limpieza
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
                    Abrir 2. Usuarios Sintéticos <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                  <strong className="font-bold block mb-1">
                    💡 Sincronización directa con 1. Audiencias y 4. Focus Group:
                  </strong>
                  Este módulo muestra exactamente las audiencias activas configuradas en &ldquo;1. Audiencias&rdquo; (B2C Pacientes, B2D Médicos y B2B Empresas) y genera a las personas individuales que participarán en todas las pruebas del Focus Group.
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. Filtros por Segmento, Cantidad (1 a 15) y &ldquo;Contexto Clínico Adicional (Opcional)&rdquo;
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Filtra los perfiles por &ldquo;Todos&rdquo;, &ldquo;B2C Pacientes&rdquo;, &ldquo;B2D Médicos&rdquo; o &ldquo;B2B Empresas&rdquo;, elige entre 1, 2, 3, 5, 10 o 15 participantes por segmento y redacta en &ldquo;Contexto Clínico Adicional (Opcional)&rdquo; cualquier matiz específico (ej. dudas sobre el ayuno, cobertura de sucursales o convenios corporativos) para enriquecer cada perfil al presionar &ldquo;Generar Usuarios&rdquo;.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1 flex items-center gap-2">
                      <Trash2 size={15} className="text-rose-600" />
                      2. Controles de Limpieza Individual y por Lote + Psicografía Profunda
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Puedes vaciar el lote completo en cualquier momento con &ldquo;🗑️ Vaciar Usuarios Sintéticos&rdquo; o &ldquo;🗑️ Borrar Todos&rdquo;, quitar únicamente a un participante específico con el botón &ldquo;Eliminar&rdquo; de su tarjeta, o recuperar la corrida previa con &ldquo;Cargar Último&rdquo;.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]/60">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. Botones de Avance Rápido al Terminar
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      En cuanto tu muestra queda lista puedes avanzar con &ldquo;Siguiente Paso: 3. Crear Brief de Campaña ➔&rdquo; para diseñar mensajes y creatividades con IA, o saltar sin escalas con &ldquo;O ir directo a: 4. Evaluar en Focus Group ➔&rdquo; si ya cuentas con materiales propios.
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC]">
                      Módulo 3
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      3. Brief de Marketing, Funnel y 4 Canales Oficiales
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
                    Abrir 3. Brief de Marketing <ArrowRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#EFF9FE] border border-[#BDD4F2] space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#005FFC]">
                      Etapas del Funnel (Manual V4)
                    </h4>
                    <ul className="text-xs text-[#004699] space-y-1 leading-relaxed">
                      <li><strong>Awareness:</strong> titulares que inician con &ldquo;Toda una vida...&rdquo;, enfoque emocional y trayectoria.</li>
                      <li><strong>Consideration:</strong> titulares con &ldquo;Toda una vida...&rdquo; destacando diferenciadores digitales o clínicos.</li>
                      <li><strong>Performance:</strong> titulares directos al beneficio, promoción o agendamiento, siempre sin signos de admiración.</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#004699]">
                      4 Canales Oficiales
                    </h4>
                    <ul className="text-xs text-slate-700 space-y-1 leading-relaxed">
                      <li><strong>Redes Sociales:</strong> Post 1:1, Carrusel 4:5, Historias y Reels/TikTok 9:16.</li>
                      <li><strong>Mailing / E-commerce:</strong> Correos modulares con Banner Visual y bloques de estudios.</li>
                      <li><strong>Sitio Web:</strong> Hero Banners y banners promocionales de chopo.com.mx.</li>
                      <li><strong>PDV Sucursal:</strong> Pósters interiores, folletos, lonas exteriores y piezas regionales.</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. Objetivo Estratégico y Contexto Institucional Compacto
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      El Contexto Institucional de Laboratorio Médico del Chopo se resume en 1 línea (desplegable cuando quieras con &ldquo;Editar Contexto Institucional de Laboratorios Chopo&rdquo;), dando protagonismo al Objetivo Estratégico de Campaña, la etapa del Funnel y el Canal elegido.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. Selección de Estudio Clínico de la Parrilla y &ldquo;Administrar Estudios Clínicos&rdquo;
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Al seleccionar un estudio se vinculan automáticamente sus parámetros incluidos, preparación/ayuno, reglas de realismo médico y permisos COFEPRIS. Desde &ldquo;Administrar Estudios Clínicos&rdquo; puedes agregar, editar o restaurar versiones previas de tu catálogo.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. Audiencias Objetivo (B2C Pacientes, B2D Médicos y B2B Empresas)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Selecciona el segmento y las audiencias vinculadas para que cada copy respete automáticamente el pronombre correcto (&ldquo;Tú&rdquo; en B2C, &ldquo;Tú&rdquo; respetuoso en B2D y &ldquo;Usted&rdquo; en B2B), el destino digital y la leyenda precautoria vigente.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 bg-[#EFF6FF]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1 flex items-center gap-2">
                      <Mail size={16} className="text-[#0066FF]" />
                      4. Vista Previa Creativa Multicanal y Salto al Focus Group
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Revisa las vistas previas de Social, Buscador, Email (en formato Banner Visual con botón &ldquo;Subir / Cambiar Imagen&rdquo;), YouTube y Sitio Web, y avanza con &ldquo;Siguiente Paso: 4. Evaluar esta Campaña en Focus Group ➔&rdquo;.
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC]">
                      Módulo 4
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      4. Focus Group: Controles Superiores y las 7 Pestañas Exactas
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
                    Abrir 4. Focus Group <ArrowRight size={14} />
                  </button>
                </div>

                {/* Controles Superiores */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Botones y Controles Clave del Focus Group
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <Users size={15} className="text-[#005FFC]" />
                        👥 Ver / Inspeccionar Participantes Evaluados (N)
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Abre la ficha completa de los N usuarios sintéticos activos (B2C Pacientes, B2D Médicos o B2B Empresas).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <ClipboardList size={15} className="text-[#005FFC]" />
                        📋 Criterios de Evaluación (Rúbricas)
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Personaliza pesos (%), preguntas y anclas de calificación 0–100, agrega criterios nuevos y restaura versiones previas.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <RotateCcw size={15} className="text-[#005FFC]" />
                        Traer datos del último Brief
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Importa bajo demanda mensajes clave, promociones, correos, estudios e imágenes del último Brief sin perder tus ediciones al recargar (F5).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                      <div className="font-bold text-xs text-[#003B7A] flex items-center gap-1.5 mb-1">
                        <History size={15} className="text-[#005FFC]" />
                        Historial
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Consulta corridas etiquetadas por categoría y restaura resultados y estímulos en 1 clic.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Las 7 Pestañas */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Las 7 Pestañas de Evaluación en 4. Focus Group
                  </h4>
                  <div className="space-y-2.5">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF9FE] text-[#005FFC] text-xs font-bold shrink-0 mt-0.5">
                        1. Chat
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Abre el &ldquo;Centro de Entrevistas Cualitativas&rdquo; con 4 chips de &ldquo;Preguntas Sugeridas en 1 Clic:&rdquo; y botón &ldquo;Iniciar Entrevista&rdquo; para entrevistas profundas con repreguntas automáticas y transcripción completa.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF9FE] text-[#005FFC] text-xs font-bold shrink-0 mt-0.5">
                        2. Mensajes Clave
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Evalúa Nivel de Interés, Claridad y Relevancia Clínica de tus Mensajes Clave con edición en línea antes de &ldquo;Ejecutar Simulación&rdquo;.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0 mt-0.5">
                        3. Promociones
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Mide probabilidad de conversión, valor percibido, oferta ganadora y barreras de tus promociones de captación.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-blue-200 bg-[#EFF9FE]/60 flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#005FFC] text-white text-xs font-bold shrink-0 mt-0.5">
                        4. Email
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Evalúa correos en formato Banner Visual. Usa &ldquo;Crear/Editar Emails&rdquo; o &ldquo;Imagen / Editar&rdquo; para cargar tu banner, ajustar titular y medir Tasa de Apertura y CTR.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#EFF9FE] text-[#005FFC] text-xs font-bold shrink-0 mt-0.5">
                        5. Compra de Estudios
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Simula qué estudios agendaría cada perfil y por qué. Con &ldquo;Crear/Editar Estudios&rdquo; defines la modalidad: Sucursal y Domicilio, Solo Sucursal o Solo Domicilio.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold shrink-0 mt-0.5">
                        6. Imagen / Banner
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Evalúa piezas del Brief o sube artes finales de agencia en &ldquo;Subir Imagen / Banner Propio&rdquo; seleccionando canal (Redes, Mailing, Web o PDV Sucursal) y etapa del Funnel, y presiona &ldquo;Evaluar Imagen / Banner&rdquo; para revisarlos contra tus rúbricas y el Manual de Marca V4.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold shrink-0 mt-0.5">
                        7. A/B Test
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Genera 5 variantes visuales estratégicas y ejecuta pruebas multivariantes con ranking promedio y retroalimentación detallada por perfil.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MANUAL DE MARCA V4 (NUEVA SECCIÓN DEDICADA) */}
            {activeTab === 'brand_manual' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC]">
                      Identidad Oficial Editable
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      Manual de Marca V4 — Laboratorio Médico del Chopo
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateMode(AppMode.BRAND_MANUAL);
                      onClose();
                    }}
                    className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Palette size={14} />
                    Abrir Manual de Marca V4
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#EFF9FE] border border-[#BDD4F2] text-xs text-[#004699] leading-relaxed">
                  Administra por secciones todos los lineamientos oficiales de identidad de <strong>Laboratorio Médico del Chopo</strong>. Cada cambio que guardas se aplica automáticamente al generar campañas, fotografías y evaluaciones, sin depender de documentos largos difíciles de editar.
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. Identidad y Voz
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Edita nombres oficiales, slogan obligatorio, propósito, los 3 segmentos (<strong>B2C Pacientes</strong>, <strong>B2D Médicos</strong> y <strong>B2B Empresas</strong>), reglas invariables de voz (primera persona plural y cero signos de admiración), reglas por etapa del Funnel (<strong>Awareness, Consideration y Performance</strong>), orden estricto de puntos de contacto, citas médicas y permisos COFEPRIS.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. Fotografía e Imagen
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Define la calidez humana mexicana/latina, iluminación cálida natural, la regla de fotografía base limpia (sin textos ni logotipos incrustados) y las listas visuales de <strong>Sí Hacer</strong> y <strong>Prohibido</strong> (como cero estetoscopios en médicos).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. Paleta y Contrastes
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Gestiona con selector visual los Colores Primarios Digitales, Secundarios/Modulares y Promocionales/Botones, además de la <strong>Matriz Visual de Contrastes Permitidos vs. Prohibidos</strong>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      4. Diseño Gráfico y Línea Basal
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Reúne reglas de logotipo, tipografía (Avenir / Roboto), Línea Basal verde, modularidad, preciadores e íconos que guían las vistas previas y al Revisor Automático al auditar artes finales de agencia.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      5. Reglas por Canal (Redes, Mailing, Web, PDV Sucursal y Nuevos Canales)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Personaliza formatos soportados, redacción, fotografía y lista de verificación por canal (<strong>Redes Sociales</strong>, <strong>Mailing / E-commerce</strong>, <strong>Sitio Web</strong> y <strong>PDV Sucursal</strong>) o crea nuevos canales en cualquier momento con &ldquo;+ Nuevo Canal&rdquo;.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-900 leading-relaxed">
                    <strong>Versiones y descarga:</strong> Usa <strong>Guardar Cambios</strong> con una nota opcional, consulta <strong>Historial de Versiones</strong> para restaurar una versión anterior o volver al <strong>Restaurar Manual V4 Oficial</strong>, y exporta el manual legible en texto con <strong>Descargar en Texto (.md)</strong>.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: BASE DE CONOCIMIENTO (COFEPRIS Y CLÍNICO) */}
            {activeTab === 'rag_kb' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC]">
                      Módulo Regulatorio y Médico
                    </span>
                    <h3 className="text-xl font-bold text-[#003B7A]">
                      Base de Conocimiento (COFEPRIS y Clínico)
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
                    Abrir Base de Conocimiento
                  </button>
                </div>

                {/* Redirección amigable a Manual de Marca V4 */}
                <div className="p-4 rounded-xl bg-[#EFF9FE] border border-[#BDD4F2] flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[#004699] leading-relaxed flex-1 min-w-[220px]">
                    <strong>¿Buscas reglas de tono, paleta o diseño de marca?</strong> Ahora se administran en la sección dedicada <strong>Manual de Marca V4</strong>. La Base de Conocimiento se enfoca exclusivamente en documentos y PDFs regulatorios y médicos.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateMode(AppMode.BRAND_MANUAL);
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white text-xs font-bold shrink-0"
                  >
                    Ir al Manual de Marca V4 ➔
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      1. Los 3 Pilares Regulatorios y Clínicos Oficiales
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Concentra los PDFs y documentos oficiales de: (1) <strong>Lineamientos Regulatorios COFEPRIS</strong>, (2) <strong>Catálogo de Estudios y Preparación Clínica</strong>, y (3) <strong>Reglas de Imagen y Realismo Médico</strong> para asegurar exactitud clínica y cumplimiento sanitario en cada campaña.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      2. Botones &ldquo;Subir PDF / TXT / MD&rdquo; y &ldquo;Nuevo Documento&rdquo;
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      En la pestaña &ldquo;Documentos Activos&rdquo; puedes cargar circulares de COFEPRIS, fichas médicas o protocolos de estudios en PDF (el sistema extrae automáticamente el contenido) o redactar nuevos documentos clínicos directamente.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC]">
                    <h4 className="text-sm font-bold text-[#003B7A] mb-1">
                      3. Edición en Vivo e &ldquo;Historial de Versiones&rdquo; en 1 Clic
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Edita cualquier documento en vivo, agrega una nota opcional y presiona &ldquo;Guardar Cambios&rdquo;. En la pestaña &ldquo;Historial de Versiones&rdquo; puedes usar &ldquo;Restaurar esta versión&rdquo; sobre cualquier copia previa o &ldquo;Restaurar Valores por Defecto&rdquo;.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: DUDAS FRECUENTES / BUSCADOR */}
            {activeTab === 'faq' && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#005FFC]">
                    Respuestas Inmediatas
                  </span>
                  <h3 className="text-xl font-bold text-[#003B7A]">
                    Dudas Frecuentes y Buscador de Funciones
                  </h3>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={faqQuery}
                    onChange={e => setFaqQuery(e.target.value)}
                    placeholder="Escribe una palabra clave (ej. manual, funnel, colores, vaciar, banner, email, pdf)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-medium text-[#003B7A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005FFC]"
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {faqItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFaqQuery(item.chip)}
                      className="px-2.5 py-1 rounded-full bg-[#EFF9FE] hover:bg-blue-100 text-[#005FFC] border border-blue-200 text-[11px] font-bold transition-colors"
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
                      Ver todas
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
                          className="text-[11px] font-bold text-[#005FFC] hover:underline"
                        >
                          Ver guía de esa sección
                        </button>
                        {item.targetMode && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateMode(item.targetMode!);
                              onClose();
                            }}
                            className="text-[11px] font-bold text-[#003B7A] hover:text-[#005FFC] flex items-center gap-1"
                          >
                            Ir ahora a la pantalla <ArrowRight size={12} />
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
            <span className="w-2 h-2 rounded-full bg-[#63CF00]" />
            <span>
              Tip: El botón flotante &ldquo;¿Cómo usar esta sección?&rdquo; y &ldquo;Guía de Uso / Ayuda&rdquo; abren siempre la guía contextual de tu pantalla actual.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white text-xs font-bold shadow-sm transition-colors"
          >
            Entendido, cerrar guía
          </button>
        </div>
      </div>
    </div>
  );
};
