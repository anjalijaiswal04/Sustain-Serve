// ---------------------------------------------------------------------------
// Freshness Time Utilities
// ---------------------------------------------------------------------------

export interface FreshnessTime {
  hoursLeft: number;
  minutesLeft: number;
  totalMinutesLeft: number;
  label: string;
  color: string;         // Tailwind text+bg+border class string
  barColor: string;      // Tailwind bg class for progress bar
  percentRemaining: number;
  isExpired: boolean;
}

export function getFreshnessTime(createdAt: string, consumableHours: number): FreshnessTime {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + consumableHours * 60 * 60 * 1000;
  const now = Date.now();
  const msLeft = expiresAt - now;

  if (msLeft <= 0) {
    return {
      hoursLeft: 0,
      minutesLeft: 0,
      totalMinutesLeft: 0,
      label: 'Expired',
      color: 'text-gray-500 bg-gray-50 border-gray-200',
      barColor: 'bg-gray-300',
      percentRemaining: 0,
      isExpired: true,
    };
  }

  const totalMinutes = Math.floor(msLeft / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalDurationMinutes = consumableHours * 60;
  const pct = Math.min(100, Math.round((totalMinutes / totalDurationMinutes) * 100));

  let label: string;
  let color: string;
  let barColor: string;

  if (hours === 0 && minutes < 30) {
    label = `${minutes}m left`;
    color = 'text-red-700 bg-red-50 border-red-200';
    barColor = 'bg-red-500';
  } else if (pct < 25) {
    label = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
    color = 'text-red-600 bg-red-50 border-red-200';
    barColor = 'bg-red-500';
  } else if (pct < 50) {
    label = `${hours}h ${minutes}m left`;
    color = 'text-orange-600 bg-orange-50 border-orange-200';
    barColor = 'bg-orange-400';
  } else if (pct < 75) {
    label = `${hours}h ${minutes}m left`;
    color = 'text-yellow-600 bg-yellow-50 border-yellow-200';
    barColor = 'bg-yellow-400';
  } else {
    label = `${hours}h ${minutes}m left`;
    color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
    barColor = 'bg-emerald-500';
  }

  return {
    hoursLeft: hours,
    minutesLeft: minutes,
    totalMinutesLeft: totalMinutes,
    label,
    color,
    barColor,
    percentRemaining: pct,
    isExpired: false,
  };
}

// ---------------------------------------------------------------------------
// Image Resize (client-side, before upload/store)
// ---------------------------------------------------------------------------

export function resizeImage(file: File, maxW = 480, maxH = 360, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxW) { height = Math.round((height * maxW) / width); width = maxW; }
      if (height > maxH) { width = Math.round((width * maxH) / height); height = maxH; }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// AI Freshness Analysis from Image (canvas pixel analysis — no external API)
// ---------------------------------------------------------------------------

export interface ImageFreshnessResult {
  score: number;           // 0-100 (0 = not food / error)
  isAnalyzing: boolean;
  isFoodDetected: boolean; // false → image rejected, not a food photo
}

// ---------------------------------------------------------------------------
// Category-aware visual report (computed from score + food context)
// Can be re-computed any time category/foodName changes without re-uploading
// ---------------------------------------------------------------------------

import { FoodCategory } from './types';

export interface FreshnessVisual {
  band: 'peak' | 'good' | 'moderate' | 'low' | 'poor';
  label: string;            // "Peak Freshness", "Good Condition" …
  badge: string;            // Short status badge text
  textColor: string;        // Tailwind text colour class
  bgColor: string;          // Tailwind background class
  borderColor: string;      // Tailwind border class
  scoreBarColor: string;    // Tailwind bg for score fill bar
  imageFilter: string;      // CSS filter() applied to the preview image
  glowClass: string;        // Tailwind ring/shadow class for the image border
  appearance: string;       // How the FOOD looks right now — category-specific
  advice: string;           // What the donor should do
}

type Band = 'peak' | 'good' | 'moderate' | 'low' | 'poor';

function getBand(score: number): Band {
  if (score >= 75) return 'peak';
  if (score >= 55) return 'good';
  if (score >= 35) return 'moderate';
  if (score >= 20) return 'low';
  return 'poor';
}

const BAND_META: Record<Band, {
  label: string; badge: string;
  textColor: string; bgColor: string; borderColor: string; scoreBarColor: string;
  imageFilter: string; glowClass: string; advice: string;
}> = {
  peak: {
    label: 'Peak Freshness', badge: '✓ Looking Great',
    textColor: 'text-emerald-800', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-400',
    scoreBarColor: 'bg-emerald-500',
    imageFilter: 'saturate(1.25) brightness(1.06) contrast(1.04)',
    glowClass: 'ring-4 ring-emerald-400/60',
    advice: 'Great condition — post and distribute immediately for best impact.',
  },
  good: {
    label: 'Good Condition', badge: '↗ Good to Go',
    textColor: 'text-blue-800', bgColor: 'bg-blue-50', borderColor: 'border-blue-400',
    scoreBarColor: 'bg-blue-500',
    imageFilter: 'saturate(1.0) brightness(1.0)',
    glowClass: 'ring-4 ring-blue-400/50',
    advice: 'Food is in acceptable shape. Post promptly and ensure pickup within the stated window.',
  },
  moderate: {
    label: 'Moderately Fresh', badge: '~ Still Usable',
    textColor: 'text-yellow-800', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-400',
    scoreBarColor: 'bg-yellow-500',
    imageFilter: 'saturate(0.60) brightness(0.93) contrast(0.97)',
    glowClass: 'ring-4 ring-yellow-400/50',
    advice: 'Freshness is fading — prioritise quick pickup. Double-check portion quality before distribution.',
  },
  low: {
    label: 'Below Average', badge: '⚠ Check Before Use',
    textColor: 'text-orange-800', bgColor: 'bg-orange-50', borderColor: 'border-orange-400',
    scoreBarColor: 'bg-orange-500',
    imageFilter: 'saturate(0.30) brightness(0.86) sepia(0.22) contrast(0.94)',
    glowClass: 'ring-4 ring-orange-400/60',
    advice: 'Quality is declining. Only post if NGO can inspect on arrival. Consider reducing quantity.',
  },
  poor: {
    label: 'Poor Condition', badge: '✕ Inspect Carefully',
    textColor: 'text-red-800', bgColor: 'bg-red-50', borderColor: 'border-red-400',
    scoreBarColor: 'bg-red-600',
    imageFilter: 'saturate(0.10) brightness(0.76) sepia(0.50) contrast(0.88)',
    glowClass: 'ring-4 ring-red-500/60',
    advice: 'Food quality is very low. We recommend not listing unless it has been verified safe by you.',
  },
};

// Category-specific appearance text per freshness band
const APPEARANCE: Record<FoodCategory, Record<Band, string>> = {
  'Cooked Food': {
    peak:     'Hot or freshly cooled — vibrant colours, glossy gravies, fluffy grains. Looks exactly as it came off the stove. Zero concern.',
    good:     'Colours are still appetizing. Surface has cooled; minor skin may have formed on gravies. Visually intact and inviting.',
    moderate: 'Some drying at edges or surface crust forming on gravies. Colours slightly muted. Needs reheating before serving.',
    low:      'Visible colour shift — gravies thick/crusted, rice dry or clumped, proteins changing texture. Careful inspection needed.',
    poor:     'Significant colour change, dried-out surfaces, sauce separation, or starchy clumping evident. Must be inspected for safety before listing.',
  },
  'Raw Veggies': {
    peak:     'Crisp, vibrant, taut skins — leaves stand upright, colours are deep and saturated. Farm-fresh appearance.',
    good:     'Still fresh-looking with strong colour. Minor outer-leaf softening possible; cores remain firm and edible.',
    moderate: 'Early wilting visible — outer leaves beginning to soften, slight yellowing at edges. Usable with minimal trimming.',
    low:      'Clear wilting, yellowing, or light browning on leaves. Root vegetables may have soft spots. Sort before distribution.',
    poor:     'Significant wilting, discoloration, or mushy patches visible. Sort carefully item-by-item; discard unusable portions.',
  },
  'Packed Grains': {
    peak:     'Packaging pristine and fully sealed. Contents expected to be dry, free-flowing, and fully intact.',
    good:     'Packaging looks sound with minor surface handling marks. Contents should be well-protected and in good order.',
    moderate: 'Packaging shows signs of handling or mild wear. Open and check for moisture, clumping, or unusual odour.',
    low:      'Visible packaging wear or sealing concerns. Inspect contents carefully — discard if moisture or colour change is found.',
    poor:     'Packaging integrity uncertain. Open and inspect every portion closely; discard if pests, moisture, or off-odour detected.',
  },
  'Bakery': {
    peak:     'Golden-brown crust, soft and springy texture expected. Crumb structure intact, looks freshly baked.',
    good:     'Still visually appealing. Crust may have softened slightly from cooling, interior texture should be acceptable.',
    moderate: 'Visible staleness — crust hardening, surface drying. Interior firmer than ideal. Generally safe if no mould present.',
    low:      'Clearly stale — brittle or hard crust, dry crumb. Inspect all surfaces carefully for any spots or off-odours.',
    poor:     'Severely stale or dried out. Check every piece closely for mould (especially sealed packaged items) before considering distribution.',
  },
};

export function getFreshnessVisual(
  score: number,
  category: FoodCategory,
  _foodName?: string,
): FreshnessVisual {
  const band = getBand(score);
  const meta = BAND_META[band];
  const appearance = APPEARANCE[category]?.[band] ?? APPEARANCE['Cooked Food'][band];
  return { band, appearance, ...meta };
}

// ---------------------------------------------------------------------------
// Internal: per-pixel helpers
// ---------------------------------------------------------------------------

/** Kovac et al. skin-tone detection in RGB space */
function isSkinPixel(r: number, g: number, b: number): boolean {
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  return (
    r > 95 && g > 40 && b > 20 &&
    maxC - minC > 15 &&
    Math.abs(r - g) > 15 &&
    r > g && r > b
  );
}

/**
 * Returns true if the pixel colour matches a common food signature.
 * Covers: leafy greens, citrus, red/orange cooked food, yellow grains,
 * brown bread/meat, white rice/dairy, deep red fruit, etc.
 */
function isFoodPixel(r: number, g: number, b: number): boolean {
  // Leafy green (spinach, broccoli, herbs)
  if (g > 80 && g > r * 1.15 && g > b * 1.1 && g < 210) return true;

  // Vivid orange / carrot / curry
  if (r > 160 && g > 70 && g < 160 && b < 80 && r - b > 80) return true;

  // Red (tomato, strawberry, chilli)
  if (r > 140 && g < 80 && b < 80 && r - g > 60) return true;

  // Deep yellow / golden (dal, rice, banana, corn)
  if (r > 150 && g > 120 && b < 90 && r - b > 70 && g - b > 40) return true;

  // Warm brown / tan (bread, roti, meat, lentils, pakora)
  if (r > 100 && g > 60 && b > 30 && b < 110 &&
      r > g && r > b && r - b > 30 && r - b < 130 && g - b < 60) return true;

  // White / cream (rice, milk, paneer, idli) — not too grey
  if (r > 180 && g > 170 && b > 150 && r - b < 60 && r > b) return true;

  // Purple / violet (eggplant, beetroot)
  if (b > 80 && r > 80 && b - g > 20 && r - g > 15 && (r + b) / 2 > g + 20) return true;

  return false;
}

/** Convert RGB → HSL saturation [0-1] */
function getSaturation(r: number, g: number, b: number): number {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function analyzeImageFreshness(dataUrl: string): Promise<ImageFreshnessResult> {
  const NOT_FOOD: ImageFreshnessResult = {
    score: 0,
    isAnalyzing: false,
    isFoodDetected: false,
  };

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      // Render at a fixed size for consistent analysis
      const W = 240, H = 180;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, W, H);

      // ── Step 1: scan the FULL frame for skin / food pixel ratios ──────────
      const full = ctx.getImageData(0, 0, W, H);
      const { data: d, } = full;
      const total = W * H;

      let skinCount = 0;
      let foodCount = 0;
      let vividCount = 0;
      let darkCount = 0;
      let sumR = 0, sumG = 0, sumB = 0;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        sumR += r; sumG += g; sumB += b;

        if (isSkinPixel(r, g, b)) skinCount++;
        if (isFoodPixel(r, g, b)) foodCount++;

        const sat = getSaturation(r, g, b);
        if (sat > 0.25 && (r + g + b) / 3 > 50) vividCount++;

        if ((r + g + b) / 3 < 55) darkCount++;
      }

      const skinRatio = skinCount / total;
      const foodRatio = foodCount / total;
      const vividRatio = vividCount / total;
      const darkRatio = darkCount / total;

      const avgR = sumR / total;
      const avgG = sumG / total;
      const avgB = sumB / total;
      const brightness = (avgR + avgG + avgB) / 3;

      // ── Step 2: Food vs Non-food classification ───────────────────────────
      //
      // Logic:
      //   • Reject if skin dominates and food colours are weak
      //     (handles human portraits, selfies, etc.)
      //   • Reject if image is almost entirely a flat/uniform surface
      //     (solid backgrounds, blank walls — very low vibrancy)
      //   • Accept if there is meaningful food-colour coverage

      const skinDominant = skinRatio > 0.30;
      const foodWeak = foodRatio < 0.18;
      const tooFlat = vividRatio < 0.08 && foodRatio < 0.12;

      // Human / non-food portrait
      if (skinDominant && foodWeak) {
        resolve(NOT_FOOD);
        return;
      }

      // Completely uniform / non-food scene (plain wall, sky, fabric, etc.)
      if (tooFlat && skinRatio < 0.05) {
        resolve(NOT_FOOD);
        return;
      }

      // Ambiguous — skin present but some food colours too.
      // Could be someone holding food; lean toward food if foodRatio is meaningful.
      if (skinRatio > 0.20 && foodRatio < 0.12) {
        resolve(NOT_FOOD);
        return;
      }

      // ── Step 3: Freshness scoring (food confirmed) ─────────────────────────
      let score = 50;

      // Brightness sweet-spot for fresh food
      if (brightness > 75 && brightness < 215) score += 18;
      else if (brightness < 40) score -= 22;
      else if (brightness > 230) score -= 8;

      // Colourful food = generally fresher
      score += Math.round(vividRatio * 28);

      // High food colour coverage
      score += Math.round(foodRatio * 20);

      // Greens indicate fresh produce
      if (avgG > avgR + 8 && avgG > avgB + 8) score += 10;

      // Darkness (wilting / over-cooked / mould)
      score -= Math.round(darkRatio * 22);

      // High skin presence (food partly out of frame?) — slight penalty
      score -= Math.round(skinRatio * 15);

      score = Math.max(12, Math.min(95, score));

      resolve({ score, isAnalyzing: false, isFoodDetected: true });
    };

    img.onerror = () => {
      resolve({ score: 0, isAnalyzing: false, isFoodDetected: false });
    };

    img.src = dataUrl;
  });
}
