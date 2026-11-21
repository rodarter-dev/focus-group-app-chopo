import React from 'react';
import { AppMode } from '../types';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  FileText, 
  UserPlus,
  Sparkles,
  Palette
} from 'lucide-react';
import { useCompanyContext } from '../context/CompanyContext';
import { useLanguage } from '../context/LanguageContext';

interface HomeProps {
    setMode: (mode: AppMode) => void;
}

export const Home: React.FC<HomeProps> = ({ setMode }) => {
    const { name } = useCompanyContext();
    const { t } = useLanguage();
    const tools = [
        {
            mode: AppMode.AUDIENCE_GEN,
            label: t("1. Audiencias", "1. Audiencias"),
            icon: <Users size={24} />,
            desc: t(
                "Segmenta Pacientes B2C, Médicos B2D y Empresas B2B en perfiles detallados con IA.",
                "Segmenta Pacientes B2C, Médicos B2D y Empresas B2B en perfiles detallados con IA."
            )
        },
        {
            mode: AppMode.SYNTHETIC_USERS,
            label: t("2. Usuarios Sintéticos", "2. Usuarios Sintéticos"),
            icon: <UserPlus size={24} />,
            desc: t(
                "Construye e interactúa con una muestra de Pacientes B2C, Médicos B2D y Empresas B2B sintéticos.",
                "Construye e interactúa con una muestra de Pacientes B2C, Médicos B2D y Empresas B2B sintéticos."
            )
        },
        {
            mode: AppMode.MARKETING_BRIEF,
            label: t("3. Brief de Marketing", "3. Brief de Marketing"),
            icon: <FileText size={24} />,
            desc: t(
                "Genera estrategias clínicas multicanal y piezas creativas alineadas al Manual de Marca V4 y COFEPRIS.",
                "Genera estrategias clínicas multicanal y piezas creativas alineadas al Manual de Marca V4 y COFEPRIS."
            )
        },
        {
            mode: AppMode.SYNTHETIC_FOCUS_GROUP,
            label: t("4. Focus Group", "4. Focus Group"),
            icon: <MessageSquare size={24} />,
            desc: t(
                "Simula retroalimentación en tiempo real de Pacientes B2C, Médicos B2D y Empresas B2B.",
                "Simula retroalimentación en tiempo real de Pacientes B2C, Médicos B2D y Empresas B2B."
            )
        },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center mb-16">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="p-3 bg-[#0066FF]/10 rounded-2xl backdrop-blur-md">
                    <BarChart3 className="w-8 h-8 text-[#0066FF]" />
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black text-[#003B7A] tracking-tight">
                    Chopo <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066FF] to-[#003B7A]">Intelligence Hub</span>
                  </h1>
                </div>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed mb-10">
                  {t(
                      'Espacio exclusivo del equipo de Marketing de Laboratorio Médico del Chopo para diseñar, validar y poner a prueba las campañas de nuestra Parrilla de Estudios Clínicos con Pacientes B2C, Médicos B2D y Empresas B2B bajo lineamientos del Manual de Marca V4 y COFEPRIS.',
                      'Espacio exclusivo del equipo de Marketing de Laboratorio Médico del Chopo para diseñar, validar y poner a prueba las campañas de nuestra Parrilla de Estudios Clínicos con Pacientes B2C, Médicos B2D y Empresas B2B bajo lineamientos del Manual de Marca V4 y COFEPRIS.'
                  )}
                </p>
                
                <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-[#63CF00] text-left mb-8">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                        <h2 className="text-xl font-bold text-[#003B7A] flex items-center gap-2">
                            <Sparkles className="text-[#0066FF]" size={20} />
                            {t('Flujo de Trabajo — Chopo Intelligence Hub', 'Flujo de Trabajo — Chopo Intelligence Hub')}
                        </h2>
                        <span className="text-xs font-bold text-[#004699] bg-[#EFF9FE] border border-blue-200 px-3 py-1 rounded-full">
                            {name || 'Laboratorio Médico del Chopo'}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div
                            onClick={() => setMode(AppMode.AUDIENCE_GEN)}
                            className="space-y-2 p-4 rounded-xl bg-slate-50/70 hover:bg-[#EFF6FF] border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">1</div>
                            <h3 className="font-bold text-[#003B7A]">{t('1. Audiencias', '1. Audiencias')}</h3>
                            <p className="text-sm text-gray-600">{t('Define o crea perfiles de Pacientes B2C, Médicos B2D y Empresas B2B.', 'Define o crea perfiles de Pacientes B2C, Médicos B2D y Empresas B2B.')}</p>
                        </div>
                        <div
                            onClick={() => setMode(AppMode.SYNTHETIC_USERS)}
                            className="space-y-2 p-4 rounded-xl bg-slate-50/70 hover:bg-[#EFF6FF] border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">2</div>
                            <h3 className="font-bold text-[#003B7A]">{t('2. Usuarios Sintéticos', '2. Usuarios Sintéticos')}</h3>
                            <p className="text-sm text-gray-600">{t('Genera tu muestra de 1 a 15 personas simuladas.', 'Genera tu muestra de 1 a 15 personas simuladas.')}</p>
                        </div>
                        <div
                            onClick={() => setMode(AppMode.MARKETING_BRIEF)}
                            className="space-y-2 p-4 rounded-xl bg-slate-50/70 hover:bg-[#EFF6FF] border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">3</div>
                            <h3 className="font-bold text-[#003B7A]">{t('3. Brief de Marketing', '3. Brief de Marketing')}</h3>
                            <p className="text-sm text-gray-600">{t('Crea mensajes, correos, promociones e imágenes por etapa del Funnel y canal.', 'Crea mensajes, correos, promociones e imágenes por etapa del Funnel y canal.')}</p>
                        </div>
                        <div
                            onClick={() => setMode(AppMode.SYNTHETIC_FOCUS_GROUP)}
                            className="space-y-2 p-4 rounded-xl bg-slate-50/70 hover:bg-[#EFF6FF] border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">4</div>
                            <h3 className="font-bold text-[#003B7A]">{t('4. Focus Group', '4. Focus Group')}</h3>
                            <p className="text-sm text-gray-600">{t('Evalúa tus piezas o entrevista a los perfiles.', 'Evalúa tus piezas o entrevista a los perfiles.')}</p>
                        </div>
                    </div>
                </div>

                {/* Accesos Rápidos: Atajo Agencia + Manual de Marca V4 */}
                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5 text-left mb-12">
                    {/* Atajo Rápido para Agencia / Parrilla */}
                    <div className="bg-gradient-to-r from-[#EFF6FF] via-blue-50 to-emerald-50/70 p-5 sm:p-6 rounded-2xl border border-blue-200 shadow-sm flex flex-col justify-between gap-4">
                        <div className="space-y-1.5">
                            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#0066FF] bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                                {t('Atajo Rápido para Agencia / Parrilla', 'Atajo Rápido para Agencia / Parrilla')}
                            </span>
                            <p className="text-sm sm:text-base font-bold text-[#003B7A] leading-snug">
                                {t(
                                    '⚡ ¿Ya tienes un banner, correo o promoción lista de tu agencia? Sáltate el Brief y evalúalo directo con tus usuarios sintéticos.',
                                    '⚡ ¿Ya tienes un banner, correo o promoción lista de tu agencia? Sáltate el Brief y evalúalo directo con tus usuarios sintéticos.'
                                )}
                            </p>
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => setMode(AppMode.SYNTHETIC_FOCUS_GROUP)}
                                className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm shadow-sm transition-all whitespace-nowrap"
                            >
                                {t('Ir Directo al Focus Group ➔', 'Ir Directo al Focus Group ➔')}
                            </button>
                        </div>
                    </div>

                    {/* Acceso Rápido al Manual de Marca V4 */}
                    <div className="bg-gradient-to-r from-[#EFF9FE] via-white to-blue-50/70 p-5 sm:p-6 rounded-2xl border border-[#BDD4F2] shadow-sm flex flex-col justify-between gap-4">
                        <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#004699] bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                                <Palette size={12} className="text-[#005FFC]" />
                                {t('Manual de Marca V4 Oficial', 'Manual de Marca V4 Oficial')}
                            </span>
                            <p className="text-sm sm:text-base font-bold text-[#003B7A] leading-snug">
                                {t(
                                    'Edita en 5 secciones la voz de marca (B2C, B2D, B2B), fotografía cálida, paleta oficial, Línea Basal y reglas por canal.',
                                    'Edita en 5 secciones la voz de marca (B2C, B2D, B2B), fotografía cálida, paleta oficial, Línea Basal y reglas por canal.'
                                )}
                            </p>
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => setMode(AppMode.BRAND_MANUAL)}
                                className="px-5 py-2.5 rounded-xl bg-[#005FFC] hover:bg-[#004699] text-white font-bold text-sm shadow-sm transition-all inline-flex items-center gap-2 whitespace-nowrap"
                            >
                                <Palette size={16} />
                                <span>{t('Abrir Manual de Marca V4 ➔', 'Abrir Manual de Marca V4 ➔')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tools.map((tool, idx) => (
                    <div
                        key={idx}
                        onClick={() => setMode(tool.mode)}
                        className="tool-card group p-8 bg-white rounded-2xl border border-gray-100 hover:border-[#0066FF] transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl relative overflow-hidden h-full flex flex-col"
                    >
                        <div className="tool-icon-wrapper mb-6 w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-[#0066FF] group-hover:text-white transition-colors">
                            {React.cloneElement(tool.icon as React.ReactElement<any>, { className: "text-[#0066FF] group-hover:text-white" })}
                        </div>
                        <h3 className="text-xl font-bold text-[#003B7A] mb-3 group-hover:text-[#0066FF] transition-colors">{tool.label}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-grow">{tool.desc}</p>
                        <div className="flex items-center text-[#0066FF] font-bold text-sm">
                            {t('Abrir Herramienta', 'Abrir Herramienta')} 
                            <span className="ml-2 transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
