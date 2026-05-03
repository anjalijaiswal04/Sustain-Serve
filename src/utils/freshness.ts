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
  score: number;       // 0-100
  label: string;
  color: string;
  advice: string;
  isAnalyzing: boolean;
}

export function analyzeImageFreshness(dataUrl: string): Promise<ImageFreshnessResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const W = Math.min(img.width, 200);
      const H = Math.min(img.height, 150);
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, W, H);

      // Sample the central 50% of the image to avoid background interference
      const x0 = Math.floor(W * 0.25);
      const y0 = Math.floor(H * 0.25);
      const sw = Math.floor(W * 0.5);
      const sh = Math.floor(H * 0.5);
      const imageData = ctx.getImageData(x0, y0, sw, sh);
      const { data } = imageData;
      const count = data.length / 4;

      let sumR = 0, sumG = 0, sumB = 0;
      let darkPixels = 0, brownPixels = 0, vividPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        sumR += r; sumG += g; sumB += b;

        const brightness = (r + g + b) / 3;
        if (brightness < 60) darkPixels++;

        // Brownish: R dominant, low B, G moderate
        if (r > 100 && g > 60 && g < r && b < 80) brownPixels++;

        // Vivid / colorful
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        if (maxC - minC > 60 && maxC > 80) vividPixels++;
      }

      const avgR = sumR / count;
      const avgG = sumG / count;
      const avgB = sumB / count;
      const brightness = (avgR + avgG + avgB) / 3;
      const darkRatio = darkPixels / count;
      const brownRatio = brownPixels / count;
      const vividRatio = vividPixels / count;

      // Scoring
      let score = 55;

      // Good brightness range
      if (brightness > 80 && brightness < 210) score += 15;
      else if (brightness < 40) score -= 25;
      else if (brightness > 230) score -= 5;

      // Vibrancy = freshness
      score += Math.round(vividRatio * 30);

      // Brown/dull = less fresh
      score -= Math.round(brownRatio * 35);

      // Dark = concerning
      score -= Math.round(darkRatio * 20);

      // Green presence (fresh produce)
      if (avgG > avgR + 10 && avgG > avgB + 10) score += 10;

      score = Math.max(10, Math.min(96, score));

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
        advice = 'Food may be losing freshness. Please verify quality before listing.';
      }

      resolve({ score, label, color, advice, isAnalyzing: false });
    };

    img.onerror = () => {
      resolve({ score: 50, label: 'Unable to Analyse', color: 'text-gray-600 bg-gray-50 border-gray-200', advice: 'Could not read the image. Please try a different photo.', isAnalyzing: false });
    };

    img.src = dataUrl;
  });
}
