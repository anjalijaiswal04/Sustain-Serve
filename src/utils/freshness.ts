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
  label: string;
  color: string;
  advice: string;
  isAnalyzing: boolean;
  isFoodDetected: boolean; // false → image rejected, not a food photo
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
    label: 'No Food Detected',
    color: 'text-red-700 bg-red-50 border-red-300',
    advice: 'The image does not appear to contain food. Please upload a clear photo of the food you are donating.',
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

      let label: string, color: string, advice: string;

      if (score >= 75) {
        label = 'Excellent Freshness';
        color = 'text-emerald-700 bg-emerald-50 border-emerald-300';
        advice = 'Food appears very fresh and vibrant. Ideal for immediate distribution.';
      } else if (score >= 55) {
        label = 'Good Freshness';
        color = 'text-blue-700 bg-blue-50 border-blue-300';
        advice = 'Food looks acceptably fresh. Suitable for distribution within the listed time window.';
      } else if (score >= 35) {
        label = 'Moderate Freshness';
        color = 'text-yellow-700 bg-yellow-50 border-yellow-300';
        advice = 'Food appears moderately fresh. Prioritise quick pickup and distribution.';
      } else {
        label = 'Low Freshness Detected';
        color = 'text-red-700 bg-red-50 border-red-300';
        advice = 'Food may be losing freshness. Please verify quality carefully before listing.';
      }

      resolve({ score, label, color, advice, isAnalyzing: false, isFoodDetected: true });
    };

    img.onerror = () => {
      resolve({
        score: 0,
        label: 'Unable to Analyse',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        advice: 'Could not read the image. Please try a different photo.',
        isAnalyzing: false,
        isFoodDetected: false,
      });
    };

    img.src = dataUrl;
  });
}
