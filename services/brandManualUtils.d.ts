import {
  AudienceTrack,
  BrandAudienceSegmentKey,
  BrandChannelKey,
  BrandManualConfig,
  BrandManualSlices,
  FunnelStage
} from '../types';

export declare const TRACK_TO_SEGMENT_KEY: Record<AudienceTrack, BrandAudienceSegmentKey>;
export declare const SEGMENT_KEY_TO_TRACK: Record<BrandAudienceSegmentKey, AudienceTrack>;
export declare const CHANNEL_SUBFORMATS: Record<string, string[]>;

export declare function resolveSegmentKey(segmentOrTrack?: string): BrandAudienceSegmentKey;
export declare function resolveTrackFromSegment(segmentOrTrack?: string): AudienceTrack;
export declare function getSubformatsForChannel(channelKey: string, manual?: BrandManualConfig | null): string[];

export declare function buildBrandSlices(
  manual: BrandManualConfig | null | undefined,
  options?: {
    audienceSegment?: BrandAudienceSegmentKey | string;
    track?: AudienceTrack | string;
    funnelStage?: FunnelStage | string;
    channelKey?: BrandChannelKey;
  }
): BrandManualSlices;

export declare function exportBrandManualToMarkdown(manual: BrandManualConfig | null | undefined): string;
