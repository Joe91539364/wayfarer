import { z } from 'zod';

export const PACES = {
  relaxed: { max_active_min_per_day: 6 * 60, max_poi_per_day: 3, label: '轻松' },
  moderate: { max_active_min_per_day: 9 * 60, max_poi_per_day: 5, label: '适中' },
  packed: { max_active_min_per_day: 12 * 60, max_poi_per_day: 7, label: '紧凑' },
} as const;

export type Pace = keyof typeof PACES;

export const INTERESTS = [
  'food',
  'nature',
  'history',
  'museum',
  'art',
  'shopping',
  'nightlife',
  'photography',
  'theme_park',
  'hot_spring',
  'hiking',
  'local_life',
] as const;

export type Interest = (typeof INTERESTS)[number];

export const INTEREST_CN: Record<Interest, string> = {
  food: '美食',
  nature: '自然风光',
  history: '历史古迹',
  museum: '博物馆',
  art: '艺术',
  shopping: '购物',
  nightlife: '夜生活',
  photography: '拍照',
  theme_park: '主题乐园',
  hot_spring: '温泉',
  hiking: '徒步',
  local_life: '市井生活',
};

export const TRANSIT_MODES = ['walk', 'taxi', 'subway', 'bus', 'drive', 'train', 'flight'] as const;
export type TransitMode = (typeof TRANSIT_MODES)[number];

export const TRANSIT_CN: Record<string, string> = {
  walk: '步行',
  taxi: '打车',
  subway: '地铁',
  bus: '公交',
  drive: '自驾',
  train: '高铁',
  flight: '飞机',
};

export const CATEGORIES = [
  'sight',
  'museum',
  'nature',
  'restaurant',
  'cafe',
  'shopping',
  'nightlife',
  'theme_park',
  'hiking',
  'hot_spring',
  'landmark',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_CN: Record<Category, string> = {
  sight: '景点',
  museum: '博物馆',
  nature: '自然',
  restaurant: '餐厅',
  cafe: '咖啡',
  shopping: '购物',
  nightlife: '夜生活',
  theme_park: '乐园',
  hiking: '徒步',
  hot_spring: '温泉',
  landmark: '地标',
};

export const OUTDOOR_CATEGORIES: Category[] = ['nature', 'hiking', 'theme_park', 'landmark', 'sight'];

export const DataConfidence = z.enum(['verified', 'estimated', 'unknown']);
export type DataConfidence = z.infer<typeof DataConfidence>;

export const MoneySchema = z.object({
  amount: z.number(),
  currency: z.string().default('CNY'),
  type: z.enum(['ticket', 'meal', 'lodging', 'transit', 'other']).default('other'),
});

export const OpeningHoursSchema = z.object({
  open: z.string(),
  close: z.string(),
  closed_days: z.array(z.number().int().min(0).max(6)).default([]),
  confidence: DataConfidence.default('estimated'),
});

export const ItineraryItemSchema = z.object({
  id: z.string(),
  type: z.enum(['activity', 'meal', 'transit', 'rest', 'checkin']),
  poi_id: z.string().nullable().default(null),
  name: z.string(),
  lat: z.number().nullable().default(null),
  lng: z.number().nullable().default(null),
  category: z.string().nullable().default(null),
  start_time: z.string(),
  end_time: z.string(),
  duration_min: z.number().int().nonnegative(),
  cost: MoneySchema,
  opening_hours: OpeningHoursSchema.nullable().default(null),
  booking_required: z.boolean().default(false),
  booked: z.boolean().default(false),
  locked: z.boolean().default(false),
  mode: z.string().nullable().default(null),
  from_item_id: z.string().nullable().default(null),
  to_item_id: z.string().nullable().default(null),
  distance_m: z.number().nullable().default(null),
  notes: z.string().nullable().default(null),
  weather_sensitive: z.boolean().default(false),
});

export type ItineraryItem = z.infer<typeof ItineraryItemSchema>;

export const DaySummarySchema = z.object({
  activity_min: z.number(),
  transit_min: z.number(),
  active_min: z.number(),
  cost: z.object({
    amount: z.number(),
    currency: z.string(),
    by_type: z.record(z.string(), z.number()),
  }),
  poi_count: z.number(),
  max_leg_km: z.number(),
});

export const DaySchema = z.object({
  date: z.string(),
  day_index: z.number().int(),
  base_area: z.object({ name: z.string(), lat: z.number(), lng: z.number() }).nullable().default(null),
  lodging: z
    .object({
      name: z.string(),
      lat: z.number(),
      lng: z.number(),
      cost: MoneySchema,
    })
    .nullable()
    .default(null),
  items: z.array(ItineraryItemSchema),
  summary: DaySummarySchema,
});

export type Day = z.infer<typeof DaySchema>;

export const MetaSchema = z.object({
  destination: z.string(),
  city_code: z.string().default('chengdu'),
  country: z.string().default('CN'),
  start_date: z.string(),
  end_date: z.string(),
  timezone: z.string().default('Asia/Shanghai'),
  travelers: z.object({ adults: z.number().int().min(1), children: z.number().int().min(0).default(0) }),
  /** 出发地。空字符串表示用户没说 —— 不要替用户猜 */
  origin_city: z.string().default(''),
  budget: z.object({
    amount: z.number(),
    currency: z.string().default('CNY'),
    includes_flights: z.boolean().default(false),
  }),
  pace: z.enum(['relaxed', 'moderate', 'packed']).default('moderate'),
  interests: z.array(z.string()).default([]),
  mobility: z.enum(['normal', 'limited', 'wheelchair']).default('normal'),
  must_visit: z.array(z.string()).default([]),
  avoid: z.array(z.string()).default([]),
  source: z.object({ type: z.enum(['chat', 'manual', 'import']), file_ref: z.string().nullable().default(null) }).default({
    type: 'chat',
    file_ref: null,
  }),
});

export type Meta = z.infer<typeof MetaSchema>;

export const ViolationSchema = z.object({
  code: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  day_index: z.number().optional(),
  item_ids: z.array(z.string()),
  message: z.string(),
  suggestion: z.string(),
  auto_fixable: z.boolean(),
});

export type Violation = z.infer<typeof ViolationSchema>;

export const RuleResultSchema = z.object({
  code: z.string(),
  title: z.string().default(''),
  description: z.string().default(''),
  passed: z.boolean(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
  checked: z.number(),
  covered: z.number().default(0),
  detail: z.string().optional(),
  warnings: z.number().default(0),
  infos: z.number().default(0),
});

export const CertificateSchema = z.object({
  verified_at: z.string(),
  verifier_version: z.string(),
  rules: z.array(RuleResultSchema),
  evidence: z.object({
    poi_sources: z.array(z.object({ poi_id: z.string(), provider: z.string(), fetched_at: z.string() })),
    cost_breakdown: z.record(z.string(), z.number()),
    max_leg_km: z.number(),
    total_transit_min: z.number(),
    assumptions: z.array(z.string()),
    data_coverage: z.object({
      poi_verified: z.number(),
      poi_total: z.number(),
      hours_known: z.number(),
      hours_total: z.number(),
    }),
  }),
  summary: z.object({ passed: z.number(), total: z.number(), errors: z.number(), warnings: z.number() }),
});

export type Certificate = z.infer<typeof CertificateSchema>;

export const ItinerarySchema = z.object({
  id: z.string(),
  version: z.number().int(),
  parent_id: z.string().nullable().default(null),
  variant_label: z.string().nullable().default(null),
  created_at: z.string(),
  updated_at: z.string(),
  meta: MetaSchema,
  days: z.array(DaySchema),
  unscheduled: z.array(z.any()).default([]),
  warnings: z.array(ViolationSchema).default([]),
  feasibility: CertificateSchema.nullable().default(null),
  assumptions: z.array(z.string()).default([]),
});

export type Itinerary = z.infer<typeof ItinerarySchema>;

export const CandidateSchema = z.object({
  poi_id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  category: z.string(),
  reason: z.string(),
  suggested_duration_min: z.number(),
  cost: MoneySchema,
  indoor: z.boolean().default(false),
  interest_tags: z.array(z.string()).default([]),
  rating: z.number().default(0),
  opening_hours: OpeningHoursSchema.nullable().default(null),
  booking_required: z.boolean().default(false),
});

export type Candidate = z.infer<typeof CandidateSchema>;

export function emptySummary() {
  return {
    activity_min: 0,
    transit_min: 0,
    active_min: 0,
    cost: { amount: 0, currency: 'CNY', by_type: {} as Record<string, number> },
    poi_count: 0,
    max_leg_km: 0,
  };
}
