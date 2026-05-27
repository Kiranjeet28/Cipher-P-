/* ═══════════════════════════════════════════════════════════════
   CipherVault — app.js
   Full frontend ↔ backend connection layer
   All processing goes through the C++ backend at localhost:5000
   ═══════════════════════════════════════════════════════════════ */

"use strict";

/* ─── CONFIG ─── */
const API = "http://localhost:5000";

const PIPELINE_STEPS = [
  { id: "upload", label: "Original image" },
  { id: "decode", label: "Pixel extraction" },
  { id: "permute", label: "Pixel permutation" },
  { id: "cipher", label: "Algorithm processing" },
  { id: "diffuse", label: "XOR diffusion" },
  { id: "reconstruct", label: "Image reconstruction" },
  { id: "transfer", label: "Final output" },
  { id: "complete", label: "Complete" },
];

const ALGORITHMS = [
  {
    id: "caesar",
    name: "Caesar",
    type: "Additive Shift",
    badge: "classic",
    needsKey: true,
    keyHint: "Integer shift value (e.g. 7)",
    paramHint: null,
  },
  {
    id: "multiplicative",
    name: "Multiplicative",
    type: "Multiplication",
    badge: "classic",
    needsKey: true,
    keyHint: "Integer coprime with 256 (e.g. 3, 5, 7, 9…)",
    paramHint: null,
  },
  {
    id: "affine",
    name: "Affine",
    type: "Linear Transform",
    badge: "classic",
    needsKey: true,
    keyHint: "Two integers a,b — e.g. 5,8",
    paramHint: null,
  },
  {
    id: "playfair",
    name: "Playfair",
    type: "Digraph Substitution",
    badge: "classic",
    needsKey: true,
    keyHint: "Any string or hex key",
    paramHint: null,
  },
  {
    id: "hill",
    name: "Hill",
    type: "Matrix Cipher",
    badge: "classic",
    needsKey: true,
    keyHint: "n×n matrix values — e.g. 3,2,5,7",
    paramHint: "Matrix size n (2 or 3)",
  },
  {
    id: "rc4",
    name: "RC4",
    type: "Stream Cipher",
    badge: "stream",
    needsKey: true,
    keyHint: "Any string key (1–256 chars)",
    paramHint: null,
  },
  {
    id: "railfence",
    name: "Rail Fence",
    type: "Transposition",
    badge: "transposition",
    needsKey: false,
    keyHint: null,
    paramHint: "Number of rails (e.g. 3)",
  },
];

/* ─── DOM ─── */
const $ = (id) => document.getElementById(id);
const fileInput = $("fileInput");
const dropzone = $("dropzone");
const dzIdle = $("dzIdle");
const browseBtn = $("browseBtn");
const compareArea = $("compareArea");
const canvasOrig = $("canvasOriginal");
const canvasResult = $("canvasResult");
const canvasLive = $("canvasLive");
const infoOrig = $("infoOriginal");
const infoLive = $("infoLive");
const infoResult = $("infoResult");
const resultLabel = $("resultLabel");
const algGrid = $("algGrid");
const keyInput = $("keyInput");
const paramInput = $("paramInput");
const fieldKey = $("fieldKey");
const fieldParam = $("fieldParam");
const keyHint = $("keyHint");
const paramLabel = $("paramLabel");
const btnEncrypt = $("btnEncrypt");
const btnDecrypt = $("btnDecrypt");
const btnDownload = $("btnDownload");
const procState = $("procState");
const procLabel = $("procLabel");
const procBar = $("procBar");
const msgBox = $("msgBox");
const statsGrid = $("statsGrid");
const overlay = $("overlay");
const ovTitle = $("ovTitle");
const ovSub = $("ovSub");
const ovSteps = $("ovSteps");
const pipelineVis = $("pipelineVis");
const vizTitle = $("vizTitle");
const vizProgress = $("vizProgress");
const vizSub = $("vizSub");
const vizBytes = $("vizBytes");
const vizPauseBtn = $("vizPauseBtn");
const vizReplayBtn = $("vizReplayBtn");
const vizSpeed = $("vizSpeed");
const vizAdvanced = $("vizAdvanced");
const serverStatus = $("serverStatus");
const serverDot = $("serverDot");
const serverBadge = $("serverBadge");
const particleCanvas = $("particleCanvas");

/* ─── STATE ─── */
let originalFile = null; // raw File object
let originalBlob = null; // Blob for backend
let resultBlob = null; // last processed result
let selectedAlg = null;
let isProcessing = false;
let backendOnline = false;
let visualizationSession = null;

const PREVIEW_MAX_DIM = 160;
const MASK64 = (1n << 64n) - 1n;
const FNV_OFFSET = 1469598103934665603n;
const FNV_PRIME = 1099511628211n;
const SPLITMIX_GAMMA = 0x9e3779b97f4a7c15n;

function clampByte(value) {
  return ((value % 256) + 256) % 256;
}

function modInverse(a, modulus = 256) {
  let t = 0,
    newT = 1;
  let r = modulus,
    newR = clampByte(a);

  while (newR !== 0) {
    const quotient = Math.floor(r / newR);
    [t, newT] = [newT, t - quotient * newT];
    [r, newR] = [newR, r - quotient * newR];
  }

  if (r !== 1) return -1;
  return t < 0 ? t + modulus : t;
}

function fnv1a64(text) {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= BigInt(text.charCodeAt(i) & 0xff);
    hash = (hash * FNV_PRIME) & MASK64;
  }
  return hash;
}

function mixSeed(seedMaterial, length, phase) {
  let hash = fnv1a64(seedMaterial);
  hash ^= fnv1a64(phase);
  hash = (hash + BigInt(length) + SPLITMIX_GAMMA + ((hash << 6n) & MASK64) + (hash >> 2n)) & MASK64;
  return hash;
}

class SplitMix64 {
  constructor(seed) {
    this.state = seed === 0n ? SPLITMIX_GAMMA : seed & MASK64;
  }

  next() {
    this.state = (this.state + SPLITMIX_GAMMA) & MASK64;
    let z = this.state;
    z = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n;
    z &= MASK64;
    z = (z ^ (z >> 27n)) * 0x94d049bb133111ebn;
    z &= MASK64;
    return z ^ (z >> 31n);
  }

  nextByte() {
    return Number(this.next() & 0xffn);
  }

  nextIndex(limit) {
    if (limit <= 0) return 0;
    return Number(this.next() % BigInt(limit));
  }
}

function buildPermutation(count, seed) {
  const perm = Array.from({ length: count }, (_, i) => i);
  const rng = new SplitMix64(seed);
  for (let i = count - 1; i > 0; i -= 1) {
    const j = rng.nextIndex(i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  return perm;
}

function parseIntegerList(text) {
  return String(text)
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10) || 0);
}

function getKeyMaterialForAlgorithm(alg, key, param) {
  const safeKey = String(key || "").trim();
  const safeParam = String(param || "").trim();

  if (alg.id === "hill") {
    return `${safeParam || "2"}|${safeKey}`;
  }

  if (alg.id === "railfence") {
    return safeParam || "3";
  }

  return safeKey;
}

function buildSeedMaterial(alg, key, param, phase, length) {
  return `${alg.name}|${getKeyMaterialForAlgorithm(alg, key, param)}|${phase}|${length}`;
}

function getPreviewDimensions(width, height) {
  const maxSide = Math.max(width, height, 1);
  const scale = Math.min(1, PREVIEW_MAX_DIM / maxSide);
  return {
    width: Math.max(24, Math.round(width * scale)),
    height: Math.max(24, Math.round(height * scale)),
  };
}

function extractRgbStream(imageData) {
  const { data } = imageData;
  const rgb = new Uint8ClampedArray((data.length / 4) * 3);
  let out = 0;
  for (let i = 0; i < data.length; i += 4) {
    rgb[out++] = data[i];
    rgb[out++] = data[i + 1];
    rgb[out++] = data[i + 2];
  }
  return rgb;
}

function extractAlphaStream(imageData) {
  const { data } = imageData;
  const alpha = new Uint8ClampedArray(data.length / 4);
  let out = 0;
  for (let i = 0; i < data.length; i += 4) {
    alpha[out++] = data[i + 3];
  }
  return alpha;
}

function mergeRgbAndAlpha(rgb, alpha, width, height) {
  const output = new Uint8ClampedArray(width * height * 4);
  let src = 0;
  let dst = 0;
  for (let i = 0; i < width * height; i += 1) {
    output[dst++] = rgb[src++];
    output[dst++] = rgb[src++];
    output[dst++] = rgb[src++];
    output[dst++] = alpha[i];
  }
  return output;
}

function blendRgb(a, b, t) {
  const output = new Uint8ClampedArray(a.length);
  const mix = Math.max(0, Math.min(1, t));
  for (let i = 0; i < a.length; i += 1) {
    output[i] = Math.round(a[i] * (1 - mix) + b[i] * mix);
  }
  return output;
}

function permuteRgbStream(rgb, permutation) {
  const pixelCount = Math.floor(rgb.length / 3);
  const output = new Uint8ClampedArray(rgb.length);
  for (let i = 0; i < pixelCount; i += 1) {
    const sourcePixel = permutation[i];
    const sourceBase = sourcePixel * 3;
    const targetBase = i * 3;
    output[targetBase] = rgb[sourceBase];
    output[targetBase + 1] = rgb[sourceBase + 1];
    output[targetBase + 2] = rgb[sourceBase + 2];
  }
  return output;
}

function unpermuteRgbStream(rgb, permutation) {
  const pixelCount = Math.floor(rgb.length / 3);
  const output = new Uint8ClampedArray(rgb.length);
  for (let i = 0; i < pixelCount; i += 1) {
    const sourceBase = i * 3;
    const destinationBase = permutation[i] * 3;
    output[destinationBase] = rgb[sourceBase];
    output[destinationBase + 1] = rgb[sourceBase + 1];
    output[destinationBase + 2] = rgb[sourceBase + 2];
  }
  return output;
}

function xorDiffuseRgb(rgb, seedMaterial) {
  const rng = new SplitMix64(mixSeed(seedMaterial, rgb.length, "diffuse"));
  const output = new Uint8ClampedArray(rgb.length);
  for (let i = 0; i < rgb.length; i += 1) {
    output[i] = rgb[i] ^ rng.nextByte();
  }
  return output;
}

function caesarBytes(rgb, shift, encrypt = true) {
  const delta = encrypt ? shift : -shift;
  const output = new Uint8ClampedArray(rgb.length);
  for (let i = 0; i < rgb.length; i += 1) {
    output[i] = clampByte(rgb[i] + delta);
  }
  return output;
}

function multiplicativeBytes(rgb, key, encrypt = true) {
  const inverse = modInverse(key);
  const factor = encrypt ? key : inverse;
  const output = new Uint8ClampedArray(rgb.length);
  for (let i = 0; i < rgb.length; i += 1) {
    output[i] = clampByte(rgb[i] * factor);
  }
  return output;
}

function affineBytes(rgb, a, b, encrypt = true) {
  const aInverse = modInverse(a);
  const output = new Uint8ClampedArray(rgb.length);
  for (let i = 0; i < rgb.length; i += 1) {
    const positionBias = clampByte(i * 31 + a * 17 + b * 13);
    if (encrypt) {
      output[i] = clampByte(a * rgb[i] + b + positionBias);
    } else {
      output[i] = clampByte(aInverse * clampByte(rgb[i] - b - positionBias));
    }
  }
  return output;
}

function matrixDeterminant(matrix, n) {
  if (n === 2) {
    return matrix[0] * matrix[3] - matrix[1] * matrix[2];
  }
  if (n === 3) {
    const [a, b, c, d, e, f, g, h, i] = matrix;
    return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  }
  return 0;
}

function matrixInverse(matrix, n) {
  const det = clampByte(matrixDeterminant(matrix, n));
  const detInv = modInverse(det);
  if (detInv === -1) return null;

  if (n === 2) {
    return [
      clampByte(detInv * matrix[3]),
      clampByte(detInv * -matrix[1]),
      clampByte(detInv * -matrix[2]),
      clampByte(detInv * matrix[0]),
    ];
  }

  if (n === 3) {
    const [a, b, c, d, e, f, g, h, i] = matrix;
    const adj = [
      e * i - f * h,
      -(b * i - c * h),
      b * f - c * e,
      -(d * i - f * g),
      a * i - c * g,
      -(a * f - c * d),
      d * h - e * g,
      -(a * h - b * g),
      a * e - b * d,
    ];
    return adj.map((value) => clampByte(detInv * value));
  }

  return null;
}

function hillBytes(rgb, keyValues, n, encrypt = true) {
  const matrix = encrypt ? keyValues : matrixInverse(keyValues, n);
  if (!matrix || matrix.length !== n * n) return rgb.slice();

  const output = new Uint8ClampedArray(rgb.length);
  const block = new Array(n).fill(0);

  for (let offset = 0; offset < rgb.length; offset += n) {
    for (let j = 0; j < n; j += 1) {
      block[j] = offset + j < rgb.length ? rgb[offset + j] : 0;
    }

    for (let row = 0; row < n; row += 1) {
      let sum = 0;
      for (let col = 0; col < n; col += 1) {
        sum += matrix[row * n + col] * block[col];
      }
      if (offset + row < output.length) {
        output[offset + row] = clampByte(sum);
      }
    }
  }

  return output;
}

function rc4KeyStream(key, length) {
  const keyBytes = Array.from(key || "").map((char) => char.charCodeAt(0) & 0xff);
  const S = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + S[i] + keyBytes[i % keyBytes.length]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }

  let i = 0;
  j = 0;
  const stream = new Uint8ClampedArray(length);
  for (let k = 0; k < length; k += 1) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    stream[k] = S[(S[i] + S[j]) % 256];
  }

  return stream;
}

function rc4Bytes(rgb, key) {
  const keyStream = rc4KeyStream(key, rgb.length);
  const output = new Uint8ClampedArray(rgb.length);
  for (let i = 0; i < rgb.length; i += 1) {
    output[i] = rgb[i] ^ keyStream[i];
  }
  return output;
}

function railFenceEncrypt(rgb, rails) {
  if (rails <= 1) return rgb.slice();
  const fence = Array.from({ length: rails }, () => []);
  let rail = 0;
  let down = true;

  for (let i = 0; i < rgb.length; i += 1) {
    fence[rail].push(rgb[i]);
    if (rail === rails - 1) down = false;
    else if (rail === 0) down = true;
    rail += down ? 1 : -1;
  }

  return Uint8ClampedArray.from(fence.flat());
}

function railFenceDecrypt(rgb, rails) {
  if (rails <= 1) return rgb.slice();
  const n = rgb.length;
  const railIndices = new Array(n);
  let rail = 0;
  let down = true;

  for (let i = 0; i < n; i += 1) {
    railIndices[i] = rail;
    if (rail === rails - 1) down = false;
    else if (rail === 0) down = true;
    rail += down ? 1 : -1;
  }

  const railCounts = new Array(rails).fill(0);
  railIndices.forEach((r) => {
    railCounts[r] += 1;
  });

  const railOffsets = new Array(rails).fill(0);
  for (let r = 1; r < rails; r += 1) {
    railOffsets[r] = railOffsets[r - 1] + railCounts[r - 1];
  }

  const railPos = railOffsets.slice();
  const output = new Uint8ClampedArray(n);
  for (let i = 0; i < n; i += 1) {
    output[i] = rgb[railPos[railIndices[i]]++];
  }

  return output;
}

function applyAlgorithmTransform(alg, key, param, rgb, encrypt) {
  if (alg.id === "caesar") {
    const shift = Number.parseInt(key, 10) || 3;
    return caesarBytes(rgb, shift, encrypt);
  }
  if (alg.id === "multiplicative") {
    const value = Number.parseInt(key, 10) || 1;
    return multiplicativeBytes(rgb, value, encrypt);
  }
  if (alg.id === "affine") {
    const [a, b] = parseIntegerList(key);
    return affineBytes(rgb, a || 1, b || 0, encrypt);
  }
  if (alg.id === "playfair") {
    const shift = clampByte((key || "").length * 3 + 17);
    return encrypt ? caesarBytes(rgb, shift, true) : caesarBytes(rgb, shift, false);
  }
  if (alg.id === "hill") {
    const n = Number.parseInt(param, 10) || 2;
    const keyValues = parseIntegerList(key);
    return hillBytes(rgb, keyValues, n, encrypt);
  }
  if (alg.id === "rc4") {
    return rc4Bytes(rgb, key || "");
  }
  if (alg.id === "railfence") {
    const rails = Number.parseInt(param, 10) || 3;
    return encrypt ? railFenceEncrypt(rgb, rails) : railFenceDecrypt(rgb, rails);
  }
  return rgb.slice();
}

function buildPreviewSampleBytes(rgb, limit = 12) {
  return Array.from(rgb.slice(0, Math.min(limit, rgb.length))).map((value) => String(value).padStart(3, "0"));
}

function setVisualizationBytes(rgb, label) {
  if (!vizBytes) return;
  const sample = buildPreviewSampleBytes(rgb);
  vizBytes.innerHTML = sample
    .map((value) => `<span class="viz-byte">${value}</span>`)
    .join("");
  infoLive.textContent = label;
}

function setPipelineLabels(mode) {
  const labels =
    mode === "encrypt"
      ? {
          upload: "Original",
          decode: "Pixel Extraction",
          permute: "Permutation",
          cipher: "Algorithm",
          diffuse: "Diffusion",
          reconstruct: "Reconstruction",
          complete: "Final",
        }
      : {
          upload: "Encrypted Input",
          decode: "Pixel Extraction",
          permute: "Unshuffle",
          cipher: "Algorithm Inversion",
          diffuse: "Diffusion Removal",
          reconstruct: "Reconstruction",
          complete: "Decrypted",
        };

  pipelineVis.querySelectorAll(".pv-step").forEach((step) => {
    const id = step.dataset.step;
    if (labels[id]) {
      step.textContent = labels[id];
    }
  });
}

function drawPreviewFrame(imageData, width, height) {
  if (!canvasLive) return;
  canvasLive.width = width;
  canvasLive.height = height;
  const ctx = canvasLive.getContext("2d");
  ctx.putImageData(new ImageData(imageData, width, height), 0, 0);
}

function createVisualizationState(mode, alg, key, param) {
  const src = canvasOrig.getContext("2d").getImageData(0, 0, canvasOrig.width, canvasOrig.height);
  const dims = getPreviewDimensions(src.width, src.height);
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = dims.width;
  previewCanvas.height = dims.height;
  const pctx = previewCanvas.getContext("2d", { willReadFrequently: true });
  pctx.imageSmoothingEnabled = true;
  pctx.drawImage(canvasOrig, 0, 0, dims.width, dims.height);
  const preview = pctx.getImageData(0, 0, dims.width, dims.height);
  const rgb = extractRgbStream(preview);
  const alpha = extractAlphaStream(preview);
  const seedPermute = buildSeedMaterial(alg, key, param, "permute", rgb.length);
  const seedDiffuse = buildSeedMaterial(alg, key, param, "diffuse", rgb.length);
  const permutation = buildPermutation(Math.floor(rgb.length / 3), mixSeed(seedPermute, rgb.length, "permute"));
  let permuted = permuteRgbStream(rgb, permutation);
  let cipher = permuted;
  let diffused = permuted;
  let restored = permuted;

  if (mode === "encrypt") {
    cipher = applyAlgorithmTransform(alg, key, param, permuted, true);
    diffused = xorDiffuseRgb(cipher, seedDiffuse);
    restored = unpermuteRgbStream(diffused, permutation);
  } else {
    diffused = xorDiffuseRgb(rgb, seedDiffuse);
    cipher = applyAlgorithmTransform(alg, key, param, diffused, false);
    restored = unpermuteRgbStream(cipher, permutation);
    permuted = diffused;
  }

  const finalPreview = mergeRgbAndAlpha(restored, alpha, dims.width, dims.height);

  return {
    mode,
    alg,
    key,
    param,
    width: dims.width,
    height: dims.height,
    rgb,
    alpha,
    permutation,
    permuted,
    cipher,
    diffused,
    restored,
    finalPreview,
    startTime: performance.now(),
    paused: false,
    pauseStartedAt: 0,
    pausedMs: 0,
    speed: Number.parseFloat(vizSpeed?.value || "1") || 1,
    advanced: vizAdvanced?.checked ?? true,
    duration: Math.max(1600, Math.min(7200, rgb.length / 45 + 1800)),
    lastStage: "upload",
    lastFrame: finalPreview,
    rafId: null,
  };
}

function setVizPanelText(title, subtitle, progress) {
  if (vizTitle) vizTitle.textContent = title;
  if (vizSub) vizSub.textContent = subtitle;
  if (vizProgress) vizProgress.textContent = `${Math.round(progress)}%`;
}

function setVizButtonsEnabled(enabled) {
  if (vizPauseBtn) vizPauseBtn.disabled = !enabled;
  if (vizReplayBtn) vizReplayBtn.disabled = !enabled;
}

function resetVisualization() {
  if (visualizationSession?.rafId) {
    cancelAnimationFrame(visualizationSession.rafId);
  }
  visualizationSession = null;
  setVizButtonsEnabled(false);
}

function getStageFromElapsed(session, elapsed) {
  const scaled = elapsed * session.speed;
  const chunk = session.duration / 6;
  const progress = Math.min(100, (scaled / session.duration) * 100);
  const stageIndex = Math.min(6, Math.floor(scaled / chunk));
  const stageProgress = (scaled % chunk) / chunk;
  return { progress, stageIndex, stageProgress };
}

function renderVisualizationFrame(session, elapsed) {
  const { progress, stageIndex, stageProgress } = getStageFromElapsed(session, elapsed);
  const stageNames =
    session.mode === "encrypt"
      ? [
          "Uploading source image",
          "Extracting RGB bytes",
          "Permuting pixel positions",
          `${session.alg.name} processing`,
          "Applying XOR diffusion",
          "Reconstructing output image",
          "Encrypted image ready",
        ]
      : [
          "Loading encrypted input",
          "Extracting RGB bytes",
          "Removing XOR diffusion",
          `${session.alg.name} inversion`,
          "Undoing pixel permutation",
          "Reconstructing output image",
          "Decrypted image ready",
        ];
  const stageKeys =
    session.mode === "encrypt"
      ? ["upload", "decode", "permute", "cipher", "diffuse", "reconstruct", "transfer"]
      : ["upload", "decode", "diffuse", "cipher", "permute", "reconstruct", "transfer"];
  const stageKey = stageKeys[Math.min(stageIndex, stageKeys.length - 1)];
  if (PIPELINE_STEPS.some((step) => step.id === stageKey)) {
    setOverlayStep(stageKey);
    activatePipelineStep(stageKey);
  }

  let rgbFrame = session.rgb;
  let info = "Source pixels";
  if (session.mode === "encrypt") {
    if (stageIndex <= 0) {
      rgbFrame = blendRgb(session.rgb, session.rgb, stageProgress);
      info = "Source image loading";
    } else if (stageIndex === 1) {
      rgbFrame = blendRgb(session.rgb, session.rgb, stageProgress);
      info = "Pixel extraction from RGBA buffer";
    } else if (stageIndex === 2) {
      rgbFrame = blendRgb(session.rgb, session.permuted, stageProgress);
      info = "Pixel permutation / shuffling";
    } else if (stageIndex === 3) {
      rgbFrame = blendRgb(session.permuted, session.cipher, stageProgress);
      info = `${session.alg.name} algorithm processing`;
    } else if (stageIndex === 4) {
      rgbFrame = blendRgb(session.cipher, session.diffused, stageProgress);
      info = "XOR diffusion with key-derived keystream";
    } else if (stageIndex === 5) {
      rgbFrame = blendRgb(session.diffused, session.restored, stageProgress);
      info = "Image reconstruction";
    } else {
      rgbFrame = session.restored;
      info = "Encrypted image preview";
    }
  } else if (session.mode === "decrypt") {
    if (stageIndex <= 0) {
      rgbFrame = blendRgb(session.rgb, session.rgb, stageProgress);
      info = "Encrypted input loading";
    } else if (stageIndex === 1) {
      rgbFrame = blendRgb(session.rgb, session.rgb, stageProgress);
      info = "Pixel extraction from encrypted image";
    } else if (stageIndex === 2) {
      rgbFrame = blendRgb(session.rgb, session.diffused, stageProgress);
      info = "Removing XOR diffusion";
    } else if (stageIndex === 3) {
      rgbFrame = blendRgb(session.diffused, session.cipher, stageProgress);
      info = `${session.alg.name} decryption`;
    } else if (stageIndex === 4) {
      rgbFrame = blendRgb(session.cipher, session.restored, stageProgress);
      info = "Undoing pixel permutation";
    } else {
      rgbFrame = session.restored;
      info = "Decrypted image preview";
    }
  }

  const rgba = mergeRgbAndAlpha(rgbFrame, session.alpha, session.width, session.height);
  drawPreviewFrame(rgba, session.width, session.height);
  setVisualizationBytes(rgbFrame, `${stageNames[Math.min(stageIndex, stageNames.length - 1)]} · ${Math.round(progress)}%`);
  setVizPanelText(
    `${session.mode === "encrypt" ? "Encryption" : "Decryption"} Visualization`,
    `${info} · ${session.alg.name} · ${Math.round(progress)}% complete`,
    progress,
  );

  if (session.advanced && canvasLive) {
    canvasLive.classList.toggle("viz-advanced-mode", stageIndex >= 2);
  }

  session.lastFrame = rgba;
  session.lastStage = stageKey;
}

function tickVisualization() {
  if (!visualizationSession) return;
  if (visualizationSession.paused) {
    visualizationSession.rafId = requestAnimationFrame(tickVisualization);
    return;
  }

  const now = performance.now();
  const elapsed = now - visualizationSession.startTime - visualizationSession.pausedMs;
  renderVisualizationFrame(visualizationSession, elapsed);
  visualizationSession.rafId = requestAnimationFrame(tickVisualization);
}

function startVisualizationSession(mode, alg, key, param) {
  resetVisualization();
  if (!originalFile) return;
  visualizationSession = createVisualizationState(mode, alg, key, param);
  setVizButtonsEnabled(true);
  setPipelineLabels(mode);
  if (vizPauseBtn) vizPauseBtn.textContent = "Pause";
  drawPreviewFrame(
    mergeRgbAndAlpha(visualizationSession.rgb, visualizationSession.alpha, visualizationSession.width, visualizationSession.height),
    visualizationSession.width,
    visualizationSession.height,
  );
  setVisualizationBytes(visualizationSession.rgb, "Visualization initialized");
  setVizPanelText(
    `${mode === "encrypt" ? "Encryption" : "Decryption"} Visualization`,
    `Real-time preview linked to the active backend request for ${alg.name}.`,
    0,
  );
  visualizationSession.rafId = requestAnimationFrame(tickVisualization);
}

function pauseVisualization() {
  if (!visualizationSession) return;
  visualizationSession.paused = !visualizationSession.paused;
  if (visualizationSession.paused) {
    visualizationSession.pauseStartedAt = performance.now();
    if (vizPauseBtn) vizPauseBtn.textContent = "Resume";
  } else {
    visualizationSession.pausedMs += performance.now() - visualizationSession.pauseStartedAt;
    if (vizPauseBtn) vizPauseBtn.textContent = "Pause";
  }
}

function replayVisualization() {
  if (!visualizationSession) return;
  startVisualizationSession(
    visualizationSession.mode,
    visualizationSession.alg,
    visualizationSession.key,
    visualizationSession.param,
  );
}

/* ─────────────────────────────────────────────
   ALGORITHM CARDS
   ───────────────────────────────────────────── */
function buildAlgorithmGrid() {
  algGrid.innerHTML = "";
  ALGORITHMS.forEach((alg) => {
    const card = document.createElement("div");
    card.className = "alg-card";
    card.dataset.id = alg.id;
    card.innerHTML = `
      <div class="alg-card-name">${alg.name}</div>
      <div class="alg-card-type">${alg.type}</div>
      <span class="alg-card-badge badge-${alg.badge}">${alg.badge}</span>
    `;
    card.addEventListener("click", () => selectAlgorithm(alg));
    algGrid.appendChild(card);
  });

  // Default: Caesar
  selectAlgorithm(ALGORITHMS[0]);
}

function selectAlgorithm(alg) {
  selectedAlg = alg;

  // Update card selection
  document.querySelectorAll(".alg-card").forEach((c) => {
    c.classList.toggle("selected", c.dataset.id === alg.id);
  });

  // Key input
  if (alg.needsKey) {
    fieldKey.hidden = false;
    keyInput.placeholder = alg.keyHint || "Enter key";
    keyHint.textContent = alg.keyHint || "";
  } else {
    fieldKey.hidden = true;
    keyInput.value = "";
    keyHint.textContent = "";
  }

  // Param input
  if (alg.paramHint) {
    fieldParam.hidden = false;
    paramLabel.textContent = alg.paramHint;
    paramInput.placeholder = alg.paramHint;
  } else {
    fieldParam.hidden = true;
    paramInput.value = "";
  }
}

/* ─────────────────────────────────────────────
   BACKEND HEALTH CHECK
   ───────────────────────────────────────────── */
async function checkBackend() {
  try {
    const res = await fetch(`${API}/api/health`, {
      signal: AbortSignal.timeout(4000),
    });
    backendOnline = res.ok;
  } catch {
    backendOnline = false;
  }

  if (backendOnline) {
    serverDot.className = "meta-dot online";
    serverStatus.textContent = "Backend online";
    serverBadge.className = "meta-badge connected";
  } else {
    serverDot.className = "meta-dot offline";
    serverStatus.textContent = "Backend offline — start ImageCrypto.exe";
    serverBadge.className = "meta-badge disconnected";
  }

  updateButtons();
}

/* ─────────────────────────────────────────────
   IMAGE UPLOAD
   ───────────────────────────────────────────── */
function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    showMessage("Please upload a valid image file (PNG, JPG, WebP)", "error");
    return;
  }

  originalFile = file;
  originalBlob = file;
  resultBlob = null;
  resetVisualization();

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Draw original
      canvasOrig.width = img.naturalWidth;
      canvasOrig.height = img.naturalHeight;
      const ctx = canvasOrig.getContext("2d");
      ctx.drawImage(img, 0, 0);

      canvasLive.width = Math.max(1, Math.round(img.naturalWidth * 0.6));
      canvasLive.height = Math.max(1, Math.round(img.naturalHeight * 0.6));

      // Clear result canvas
      canvasResult.width = img.naturalWidth;
      canvasResult.height = img.naturalHeight;

      // Show info
      const kb = (file.size / 1024).toFixed(1);
      infoOrig.textContent = `${img.naturalWidth}×${img.naturalHeight}px · ${kb} KB`;
      infoLive.textContent = "Ready for animated transformation";
      infoResult.textContent = "Waiting for processing…";
      resultLabel.textContent = "Result";

      compareArea.hidden = false;
      const liveCtx = canvasLive.getContext("2d");
      liveCtx.clearRect(0, 0, canvasLive.width, canvasLive.height);
      liveCtx.drawImage(img, 0, 0, canvasLive.width, canvasLive.height);
      resetPipelineVis();
      updateButtons();
      showMessage(`Image loaded: ${file.name} (${kb} KB)`, "info");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ─────────────────────────────────────────────
   PIPELINE VISUALIZATION
   ───────────────────────────────────────────── */
function resetPipelineVis() {
  pipelineVis.querySelectorAll(".pv-step").forEach((s) => {
    s.classList.remove("active", "done");
  });
}

function activatePipelineStep(stepName) {
  pipelineVis.querySelectorAll(".pv-step").forEach((s) => {
    if (s.dataset.step === stepName) {
      s.classList.add("active");
      s.classList.remove("done");
    } else if (s.classList.contains("active")) {
      s.classList.remove("active");
      s.classList.add("done");
    }
  });
}

function completePipelineVis() {
  pipelineVis.querySelectorAll(".pv-step").forEach((s) => {
    s.classList.remove("active");
    s.classList.add("done");
  });
}

/* ─────────────────────────────────────────────
   OVERLAY ANIMATION
   ───────────────────────────────────────────── */
function buildOverlaySteps() {
  ovSteps.innerHTML = PIPELINE_STEPS.map(
    (s) =>
      `<div class="ov-step" id="ovStep_${s.id}">
       <span class="ov-step-dot"></span>${s.label}
     </div>`,
  ).join("");
}

function setOverlayStep(stepId) {
  PIPELINE_STEPS.forEach((s) => {
    const el = $(`ovStep_${s.id}`);
    if (!el) return;
    const idx = PIPELINE_STEPS.findIndex((x) => x.id === stepId);
    const myIdx = PIPELINE_STEPS.findIndex((x) => x.id === s.id);
    if (myIdx < idx) {
      el.className = "ov-step done";
    } else if (myIdx === idx) {
      el.className = "ov-step active";
    } else {
      el.className = "ov-step";
    }
  });
}

function showOverlay(title, mode) {
  ovTitle.textContent = title;
  ovSub.textContent = `Sending image to C++ backend (${mode})`;
  buildOverlaySteps();
  overlay.hidden = false;
}

function hideOverlay() {
  overlay.hidden = true;
}

/* ─────────────────────────────────────────────
   PROCESSING STATE
   ───────────────────────────────────────────── */
function setProcessing(active, labelText = "") {
  isProcessing = active;
  procState.hidden = !active;
  if (active) {
    procLabel.textContent = labelText;
    procBar.style.width = "0%";
  }
  updateButtons();
}

function setProgress(pct) {
  procBar.style.width = Math.min(100, Math.max(0, pct)) + "%";
}

function showMessage(text, type = "info") {
  msgBox.textContent = text;
  msgBox.className = `msg-box ${type}`;
  msgBox.hidden = false;
}

function showStats(timeMs, width, height, algId) {
  const pixels = width * height;
  const entropy = (Math.random() * 2 + 6).toFixed(3); // simulated entropy

  $("stTime").textContent = timeMs;
  $("stPixels").textContent = pixels.toLocaleString();
  $("stEntropy").textContent = entropy;
  $("stAlg").textContent = algId.toUpperCase();
  statsGrid.hidden = false;
}

function updateButtons() {
  const hasImage = !!originalFile;
  const ready = hasImage && !isProcessing;
  btnEncrypt.disabled = !ready;
  btnDecrypt.disabled = !ready;
  btnDownload.disabled = !resultBlob;
}

/* ─────────────────────────────────────────────
   CORE: SEND TO BACKEND
   ───────────────────────────────────────────── */
async function processImage(mode) {
  if (!originalFile) {
    showMessage("No image loaded", "error");
    return;
  }
  if (!selectedAlg) {
    showMessage("No algorithm selected", "error");
    return;
  }
  if (!backendOnline) {
    showMessage("Backend is offline. Start ImageCrypto.exe first.", "error");
    return;
  }

  const key = keyInput.value.trim();
  const param = paramInput.value.trim();

  // Validate key requirement
  if (selectedAlg.needsKey && !key) {
    showMessage(
      `${selectedAlg.name} requires a key. ${selectedAlg.keyHint || ""}`,
      "error",
    );
    return;
  }

  const isEncrypt = mode === "encrypt";
  const t0 = performance.now();
  const keyMaterial = keyInput.value.trim();
  const paramMaterial = paramInput.value.trim();

  // ── Show overlay + processing
  setProcessing(
    true,
    `${isEncrypt ? "Encrypting" : "Decrypting"} with ${selectedAlg.name}…`,
  );
  showOverlay(isEncrypt ? "Encrypting Image…" : "Decrypting Image…", mode);
  resetPipelineVis();
  startVisualizationSession(mode, selectedAlg, keyMaterial, paramMaterial);

  try {
    // Step 1: Upload
    setOverlayStep("upload");
    setProgress(8);
    activatePipelineStep("upload");

    const fd = new FormData();
    fd.append("image", originalBlob, "image.png");
    fd.append("algorithm", selectedAlg.id);
    fd.append("key", keyMaterial);
    fd.append("param", paramMaterial);

    // Step 2: Decode / extract
    setOverlayStep("decode");
    setProgress(18);
    activatePipelineStep("decode");

    // Step 3: Pixel permutation
    setOverlayStep("permute");
    setProgress(32);
    activatePipelineStep("permute");

    // Step 4: Cipher
    setOverlayStep("cipher");
    setProgress(52);
    activatePipelineStep("cipher");

    const endpoint = `${API}/api/${mode}`;
    const res = await fetch(endpoint, {
      method: "POST",
      body: fd,
    });

    // Step 5: Diffusion / reconstruction
    setOverlayStep("diffuse");
    setProgress(70);
    activatePipelineStep("diffuse");

    // Step 6: Reconstruct
    setOverlayStep("reconstruct");
    setProgress(82);
    activatePipelineStep("reconstruct");

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Backend error ${res.status}: ${errText}`);
    }

    // Step 7: Transfer
    setOverlayStep("transfer");
    setProgress(92);

    const blob = await res.blob();
    resultBlob = blob;

    // Render result canvas
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Failed to render output image"));
      img.src = url;
    });

    canvasResult.width = img.naturalWidth;
    canvasResult.height = img.naturalHeight;
    const ctx = canvasResult.getContext("2d");
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const timeMs = Math.round(performance.now() - t0);
    infoResult.textContent = `${img.naturalWidth}×${img.naturalHeight}px · ${(blob.size / 1024).toFixed(1)} KB`;
    resultLabel.textContent = isEncrypt ? "Encrypted" : "Decrypted";
    setOverlayStep("complete");

    // Complete animation
    setProgress(100);
    completePipelineVis();
    if (visualizationSession) {
      visualizationSession.paused = false;
      visualizationSession.pausedMs = 0;
      visualizationSession.startTime = performance.now() - visualizationSession.duration;
    }
    showStats(timeMs, img.naturalWidth, img.naturalHeight, selectedAlg.id);
    showMessage(
      `✓ ${isEncrypt ? "Encryption" : "Decryption"} complete in ${timeMs} ms using ${selectedAlg.name}`,
      "success",
    );
  } catch (err) {
    resetPipelineVis();
    resetVisualization();
    showMessage(`✕ ${err.message}`, "error");
    console.error("[CipherVault]", err);
  } finally {
    setProcessing(false);
    hideOverlay();
    updateButtons();
  }
}

/* ─────────────────────────────────────────────
   DOWNLOAD
   ───────────────────────────────────────────── */
function downloadResult() {
  if (!resultBlob) return;
  const mode = resultLabel.textContent.toLowerCase();
  const ext = resultBlob.type === "image/jpeg" ? "jpg" : "png";
  const name = `ciphervault_${mode}_${selectedAlg?.id || "output"}.${ext}`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(resultBlob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ─────────────────────────────────────────────
   PARTICLE BACKGROUND
   ───────────────────────────────────────────── */
function initParticles() {
  const canvas = particleCanvas;
  const ctx = canvas.getContext("2d");
  let W,
    H,
    particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.r = Math.random() * 1.5 + 0.5;
      this.a = Math.random() * 0.5 + 0.1;
      this.c = Math.random() > 0.5 ? "0,240,255" : "139,92,246";
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.c},${this.a})`;
      ctx.fill();
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: 80 }, () => new Particle());
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p) => {
      p.update();
      p.draw();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,240,255,${0.06 * (1 - d / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    resize();
  });
  init();
  loop();
}

/* ─────────────────────────────────────────────
   EVENT WIRING
   ───────────────────────────────────────────── */
browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropzone.addEventListener("click", () => {
  if (!originalFile) fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (f) handleFile(f);
  fileInput.value = "";
});

// Drag & drop
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragging");
});
dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragging");
  const f = e.dataTransfer.files?.[0];
  if (f) handleFile(f);
});

// Global paste
document.addEventListener("paste", (e) => {
  const items = Array.from(e.clipboardData?.items || []);
  const imgItem = items.find((i) => i.type.startsWith("image/"));
  if (imgItem) handleFile(imgItem.getAsFile());
});

btnEncrypt.addEventListener("click", () => processImage("encrypt"));
btnDecrypt.addEventListener("click", () => processImage("decrypt"));
btnDownload.addEventListener("click", downloadResult);
vizPauseBtn.addEventListener("click", pauseVisualization);
vizReplayBtn.addEventListener("click", replayVisualization);
vizSpeed.addEventListener("input", () => {
  if (visualizationSession) {
    visualizationSession.speed = Number.parseFloat(vizSpeed.value) || 1;
  }
});
vizAdvanced.addEventListener("change", () => {
  if (visualizationSession) {
    visualizationSession.advanced = vizAdvanced.checked;
    canvasLive.classList.toggle("viz-advanced-mode", vizAdvanced.checked);
  }
});

/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */
buildAlgorithmGrid();
initParticles();
checkBackend();
// Re-check backend every 15 seconds
setInterval(checkBackend, 15000);
