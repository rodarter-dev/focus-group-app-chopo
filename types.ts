export enum AppMode {
  HOME = 'HOME',
  AUDIENCE_GEN = 'AUDIENCE_GEN',
  SYNTHETIC_USERS = 'SYNTHETIC_USERS',
  MARKETING_BRIEF = 'MARKETING_BRIEF',
  SYNTHETIC_FOCUS_GROUP = 'SYNTHETIC_FOCUS_GROUP',
  SYNTHETIC_CHAT = 'SYNTHETIC_CHAT',
  BRAND_MANUAL = 'BRAND_MANUAL'
}

export type AudienceTrack = 'patient' | 'physician' | 'enterprise';
export type BrandAudienceSegmentKey = 'b2c_patients' | 'b2d_doctors' | 'b2b_enterprises';
export type FunnelStage = 'awareness' | 'consideration' | 'performance';
export type BrandChannelKey = 'social_media' | 'mailing_ecommerce' | 'web' | 'pdv_sucursal' | string;
export type AssetStage = 'base_photo_and_copy' | 'final_designed_artwork';

export interface BrandSegmentConfig {
  id: string;
  code: string;
  appTrack: AudienceTrack;
  label: string;
  pronoun: string;
  toneGuidance: string;
  valueDrivers: string[];
  primaryDestination: string;
  mandatoryPrecautionaryLegend: string;
}

export interface BrandFunnelStageRule {
  label: string;
  headlineRule: string;
  bodyFocus: string;
  ctaPlacementAndStyle: string;
}

export interface BrandColorItem {
  id: string;
  name: string;
  hex: string;
  rgb: string;
  usage: string;
}

export interface BrandContrastRule {
  backgroundHex: string;
  backgroundName: string;
  allowedForegrounds: string[];
  forbiddenForegrounds: string[];
  notes: string;
}

export interface BrandChannelRule {
  id: string;
  label: string;
  sourcePages?: string;
  supportedFormats: string[];
  copyRules: string;
  photoRules: string;
  focusGroupContext: string;
  auditorRules: string[];
}

export interface BrandManualConfig {
  metadata: {
    id: string;
    version: string;
    sourceDocument: string;
    client: string;
    umbrellaCampaign: string;
    lastUpdated: string;
    architectureNote?: string;
  };
  identity_and_voice: {
    uiTabTitle: string;
    sourcePages?: string;
    officialBrandNames: string[];
    logoDescriptor: string;
    mandatorySlogan: {
      text: string;
      usageRule: string;
    };
    purpose: string;
    brandAttributesPyramid: {
      cuspUnique: string[];
      centerDifferentiators: string[];
      baseCategoryEssentials: string[];
      experiencePillars: Record<string, string[]>;
    };
    audienceSegments: Record<string, BrandSegmentConfig>;
    voiceAndCopyInvariants: {
      grammaticalPerson: string;
      zeroExclamationMarks: string;
      clarityOverJargon: string;
      ingenuityVsHumor: string;
      dos: string[];
      donts: string[];
    };
    funnelStageRules: Record<string, BrandFunnelStageRule>;
    contactTouchpointsOrder: {
      strictOrder: string[];
      rule: string;
    };
    medicalCitationsRule: {
      maxAgeYears: number;
      citationStandard: string;
      rule: string;
    };
    advertisingPermitRule: string;
  };
  photography_and_imagery: {
    uiTabTitle: string;
    sourcePages?: string;
    generalPhilosophy: string;
    colorTemperatureRule: string;
    cleanBaseImageRuleForAI: string;
    focusGroupWarmthHint: string;
    dos: string[];
    donts: string[];
  };
  color_palette: {
    uiTabTitle: string;
    sourcePages?: string;
    ambientPromptGuidance: string;
    primaryDigital: BrandColorItem[];
    secondaryDigital: BrandColorItem[];
    promotionalAndButtons: BrandColorItem[];
    contrastMatrix: BrandContrastRule[];
  };
  graphic_design_and_layout: {
    uiTabTitle: string;
    sourcePages?: string;
    usageNote: string;
    logoRules: {
      mandatoryDescriptor: string;
      contrastOnPhotos: string;
      modularLogoColor: string;
      placement: string;
      cobrandingRule: string;
    };
    typographyRules: {
      primaryFontFamily: string;
      webAlternativeFontFamily: string;
      weightHierarchy: Record<string, string>;
      visionAuditGuidance: string;
    };
    lineaBasalRules: {
      description: string;
      proportionInvariants: string[];
      interactionAndSizeRules: string[];
      allowedAndForbiddenCrops: string[];
      nonAggressionRules: string[];
    };
    modularityRules: {
      cornerGeometry: string;
      noFloatingBoxes: string;
      singleAxisOrientation: string;
      maxSizeLimits: string;
      horizontalLayoutAndCtaTab: string;
    };
    pricingAndDiscountsRules: {
      mandatoryColor: string;
      circularBadgeBleed: string;
      modularPromoBox: string;
    };
    iconsLegalsAndNoPhotoRules: {
      icons: string;
      legalsPlacement: string;
      noPhotoLayouts: string;
    };
  };
  channels: {
    uiTabTitle: string;
    items: Record<string, BrandChannelRule>;
  };
}

export interface BrandManualDynamicVars {
  officialName: string;
  slogan: string;
  logoDescriptor: string;
  contactBar: string;
  pronoun: string;
  segmentCode: string;
  segmentLabel: string;
  primaryDestination: string;
  precautionaryLegend: string;
  channelLabel: string;
  basalGreenHex: string;
  brightBlueHex: string;
  navyBlueHex: string;
  modularLightBlueHex: string;
  promoPinkHex: string;
  seasonalRedHex: string;
  mailingMagentaHex: string;
}

export interface BrandManualSlices {
  audienceSegment: BrandAudienceSegmentKey;
  funnelStage: FunnelStage;
  channelKey: BrandChannelKey;
  segmentContext: {
    purpose: string;
    segment: BrandSegmentConfig | null;
  };
  voiceAndFunnelSlice: Record<string, any>;
  photoSlice: Record<string, any>;
  focusGroupSlice: {
    purpose: string;
    focusGroupWarmthHint: string;
    channelFocusGroupContext: string;
    channelLabel: string;
  };
  fullAuditorSlice: Record<string, any>;
  dynamicVars: BrandManualDynamicVars;
}

export interface FocusGroupRubric {
  id: string;
  name: string;
  track: 'both' | 'all' | 'patient' | 'physician' | 'enterprise';
  weight: number;
  evaluationQuestion: string;
  scoringAnchors: {
    low_0_to_40: string;
    mid_41_to_79: string;
    high_80_to_100: string;
  };
}

export interface RubricScore {
  rubricId: string;
  name: string;
  weight: number;
  score: number;
  rationale: string;
}

export interface ClinicalUseCase {
  id: string;
  studyName: string;
  category: string;
  track: 'both' | 'all' | 'patient' | 'physician' | 'enterprise';
  isDefault: boolean;
  includedStudies: string[];
  fastingRequirement: string;
  visualRealismRules: string;
  defaultPromoText: string;
  cofeprisPermitB2C: string;
  cofeprisPermitB2B: string;
  responsableSanitario: string;
}

export interface ConfigVersionSnapshot {
  versionId: string;
  entityType: 'personas' | 'rubrics' | 'use_cases' | 'prompts' | 'rag_docs' | 'brand_manual';
  timestamp: string;
  label: string;
  itemCount: number;
  previewNames?: string[];
  data?: any;
}

export interface FeasibilityReport {
  score: number;
  summary: string;
  risks: string[];
  opportunities: string[];
  tactical_improvements: Array<{
    area: string;
    suggestion: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
}

export interface MarketingBriefData {
  title: string;
  timestamp: string;
  campaignGoal: string;
  productName: string;
  companyName: string;
  studyName?: string;
  track?: 'both' | 'all' | 'patient' | 'physician' | 'enterprise';
  audienceSegment?: BrandAudienceSegmentKey;
  funnelStage?: FunnelStage;
  channelKey?: BrandChannelKey;
  channelSubformat?: string;
  slogan?: string;
  channelAdaptedCopy?: string;
  preFlightComplianceCheck?: string[];
  assumptions: {
    budget: string;
    timeline: string;
    primarySalesFocus: string;
    mitigationStrategy: string;
  };
  objective: {
    goal: { en: string; es: string };
    targetKpi: { en: string; es: string };
  };
  audiences: Array<{
    name: string;
    sourceSegment: string;
    ageRange: string;
    painPoints: string[];
    drivers: string[];
    messagingAngle: { en: string; es: string };
  }>;
  kpis: Array<{
    title: string;
    description: string;
  }>;
  valueProp: {
    main: { en: string; es: string };
    againstCompetitors: string;
    addressingTrends: string;
  };
  messaging: {
    primaryHook: { en: string; es: string };
    supporting1: { title: string; content: { en: string; es: string } };
    supporting2: { title: string; content: { en: string; es: string } };
  };
  channels: Array<{
    name: string;
    justification: string;
  }>;
  phases: Array<{
    title: string;
    dates: string;
    focus: string;
    action?: string;
    goal: string;
  }>;
  campaignAssets?: MarketingAssets;
  campaignAssetsMap?: Record<string, MarketingAssets>;
}

export interface MarketingAssets {
  image: string | null;
  social: {
    caption: string;
    hashtags: string[];
  };
  search: {
    headline: string;
    description: string;
    url: string;
  };
  email: {
    subject: string;
    preheader: string;
    bannerHeadline?: string;
    bannerSubheadline?: string;
    body: string;
    ctaText?: string;
    legalFooter?: string;
    image?: string;
  };
  youtube: {
    title: string;
    script: string;
  };
  website: {
    recommendations: Array<{
      name: string;
      price: string;
      image: string | null;
    }>;
  };
}

export interface Persona {
  id: string;
  track?: AudienceTrack;
  name: string;
  personaName?: string;
  age: number;
  job_title: string;
  demographics?: string;
  bio: string;
  income?: string;
  lifestyle_tags: string[];
  preferred_products?: string[];
  pain_points: string[];
  goals: string[];
  imagePrompt?: string;
  imageUrl?: string;
  isStandard?: boolean;
}

export interface GeneratedImageResult {
  imageUrl: string | null;
  description: string;
  loading: boolean;
  error: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  tags: string[];
}

export interface VibeMatchResult {
  colors: string[];
  mood: string;
  suggestedProducts: Product[];
}

export enum GenerationMode {
  TEXT_TO_VIDEO = 'TEXT_TO_VIDEO',
  FRAMES_TO_VIDEO = 'FRAMES_TO_VIDEO',
  REFERENCES_TO_VIDEO = 'REFERENCES_TO_VIDEO',
  EXTEND_VIDEO = 'EXTEND_VIDEO'
}

export interface GenerateVideoParams {
  prompt?: string;
  model: string;
  resolution?: string;
  aspectRatio?: string;
  mode: GenerationMode;
  startFrame?: { base64: string; file: { type: string; name: string } };
  endFrame?: { base64: string; file: { type: string; name: string } };
  isLooping?: boolean;
  referenceImages?: { base64: string; file: { type: string; name: string } }[];
  styleImage?: { base64: string; file: { type: string; name: string } };
  inputVideoObject?: any;
  durationSeconds?: number;
  personGeneration?: string;
}

export interface SimulationResult {
  personaId: string;
  personaName: string;
  briefMetrics: {
    interestScore: number;
    clarityScore: number;
    relevanceScore: number;
    feedback: string;
    negativeFeedback: string;
  };
  cart: {
    productName: string;
    purchased: boolean;
    reason: string;
  }[];
  emailEngagement: {
    subjectLine: string;
    opened: boolean;
    clicked: boolean;
    feedback?: string;
  }[];
  messageReactions?: {
    message: string;
    score: number;
    sentiment: string;
  }[];
}

export interface CreativeResult {
  personaId: string;
  personaName: string;
  track?: 'patient' | 'physician' | string;
  weightedOverallScore?: number;
  rubricScores?: RubricScore[];
  barriersOrConcerns?: string;
  suggestedImprovement?: string;
  visualAppeal: number;
  brandFit: number;
  stoppingPower: number;
  sentiment: string;
  feedback: string;
  conversionLikelihood: number; // 0-100
  suggestedProduct?: string;
  suggestedMessaging?: string;
  suggestedImage?: string;
  copyEdit?: string;
  audienceGroup?: string;
}

export interface ABTestResult {
  personaId: string;
  personaName: string;
  rankings: {
    variantName: string;
    score: number;
    rationale: string;
  }[];
  selectedVariant: string;
  overallFeedback: string;
  sentiment: string;
}

export interface AggregatedSimulationResult {
  timestamp: string;
  results: SimulationResult[];
}

export interface AcquisitionResult {
  personaId: string;
  personaName: string;
  likelihoodToJoin: number; // 0-100
  perceivedValue: number; // 0-100
  barriers: string;
  feedback: string;
  winningOffer?: string;
}

export type SavedSimulation =
  | {
    type: 'ACQUISITION_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: AcquisitionResult[];
    stats: any;
    offers?: string[];
  }
  | {
    type: 'MEMBER_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: SimulationResult[];
    emailBodies?: { [key: string]: string };
    marketingMessages?: string[];
    simulationProducts?: string[];
    emailDrafts?: {
      subject: string;
      preheader?: string;
      bannerHeadline?: string;
      bannerSubheadline?: string;
      body: string;
      image?: string;
      ctaText?: string;
      legalFooter?: string;
    }[];
  }
  | {
    type: 'CHAT_SESSION';
    id: string;
    name: string;
    timestamp: string;
    messages: { role: 'user' | 'persona'; content: string }[];
    personaId: string;
  }
  | {
    type: 'CREATIVE_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: CreativeResult[];
  }
  | {
    type: 'AB_TEST_SIMULATION';
    id: string;
    name: string;
    timestamp: string;
    results: ABTestResult[];
    variants: { region: string; image: string }[];
  }
  | {
    type: 'INTERVIEW_SESSION';
    id: string;
    name: string;
    timestamp: string;
    question: string;
    results: InterviewResult[];
  };

export interface InterviewResult {
  personaId: string;
  personaName: string;
  transcript: { role: 'interviewer' | 'interviewee'; content: string }[];
  summary: string;
  quote: string;
  sentiment: string;
}

export interface Audience {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface AudienceSegment {
  name: string;
  personaName: string;
  bio: string;
  demographics: string;
  imagePrompt: string;
  imageUrl?: string;
}

export interface DetailedPersona {
  name: string;
  age: number;
  job_title: string;
  bio: string;
  income?: string;
  net_worth?: string;
  household_size?: string;
  lifestyle_tags: string[];
  preferred_products: string[];
  pain_points: string[];
  goals: string[];
  charts?: {
    brand_affinity: { labels: string[], data: number[] };
  };
}

export interface CombinedPersona extends AudienceSegment {
  id?: string;
  track?: AudienceTrack;
  age?: number;
  job_title?: string;
  pain_points?: string[];
  goals?: string[];
  lifestyle_tags?: string[];
  preferred_products?: string[];
  isStandard?: boolean;
  details?: DetailedPersona;
  score?: {
    propensity: number;
    value: number;
    reason: string;
  };
}

export interface CognitiveStyle {
  informationDensityPreference: string;
  primaryTrustSignal: string;
  decisionVelocity: string;
  riskTolerance: string;
}

export interface LifestyleFriction {
  dailyGrindContext: string;
  financialMindset: string;
  brandLoyaltyQuotient: string;
  householdPowerDynamic: string;
}

export interface DigitalFootprint {
  last3SearchQueries: string[];
  unsubscribeTrigger: string;
  platformEcosystem: string;
  recentBigLifeEvent: string;
}

export interface PsychographicFlavor {
  theOneLuxury: string;
  aspirationVsReality: string;
  socialCauseAlignment: string;
}

export interface SyntheticUserProfile extends CombinedPersona {
  baseAudienceName?: string;
  baseAudienceBio?: string;
  cognitiveStyle?: CognitiveStyle;
  lifestyleFriction?: LifestyleFriction;
  digitalFootprint?: DigitalFootprint;
  psychographicFlavor?: PsychographicFlavor;
}
