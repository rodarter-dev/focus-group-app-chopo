import React from 'react';
import { AppMode } from '../types';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  FileText, 
  UserPlus,
  Sparkles
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
            label: t("1. Audiencias", "1. Audiences"),
            icon: <Users size={24} />,
            desc: t(
                "Segmenta pacientes B2C y médicos prescriptores B2B en perfiles detallados con IA.",
                "Segment B2C patients and B2B prescribing physicians into deep AI personas."
            )
        },
        {
            mode: AppMode.SYNTHETIC_USERS,
            label: t("2. Usuarios Sintéticos", "2. Synthetic Users"),
            icon: <UserPlus size={24} />,
            desc: t(
                "Construye e interactúa con una base de datos de pacientes y médicos sintéticos.",
                "Build and interact with a database of synthetic patients and physicians."
            )
        },
        {
            mode: AppMode.MARKETING_BRIEF,
            label: t("3. Brief de Marketing", "3. Marketing Brief"),
            icon: <FileText size={24} />,
            desc: t(
                "Genera estrategias clínicas multicanal y materiales creativos.",
                "Generate multi-channel clinical strategies and creative assets."
            )
        },
        {
            mode: AppMode.SYNTHETIC_FOCUS_GROUP,
            label: t("4. Focus Group", "4. Focus Group"),
            icon: <MessageSquare size={24} />,
            desc: t(
                "Simula retroalimentación en tiempo real de segmentos de pacientes y médicos.",
                "Simulate real-time feedback from target patient and physician segments."
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
                    {t('Bienvenido a ', 'Welcome to ')}<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0066FF] to-[#003B7A]">{name} {t('IA', 'AI')}</span>
                  </h1>
                </div>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed mb-10">
                  {t(
                      'Espacio exclusivo del equipo de Marketing de Laboratorios Chopo para diseñar, validar y poner a prueba las campañas de nuestra Parrilla de Estudios Clínicos con pacientes y médicos simulados bajo lineamientos COFEPRIS.',
                      'Exclusive workspace for the Laboratorios Chopo Marketing team to design, validate, and test our Clinical Study Grid campaigns with simulated patients and physicians under COFEPRIS guidelines.'
                  )}
                </p>
                
                <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-[#78D600] text-left mb-8">
                    <h2 className="text-xl font-bold text-[#003B7A] mb-6 flex items-center gap-2">
                        <Sparkles className="text-[#0066FF]" size={20} />
                        {t(`Flujo de Trabajo de ${name} IA`, `The ${name} AI Workflow`)}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div
                            onClick={() => setMode(AppMode.AUDIENCE_GEN)}
                            className="space-y-2 p-4 rounded-xl bg-slate-50/70 hover:bg-[#EFF6FF] border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">1</div>
                            <h3 className="font-bold text-[#003B7A]">{t('1. Audiencias', '1. Audiences')}</h3>
                            <p className="text-sm text-gray-600">{t('Define o crea el perfil de Paciente B2C o Médico B2B.', 'Define or create the B2C Patient or B2B Physician profile.')}</p>
                        </div>
                        <div
                            onClick={() => setMode(AppMode.SYNTHETIC_USERS)}
                            className="space-y-2 p-4 rounded-xl bg-slate-50/70 hover:bg-[#EFF6FF] border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">2</div>
                            <h3 className="font-bold text-[#003B7A]">{t('2. Usuarios Sintéticos', '2. Synthetic Users')}</h3>
                            <p className="text-sm text-gray-600">{t('Genera tu muestra de 1 a 15 personas simuladas.', 'Generate your cohort of 1 to 15 simulated participants.')}</p>
                        </div>
                        <div
                            onClick={() => setMode(AppMode.MARKETING_BRIEF)}
                            className="space-y-2 p-4 rounded-xl bg-slate-50/70 hover:bg-[#EFF6FF] border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">3</div>
                            <h3 className="font-bold text-[#003B7A]">{t('3. Brief de Marketing', '3. Marketing Brief')}</h3>
                            <p className="text-sm text-gray-600">{t('Crea mensajes, correos, promociones e imágenes con IA.', 'Create messages, emails, promotions, and images with AI.')}</p>
                        </div>
                        <div
                            onClick={() => setMode(AppMode.SYNTHETIC_FOCUS_GROUP)}
                            className="space-y-2 p-4 rounded-xl bg-slate-50/70 hover:bg-[#EFF6FF] border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center font-bold text-sm">4</div>
                            <h3 className="font-bold text-[#003B7A]">{t('4. Focus Group', '4. Focus Group')}</h3>
                            <p className="text-sm text-gray-600">{t('Evalúa tus piezas o entrevista a los perfiles.', 'Evaluate your creative pieces or interview personas.')}</p>
                        </div>
                    </div>
                </div>

                {/* Atajo Rápido para Agencia / Parrilla */}
                <div className="max-w-5xl mx-auto bg-gradient-to-r from-[#EFF6FF] via-blue-50 to-emerald-50/70 p-5 sm:p-6 rounded-2xl border border-blue-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-left mb-12">
                    <div className="space-y-1">
                        <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#0066FF] bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                            {t('Atajo Rápido para Agencia / Parrilla', 'Agency / Grid Fast-Track')}
                        </span>
                        <p className="text-sm sm:text-base font-bold text-[#003B7A]">
                            {t(
                                '⚡ ¿Ya tienes un banner, correo o promoción lista de tu agencia? Sáltate el Brief y evalúalo directo con tus usuarios sintéticos.',
                                '⚡ Already have a ready-made banner, email, or promotion from your agency? Skip the Brief and evaluate it directly with your synthetic users.'
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMode(AppMode.SYNTHETIC_FOCUS_GROUP)}
                        className="px-5 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-sm shadow-sm transition-all shrink-0 whitespace-nowrap"
                    >
                        {t('Ir Directo al Focus Group ➔', 'Go Straight to Focus Group ➔')}
                    </button>
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
                            {t('Abrir Herramienta', 'Open Tool')} 
                            <span className="ml-2 transform group-hover:translate-x-1 transition-transform">&rarr;</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
