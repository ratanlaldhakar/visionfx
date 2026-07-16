/* ===========================================================
   FLOWER BLOOM — Real-time Hand Gesture Flower Controller
   ===========================================================
   Uses MediaPipe Hands to track hand gestures and render a
   procedural glowing flower that blooms, grows, and sways
   with wind — all on a Canvas overlay atop the webcam feed.
   =========================================================== */

// =============================================================
// NOISE — Organic movement via layered sine waves
// =============================================================
class OrganicNoise {
    constructor() {
        this.seeds = Array.from({ length: 8 }, () => Math.random() * 1000);
    }

    /** Returns a value roughly in [-1, 1] */
    get(t, channel = 0) {
        const s = this.seeds[channel % this.seeds.length];
        return (
            Math.sin(t * 0.7 + s) * 0.4 +
            Math.sin(t * 1.3 + s * 1.7) * 0.3 +
            Math.sin(t * 2.1 + s * 0.3) * 0.2 +
            Math.sin(t * 3.7 + s * 2.1) * 0.1
        );
    }
}

// =============================================================
// PARTICLE — Floating pollen / sparkle
// =============================================================
class Particle {
    constructor(cw, ch) {
        this.cw = cw;
        this.ch = ch;
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * this.cw;
        this.y = initial ? Math.random() * this.ch : this.ch + Math.random() * 40;
        this.radius = Math.random() * 2.5 + 0.5;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = -(Math.random() * 0.6 + 0.15);
        this.life = Math.random() * 300 + 150;
        this.maxLife = this.life;
        this.hue = 185 + Math.random() * 25;          // cyan accent tone (matches UI)
        this.brightness = 72 + Math.random() * 20;
        this.flickerPhase = Math.random() * Math.PI * 2;
    }

    update(windForce, dt) {
        this.x += this.vx + windForce * 1.8;
        this.y += this.vy;
        this.life -= dt;
        if (this.life <= 0 || this.y < -20 || this.x < -20 || this.x > this.cw + 20) {
            this.reset();
        }
    }

    draw(ctx, blur) {
        const t = this.life / this.maxLife;
        const flicker = 0.5 + 0.5 * Math.sin(this.life * 0.08 + this.flickerPhase);
        const alpha = t * 0.75 * flicker;
        if (alpha < 0.02) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = blur;
        ctx.shadowColor = `hsla(${this.hue}, 100%, ${this.brightness}%, 0.8)`;
        ctx.fillStyle = `hsla(${this.hue}, 90%, ${this.brightness}%, 1)`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Branch layout for the flower cluster. Defined once (never per frame) to
// avoid allocations in the render loop. `phase` desyncs each sub-bloom's motion.
const BRANCH_CONFIGS = [
    { heightRatio: 0.30, direction: -1, lengthFactor: 0.16, scaleFactor: 0.42, phase: 0.0 },
    { heightRatio: 0.45, direction:  1, lengthFactor: 0.14, scaleFactor: 0.45, phase: 1.7 },
    { heightRatio: 0.60, direction: -1, lengthFactor: 0.12, scaleFactor: 0.48, phase: 3.1 },
    { heightRatio: 0.75, direction:  1, lengthFactor: 0.10, scaleFactor: 0.40, phase: 4.6 },
];

// =============================================================
// MAIN APPLICATION
// =============================================================
class FlowerBloomApp {
    constructor() {
        // DOM
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.video = document.getElementById('webcam');
        this.loadingEl = document.getElementById('loading');
        this.instructionsEl = document.getElementById('instructions');
        this.profileCard = document.getElementById('profileCard');
        this.cardSheen = this.profileCard?.querySelector('.card-sheen');

        // Device / preference flags (read once)
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.isMobile = window.matchMedia('(max-width: 640px)').matches;

        // Glass-card motion state (parallax + idle float, transform-only)
        this.cardX = 0;
        this.cardY = 0;
        this.targetCardX = 0;
        this.targetCardY = 0;
        this.floatEase = 0;       // ramps 0→1 for a seamless takeover from CSS entrance
        this.cardReady = false;   // wait for CSS entrance animation to finish first

        // Noise
        this.noise = new OrganicNoise();

        // Time
        this.time = 0;
        this.lastTimestamp = 0;

        // Gesture state (smoothed values)
        this.bloom = 0;
        this.growth = 0;
        this.windForce = 0;

        // Gesture targets (raw from detection)
        this.targetBloom = 0;
        this.targetGrowth = 0;
        this.targetWindForce = 0;

        // Previous hand X for velocity-based wind
        this.prevHandX = 0.5;

        // Hand landmarks (updated each frame by MediaPipe)
        this.handLandmarks = [];
        this.handHandedness = [];
        this.handsDetected = 0;

        // Particles
        this.particles = [];

        // Setup
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initParticles();
        this.initHandTracking();

        // Hide instructions after 8 seconds
        setTimeout(() => {
            this.instructionsEl?.classList.add('hidden');
        }, 8000);

        // Only take over the card transform once the entrance animation has settled
        setTimeout(() => { this.cardReady = true; }, 1500);

        // Bind the loop once so the RAF callback allocates no per-frame closure
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    // ---------------------------------------------------------
    // Setup
    // ---------------------------------------------------------
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Re-bound particles
        for (const p of this.particles) {
            p.cw = this.canvas.width;
            p.ch = this.canvas.height;
        }
    }

    initParticles() {
        // Fewer, softer particles on mobile to protect FPS (shadowBlur is the
        // main per-particle cost). Tuned per device once at startup.
        const count = this.isMobile ? 30 : 64;
        this.particleBlur = this.isMobile ? 7 : 12;
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(this.canvas.width, this.canvas.height));
        }
    }

    initHandTracking() {
        const hands = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.65,
            minTrackingConfidence: 0.5,
        });

        hands.onResults((r) => this.onHandResults(r));

        const cam = new Camera(this.video, {
            onFrame: async () => {
                await hands.send({ image: this.video });
            },
            width: 1280,
            height: 720,
        });

        cam.start().then(() => {
            setTimeout(() => this.loadingEl?.classList.add('hidden'), 600);
        });
    }

    // ---------------------------------------------------------
    // Hand results callback
    // ---------------------------------------------------------
    onHandResults(results) {
        this.handLandmarks = results.multiHandLandmarks || [];
        this.handHandedness = results.multiHandedness || [];
        this.handsDetected = this.handLandmarks.length;

        let leftPinch = 0;
        let rightPinch = 0;
        let hasLeft = false;
        let hasRight = false;

        if (this.handsDetected > 0) {
            let avgX = 0, avgY = 0;

            for (let i = 0; i < this.handsDetected; i++) {
                const hand = this.handLandmarks[i];
                const handedness = results.multiHandedness[i];
                // MediaPipe handedness label is 'Left' or 'Right'
                const isLeft = handedness && handedness.label === 'Left';
                const pinch = this.calcPinchDistance(hand);

                if (isLeft) {
                    leftPinch = pinch;
                    hasLeft = true;
                } else {
                    rightPinch = pinch;
                    hasRight = true;
                }

                // Wind from hand horizontal velocity
                const c = this.palmCenter(hand);
                const dx = c.x - this.prevHandX;
                this.targetWindForce = dx * 12;
                this.prevHandX = c.x;

                avgX += c.x;
                avgY += c.y;
            }

            // Left hand controls Bloom
            this.targetBloom = hasLeft ? leftPinch : 0;

            // Right hand controls Growth
            this.targetGrowth = hasRight ? rightPinch : 0;

            // Subtle glass-card parallax target from average hand position.
            // Normalized 0..1 → small pixel offset around the resting center.
            avgX /= this.handsDetected;
            avgY /= this.handsDetected;
            this.targetCardX = (0.5 - avgX) * 26;
            this.targetCardY = (0.5 - avgY) * 20;
        } else {
            // No hands → slowly close, shrink, and settle the card back to rest
            this.targetBloom *= 0.94;
            this.targetGrowth *= 0.94;
            this.targetWindForce *= 0.9;
            this.targetCardX *= 0.9;
            this.targetCardY *= 0.9;
        }
    }

    /**
     * Pinch distance: distance between thumb tip (4) and index fingertip (8),
     * normalized by hand size so it works at any distance from the camera.
     * Returns 0 (pinched) → 1 (fully spread).
     */
    calcPinchDistance(lm) {
        const thumb = lm[4];   // thumb tip
        const index = lm[8];   // index fingertip
        const wrist = lm[0];
        const mcp = lm[9];     // middle-finger MCP

        // Reference = wrist-to-MCP distance (scales with hand size in frame)
        const ref = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        if (ref < 0.01) return 0;

        const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
        // Normalize: pinch ~0 when touching, ~1 when spread wide
        return Math.min(1, Math.max(0, (dist / ref - 0.15) * 1.6));
    }

    /** Rough palm center (average of wrist + MCP joints) */
    palmCenter(lm) {
        const ids = [0, 5, 9, 13, 17];
        let x = 0, y = 0;
        for (const i of ids) { x += lm[i].x; y += lm[i].y; }
        return { x: x / ids.length, y: y / ids.length };
    }

    // =============================================================
    // RENDERING
    // =============================================================

    // ----- Hand Visualization -----
    // Minimal, cohesive with the UI palette: a soft connecting line between
    // thumb + index tips (the "pinch gap") with two glowing fingertip dots.
    // No text, no emoji, no pills — reads as elegant ambient feedback.
    drawHandSkeleton(lm, handedness) {
        const thumbTip = lm[4];
        const indexTip = lm[8];
        if (!thumbTip || !indexTip) return;

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        const tx = thumbTip.x * cw, ty = thumbTip.y * ch;
        const ix = indexTip.x * cw, iy = indexTip.y * ch;

        // Left hand (bloom) = accent cyan · Right hand (grow) = soft mint.
        const isLeft = handedness && handedness.label === 'Left';
        const rgb = isLeft ? '110, 231, 255' : '167, 243, 208';

        ctx.save();
        ctx.lineCap = 'round';

        // Connecting line (pinch gap)
        ctx.strokeStyle = `rgba(${rgb}, 0.45)`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${rgb}, 0.55)`;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(ix, iy);
        ctx.stroke();

        // Glowing fingertip dots (both in one path — no per-frame allocation)
        ctx.fillStyle = `rgba(${rgb}, 0.95)`;
        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.arc(ix, iy, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ----- Stem -----
    drawStem(baseX, baseY, height, windAngle) {
        const ctx = this.ctx;
        const segs = 24;
        const segH = height / segs;

        // Build stem path points
        const pts = [{ x: baseX, y: baseY }];
        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const windBend = windAngle * t * t * 40;
            const sway = this.noise.get(this.time * 0.6 + i * 0.25, 0) * 10 * t;
            pts.push({
                x: baseX + windBend + sway,
                y: baseY - segH * i,
            });
        }

        // Draw stem (thick gradient line)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer glow
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(40, 120, 35, 0.25)';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(80, 180, 60, 0.3)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Core stem
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#3a8a30';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Leaves
        this.drawLeaves(pts);

        ctx.restore();

        return { tip: pts[pts.length - 1], pts };
    }

    drawLeaves(stemPts) {
        const ctx = this.ctx;
        const positions = [0.25, 0.45, 0.65];

        for (let li = 0; li < positions.length; li++) {
            const idx = Math.floor(positions[li] * (stemPts.length - 1));
            const pt = stemPts[idx];
            const side = li % 2 === 0 ? 1 : -1;
            const len = 22 + this.growth * 18;
            const angle = side * (0.45 + this.noise.get(this.time * 0.6 + li * 3, 2) * 0.2);

            ctx.save();
            ctx.translate(pt.x, pt.y);
            ctx.rotate(angle);

            const grad = ctx.createLinearGradient(0, 0, len, 0);
            grad.addColorStop(0, 'rgba(55, 140, 45, 0.8)');
            grad.addColorStop(1, 'rgba(75, 170, 60, 0.4)');
            ctx.fillStyle = grad;
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(80, 200, 60, 0.25)';

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(len * 0.5, -10, len, -1);
            ctx.quadraticCurveTo(len * 0.5, 10, 0, 0);
            ctx.fill();

            // Leaf vein
            ctx.strokeStyle = 'rgba(90, 180, 70, 0.3)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(3, 0);
            ctx.lineTo(len * 0.8, 0);
            ctx.stroke();

            ctx.restore();
        }
    }

    // ----- Flower Head (Tulip facing upward) -----
    // `phase` desyncs each bloom's movement so the cluster feels organic
    // rather than mechanically synchronized.
    drawFlowerHead(cx, cy, bloom, windAngle, scale, phase = 0) {
        // Boost scale as it blooms to make it feel more dynamic and organic
        const bloomScaleFactor = 1.0 + bloom * 0.18;
        const adjustedScale = scale * bloomScaleFactor;
        const ctx = this.ctx;

        // Gentle whole-head nod (independent per bloom via `phase`)
        const nod = windAngle * 0.06 + this.noise.get(this.time * 0.5 + phase, 6) * 0.05;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(nod);

        // --- Ambient bloom glow: warm, soft, additive (screen) ---
        const glowR = (58 + bloom * 116) * adjustedScale;
        if (bloom > 0.02) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const glow = ctx.createRadialGradient(0, -glowR * 0.4, 0, 0, -glowR * 0.4, glowR);
            glow.addColorStop(0,    `rgba(255, 158, 126, ${0.30 * bloom})`);
            glow.addColorStop(0.45, `rgba(255, 104, 120, ${0.16 * bloom})`);
            glow.addColorStop(1,    'rgba(255, 76, 96, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, -glowR * 0.4, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Warm botanical palette — rich rose/coral, deliberately not neon
        const hue = 348;   // warm rose
        const sat = 74;
        const light = 56;

        // --- Tulip Petal Layers ---
        // Back/outer layer (drawn first)
        // Center back, left back, right back
        const backPetals = [
            { angle: 0, lengthMul: 1.0, widthMul: 0.4, hueOffset: 0, lightOffset: -4 },
            { angle: -0.15 - bloom * 0.7, lengthMul: 0.95, widthMul: 0.38, hueOffset: 10, lightOffset: -2 },
            { angle: 0.15 + bloom * 0.7, lengthMul: 0.95, widthMul: 0.38, hueOffset: 10, lightOffset: -2 }
        ];

        // Front/inner layer (drawn on top)
        // Left front, right front, center front
        const frontPetals = [
            { angle: -0.05 - bloom * 0.55, lengthMul: 0.9, widthMul: 0.35, hueOffset: 5, lightOffset: 2 },
            { angle: 0.05 + bloom * 0.55, lengthMul: 0.9, widthMul: 0.35, hueOffset: 5, lightOffset: 2 },
            { angle: 0, lengthMul: 0.85, widthMul: 0.32, hueOffset: -5, lightOffset: 5 }
        ];

        const maxPetalLen = 85 * adjustedScale;

        // Draw back petals
        for (const p of backPetals) {
            const flutter = this.noise.get(this.time * 1.2 + p.angle * 10 + phase, 3) * 0.04 * (1 + bloom);
            const finalAngle = p.angle + flutter + windAngle * 0.1;
            const len = maxPetalLen * p.lengthMul;
            const wid = maxPetalLen * p.widthMul * (0.6 + bloom * 0.8);

            this.drawTulipPetal(ctx, finalAngle, len, wid, hue + p.hueOffset, sat, light + p.lightOffset, bloom);
        }

        // Draw center details (stamen/pistil) if open
        if (bloom > 0.15) {
            ctx.save();
            ctx.shadowBlur = 0;
            // Center pistil (greenish yellow)
            ctx.fillStyle = `rgba(180, 220, 100, ${bloom})`;
            ctx.beginPath();
            ctx.arc(0, -maxPetalLen * 0.2, 5 * adjustedScale, 0, Math.PI * 2);
            ctx.fill();

            // Stamens around pistil
            const stamenCount = 4;
            for (let i = 0; i < stamenCount; i++) {
                const a = (i / stamenCount) * Math.PI * 2 + this.time * 0.5;
                const r = 8 * adjustedScale * bloom;
                const sx = Math.cos(a) * r;
                const sy = -maxPetalLen * 0.2 + Math.sin(a) * r;

                // filament
                ctx.strokeStyle = `rgba(220, 200, 80, ${bloom * 0.7})`;
                ctx.lineWidth = 1.5 * adjustedScale;
                ctx.beginPath();
                ctx.moveTo(0, -maxPetalLen * 0.1);
                ctx.lineTo(sx, sy);
                ctx.stroke();

                // anther
                ctx.fillStyle = `rgba(255, 235, 120, ${bloom})`;
                ctx.beginPath();
                ctx.arc(sx, sy, 2.5 * adjustedScale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Draw front petals
        for (const p of frontPetals) {
            const flutter = this.noise.get(this.time * 1.4 + p.angle * 10 + phase, 4) * 0.03 * (1 + bloom);
            const finalAngle = p.angle + flutter + windAngle * 0.05;
            const len = maxPetalLen * p.lengthMul;
            const wid = maxPetalLen * p.widthMul * (0.65 + bloom * 0.75);

            this.drawTulipPetal(ctx, finalAngle, len, wid, hue + p.hueOffset, sat, light + p.lightOffset, bloom);
        }

        ctx.restore();
    }

    drawTulipPetal(ctx, angle, length, width, hue, sat, light, bloom) {
        ctx.save();
        ctx.rotate(angle);

        // Translucent, luminous shading: deep warm shadow at the base →
        // saturated luminous mid → soft cream-warm highlight at the tip.
        // Reads as light passing through a real petal.
        const grad = ctx.createLinearGradient(0, 0, 0, -length);
        grad.addColorStop(0,    `hsla(${hue + 12}, ${sat + 6}%, ${light - 16}%, 0.94)`);
        grad.addColorStop(0.35, `hsla(${hue + 2},  ${sat}%,     ${light}%,      0.90)`);
        grad.addColorStop(0.72, `hsla(${hue - 4},  ${sat - 8}%, ${light + 14}%, 0.90)`);
        grad.addColorStop(1,    `hsla(${hue + 6},  ${sat - 20}%,${light + 26}%, 0.95)`);

        ctx.fillStyle = grad;
        // Soft warm rim light — lower blur + lower saturation than before
        // (cheaper per petal AND avoids the neon look).
        ctx.shadowBlur = 6 + bloom * 10;
        ctx.shadowColor = `hsla(${hue + 4}, 78%, 62%, ${0.18 + bloom * 0.28})`;

        // Tulip petal shape pointing straight up (-Y direction)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
            -width * 1.1, -length * 0.3,
            -width * 0.9, -length * 0.85,
            0, -length
        );
        ctx.bezierCurveTo(
            width * 0.9, -length * 0.85,
            width * 1.1, -length * 0.3,
            0, 0
        );
        ctx.fill();

        // Subtle petal vein (softened so it reads as shading, not a line)
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `hsla(${hue + 10}, ${sat - 10}%, ${light + 20}%, 0.16)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -length * 0.85);
        ctx.stroke();

        ctx.restore();
    }

    // ----- Side Branches -----
    drawBranch(startX, startY, baseAngle, length, windAngle, scale) {
        const ctx = this.ctx;
        const segs = 12;
        const segL = length / segs;
        const pts = [{ x: startX, y: startY }];

        for (let i = 1; i <= segs; i++) {
            const t = i / segs;
            const windBend = windAngle * t * t * 15;
            const sway = this.noise.get(this.time * 0.8 + i * 0.3, 5) * 4 * t;
            const angle = baseAngle + windBend * 0.02 + sway * 0.01;

            pts.push({
                x: pts[pts.length - 1].x + Math.cos(angle) * segL + windBend * 0.3,
                y: pts[pts.length - 1].y + Math.sin(angle) * segL
            });
        }

        // Draw the branch stem
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer glow
        ctx.lineWidth = 4 * scale;
        ctx.strokeStyle = 'rgba(40, 120, 35, 0.2)';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(80, 180, 60, 0.25)';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Core branch
        ctx.lineWidth = 2.5 * scale;
        ctx.strokeStyle = '#3a8a30';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        ctx.restore();

        // Draw a leaf on the branch
        this.drawBranchLeaves(pts, scale);

        return pts[pts.length - 1]; // return branch tip
    }

    drawBranchLeaves(branchPts, scale) {
        const ctx = this.ctx;
        if (branchPts.length < 5) return;
        
        // Leaf in the middle of the branch
        const midIdx = Math.floor(branchPts.length * 0.5);
        const pt = branchPts[midIdx];
        const prevPt = branchPts[midIdx - 1];
        if (!pt || !prevPt) return;
        
        const angle = Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x) + Math.PI / 2;
        const len = 12 * scale * (1 + this.growth);

        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(angle);

        const grad = ctx.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, 'rgba(55, 140, 45, 0.8)');
        grad.addColorStop(1, 'rgba(75, 170, 60, 0.4)');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -5, len, -1);
        ctx.quadraticCurveTo(len * 0.5, 5, 0, 0);
        ctx.fill();

        ctx.restore();
    }

    // ----- Post-process Glow -----
    drawPostGlow(cx, cy) {
        if (this.bloom < 0.05) return;
        const ctx = this.ctx;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const r = 120 + this.bloom * 160;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        // Warm, soft halo (coral → rose) to match the botanical bloom
        g.addColorStop(0,   `rgba(255, 138, 120, ${this.bloom * 0.16})`);
        g.addColorStop(0.5, `rgba(255, 88, 110, ${this.bloom * 0.07})`);
        g.addColorStop(1,   'rgba(255, 66, 90, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // =============================================================
    // ANIMATION LOOP
    // =============================================================
    animate(timestamp) {
        const dt = this.lastTimestamp ? (timestamp - this.lastTimestamp) / 16.67 : 1; // normalised to ~60fps
        this.lastTimestamp = timestamp;
        this.time += 0.016 * dt;

        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // ---- Smooth interpolation ----
        const lerpSpeed = 0.07 * dt;
        this.bloom += (this.targetBloom - this.bloom) * lerpSpeed;
        this.growth += (this.targetGrowth - this.growth) * 0.05 * dt;
        this.windForce += (this.targetWindForce - this.windForce) * 0.06 * dt;

        // ---- Glass-card motion (transform-only, GPU-composited) ----
        // Combines: hand parallax + gentle idle float + micro-tilt, plus a
        // light-follows-hand specular sheen. All written to one/two composited
        // layers per frame — no layout, no repaint. Skipped for reduced motion.
        if (this.cardReady && this.profileCard && !this.reducedMotion) {
            // Ease motion in so the handover from the CSS entrance is seamless
            this.floatEase += (1 - this.floatEase) * 0.03 * dt;

            // Parallax toward the hand (lerped for physical feel)
            this.cardX += (this.targetCardX - this.cardX) * 0.06 * dt;
            this.cardY += (this.targetCardY - this.cardY) * 0.06 * dt;

            // Gentle, continuous idle breathing
            const floatX = Math.sin(this.time * 0.6) * 4;
            const floatY = Math.sin(this.time * 0.45 + 1.3) * 6;

            const x = (this.cardX + floatX) * this.floatEase;
            const y = (this.cardY + floatY) * this.floatEase;
            const rot = this.cardX * 0.06 * this.floatEase;   // micro-tilt, < ~0.8deg

            this.profileCard.style.transform =
                `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;

            // Specular sheen drifts opposite + deeper for a parallax light shift
            if (this.cardSheen) {
                this.cardSheen.style.transform =
                    `translate3d(${(-x * 1.6).toFixed(2)}px, ${(-y * 1.6).toFixed(2)}px, 0)`;
            }
        }

        // Natural wind always present
        const naturalWind = this.noise.get(this.time * 0.7, 1) * 0.12;
        const totalWind = naturalWind + this.windForce * 0.18;

        // ---- Clear ----
        ctx.clearRect(0, 0, cw, ch);

        // ---- Draw hand skeletons ----
        for (let i = 0; i < this.handLandmarks.length; i++) {
            const lm = this.handLandmarks[i];
            const handedness = this.handHandedness[i];
            this.drawHandSkeleton(lm, handedness);
        }

        // ---- Particles ----
        for (const p of this.particles) {
            p.update(totalWind, dt);
            p.draw(ctx, this.particleBlur);
        }

        // ---- Main flower ----
        if (this.growth > 0.005) {
            const stemBaseX = cw * 0.75;
            const stemBaseY = ch * 0.95;
            const stemH = ch * 0.45 * this.growth;
            const flowerScale = 1.25 * this.growth;

            const stemData = this.drawStem(stemBaseX, stemBaseY, stemH, totalWind);
            const tip = stemData.tip;
            const pts = stemData.pts;

            // Draw the 4 side branches and their sub-flowers (config hoisted)
            for (const config of BRANCH_CONFIGS) {
                const idx = Math.floor(pts.length * config.heightRatio);
                if (idx > 0 && idx < pts.length) {
                    const pt = pts[idx];
                    const prevPt = pts[idx - 1] || pt;
                    const tangent = Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x);

                    const branchAngle = tangent + (config.direction * 0.75);
                    const branchLength = ch * config.lengthFactor * this.growth;

                    const branchTip = this.drawBranch(pt.x, pt.y, branchAngle, branchLength, totalWind, this.growth);
                    const subFlowerScale = flowerScale * config.scaleFactor;

                    this.drawFlowerHead(branchTip.x, branchTip.y, this.bloom, totalWind, subFlowerScale, config.phase);
                    this.drawPostGlow(branchTip.x, branchTip.y);
                }
            }

            // Main flower head (its own phase so it doesn't mirror a branch)
            this.drawFlowerHead(tip.x, tip.y, this.bloom, totalWind, flowerScale, 2.3);

            // ---- Post-process glow ----
            this.drawPostGlow(tip.x, tip.y);
        }

        requestAnimationFrame(this.animate);
    }
}

// =============================================================
// BOOT
// =============================================================
window.addEventListener('DOMContentLoaded', () => {
    new FlowerBloomApp();
});
