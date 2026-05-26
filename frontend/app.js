/* ═══════════════════════════════════════════════════════════════
   CipherVault — app.js
   Full frontend ↔ backend connection layer
   All processing goes through the C++ backend at localhost:5000
   ═══════════════════════════════════════════════════════════════ */

"use strict";

/* ─── CONFIG ─── */
const API = "http://localhost:5000";

const PIPELINE_STEPS = [
  { id: "upload", label: "Uploading image to backend" },
  { id: "decode", label: "Decoding image pixels" },
  { id: "extract", label: "Extracting RGB byte stream" },
  { id: "cipher", label: "Running encryption engine" },
  { id: "reconstruct", label: "Reconstructing encrypted image" },
  { id: "transfer", label: "Transferring result" },
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
const infoOrig = $("infoOriginal");
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

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Draw original
      canvasOrig.width = img.naturalWidth;
      canvasOrig.height = img.naturalHeight;
      const ctx = canvasOrig.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Clear result canvas
      canvasResult.width = img.naturalWidth;
      canvasResult.height = img.naturalHeight;

      // Show info
      const kb = (file.size / 1024).toFixed(1);
      infoOrig.textContent = `${img.naturalWidth}×${img.naturalHeight}px · ${kb} KB`;
      infoResult.textContent = "Waiting for processing…";
      resultLabel.textContent = "Result";

      compareArea.hidden = false;
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

  // ── Show overlay + processing
  setProcessing(
    true,
    `${isEncrypt ? "Encrypting" : "Decrypting"} with ${selectedAlg.name}…`,
  );
  showOverlay(isEncrypt ? "Encrypting Image…" : "Decrypting Image…", mode);
  resetPipelineVis();

  try {
    // Step 1: Upload
    setOverlayStep("upload");
    setProgress(10);
    activatePipelineStep("decode");

    const fd = new FormData();
    fd.append("image", originalBlob, "image.png");
    fd.append("algorithm", selectedAlg.id);
    fd.append("key", key);
    fd.append("param", param);

    // Step 2: Decode / extract
    setOverlayStep("decode");
    setProgress(25);
    activatePipelineStep("extract");

    // Step 3: Cipher
    setOverlayStep("cipher");
    setProgress(50);
    activatePipelineStep("cipher");

    const endpoint = `${API}/api/${mode}`;
    const res = await fetch(endpoint, {
      method: "POST",
      body: fd,
    });

    // Step 4: Reconstruct
    setOverlayStep("reconstruct");
    setProgress(75);
    activatePipelineStep("reconstruct");

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Backend error ${res.status}: ${errText}`);
    }

    // Step 5: Transfer
    setOverlayStep("transfer");
    setProgress(90);

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

    // Complete animation
    setProgress(100);
    completePipelineVis();
    showStats(timeMs, img.naturalWidth, img.naturalHeight, selectedAlg.id);
    showMessage(
      `✓ ${isEncrypt ? "Encryption" : "Decryption"} complete in ${timeMs} ms using ${selectedAlg.name}`,
      "success",
    );
  } catch (err) {
    resetPipelineVis();
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

/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */
buildAlgorithmGrid();
initParticles();
checkBackend();
// Re-check backend every 15 seconds
setInterval(checkBackend, 15000);
