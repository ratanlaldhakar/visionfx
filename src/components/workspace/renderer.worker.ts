// Web Worker for GPU-accelerated OffscreenCanvas rendering

let canvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null

interface RenderParams {
  brightness: number
  contrast: number
  saturation: number
  blur: number
  rotation: number
  scale: number
  aspectRatio: string
  filter: string
  overlay: string
  faceMeshEnabled: boolean
  faceMeshMode: 'wireframe' | 'points' | 'outline' | 'all'
  handTrackingEnabled: boolean
  poseTrackingEnabled: boolean
  selectedVfx: 'glow' | 'neon' | 'outline' | 'blur' | 'particles' | 'fire' | 'smoke' | 'lightning' | 'rain' | 'snow' | 'none'
  vfxOpacity: number
  vfxColor: string
  vfxStrength: number
  vfxSpeed: number
  vfxRadius: number
}

interface FaceData {
  detected: boolean
  landmarks: { x: number; y: number; z: number }[]
  rotation: { pitch: number; yaw: number; roll: number }
  confidence: number
}

interface Hand {
  landmarks: { x: number; y: number; z: number }[]
  handedness: 'Left' | 'Right'
  gesture: string
}

interface BodyPoseData {
  detected: boolean
  landmarks: { x: number; y: number; z: number }[]
}

let params: RenderParams = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  rotation: 0,
  scale: 1,
  aspectRatio: '16-9',
  filter: 'none',
  overlay: 'none',
  faceMeshEnabled: true,
  faceMeshMode: 'wireframe',
  handTrackingEnabled: true,
  poseTrackingEnabled: true,
  selectedVfx: 'none',
  vfxOpacity: 80,
  vfxColor: '#00f2fe',
  vfxStrength: 50,
  vfxSpeed: 50,
  vfxRadius: 40,
}

let tesselationConnections: [number, number][] = []
let contourConnections: [number, number][] = []
let irisConnections: [number, number][] = []

const handConnections = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17]             // Knuckles
]

const poseConnections = [
  // Shoulders & Torso
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  // Left Arm
  [11, 13], [13, 15],
  // Right Arm
  [12, 14], [14, 16],
  // Left Leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right Leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
  // Head Outline
  [0, 2], [2, 7], [0, 5], [5, 8]
]

let lastFrame: ImageBitmap | null = null
let faceData: FaceData | null = null
let handData: Hand[] | null = null
let poseData: BodyPoseData | null = null
let animationFrameId: number | null = null

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  size: number
  age: number
  maxAge: number
  color: string
}
let particles: Particle[] = []

const drawLightningArc = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  strength: number
) => {
  if (!ctx) return
  ctx.strokeStyle = color
  ctx.lineWidth = 1.2 + strength / 20
  ctx.beginPath()
  ctx.moveTo(x1, y1)

  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  const segments = Math.max(5, Math.floor(dist / 14))

  for (let i = 1; i < segments; i++) {
    const ratio = i / segments
    const targetX = x1 + dx * ratio
    const targetY = y1 + dy * ratio

    const jitter = (Math.random() - 0.5) * (dist / 8) * (strength / 50)
    const nx = -dy / dist
    const ny = dx / dist

    const segmentX = targetX + nx * jitter
    const segmentY = targetY + ny * jitter

    ctx.lineTo(segmentX, segmentY)
  }
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

const updateParticles = (drawW: number, drawH: number) => {
  const emitColor = params.vfxColor
  const speedFactor = params.vfxSpeed / 50
  const opacityFactor = params.vfxOpacity / 100
  const sizeBase = params.vfxRadius / 6
  const maxParticles = 250

  if (params.selectedVfx === 'rain') {
    const count = Math.ceil(3 * speedFactor)
    for (let k = 0; k < count; k++) {
      if (particles.length < maxParticles) {
        particles.push({
          x: -drawW / 2 + Math.random() * drawW,
          y: -drawH / 2,
          vx: (Math.random() - 0.5) * 0.4 * speedFactor,
          vy: (4 + Math.random() * 5) * speedFactor,
          alpha: opacityFactor * (0.4 + Math.random() * 0.6),
          size: 1 + Math.random() * 2,
          age: 0,
          maxAge: 100 + Math.random() * 50,
          color: emitColor,
        })
      }
    }
  } else if (params.selectedVfx === 'snow') {
    const count = Math.ceil(2 * speedFactor)
    for (let k = 0; k < count; k++) {
      if (particles.length < maxParticles) {
        particles.push({
          x: -drawW / 2 + Math.random() * drawW,
          y: -drawH / 2,
          vx: (Math.random() - 0.5) * 1.2 * speedFactor,
          vy: (0.6 + Math.random() * 1.4) * speedFactor,
          alpha: opacityFactor * (0.3 + Math.random() * 0.7),
          size: 1.5 + Math.random() * sizeBase,
          age: 0,
          maxAge: 160 + Math.random() * 100,
          color: '#ffffff',
        })
      }
    }
  } else if (params.selectedVfx === 'particles') {
    const count = 1
    for (let k = 0; k < count; k++) {
      if (particles.length < maxParticles) {
        particles.push({
          x: -drawW / 2 + Math.random() * drawW,
          y: drawH / 2 + 10,
          vx: (Math.random() - 0.5) * 1.8 * speedFactor,
          vy: (-1.2 - Math.random() * 2.2) * speedFactor,
          alpha: opacityFactor,
          size: 2 + Math.random() * sizeBase,
          age: 0,
          maxAge: 90 + Math.random() * 90,
          color: emitColor,
        })
      }
    }
  } else if (params.selectedVfx === 'fire' || params.selectedVfx === 'smoke') {
    const emitterPts: { x: number; y: number }[] = []

    if (handData && handData.length > 0) {
      for (const hand of handData) {
        const landmarks = hand.landmarks
        const tips = [4, 8, 12, 16, 20]
        for (const idx of tips) {
          if (landmarks[idx]) {
            emitterPts.push({
              x: -drawW / 2 + landmarks[idx].x * drawW,
              y: -drawH / 2 + landmarks[idx].y * drawH,
            })
          }
        }
      }
    }

    if (faceData && faceData.detected && faceData.landmarks.length > 0) {
      const nose = faceData.landmarks[1]
      if (nose) {
        emitterPts.push({
          x: -drawW / 2 + nose.x * drawW,
          y: -drawH / 2 + nose.y * drawH,
        })
      }
    }

    if (emitterPts.length === 0) {
      const t = performance.now() * 0.002
      emitterPts.push({
        x: Math.sin(t) * (drawW * 0.2),
        y: Math.cos(t * 1.5) * (drawH * 0.15),
      })
    }

    const count = params.selectedVfx === 'fire' ? 3 : 2
    for (const pt of emitterPts) {
      for (let k = 0; k < count; k++) {
        if (particles.length < maxParticles) {
          if (params.selectedVfx === 'fire') {
            particles.push({
              x: pt.x + (Math.random() - 0.5) * 8,
              y: pt.y + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 2.5 * speedFactor,
              vy: (-3 - Math.random() * 4) * speedFactor,
              alpha: opacityFactor * (0.85 + Math.random() * 0.15),
              size: 2 + Math.random() * sizeBase,
              age: 0,
              maxAge: 30 + Math.random() * 25,
              color: Math.random() > 0.4 ? '#f97316' : '#ef4444',
            })
          } else {
            particles.push({
              x: pt.x + (Math.random() - 0.5) * 10,
              y: pt.y + (Math.random() - 0.5) * 10,
              vx: (-0.6 + Math.random() * 1.6) * speedFactor,
              vy: (-0.8 - Math.random() * 1.6) * speedFactor,
              alpha: opacityFactor * (0.25 + Math.random() * 0.25),
              size: 3.5 + Math.random() * sizeBase,
              age: 0,
              maxAge: 65 + Math.random() * 45,
              color: '#4b5563',
            })
          }
        }
      }
    }
  }

  if (!ctx) return
  ctx.save()

  if (
    params.selectedVfx === 'fire' ||
    params.selectedVfx === 'particles' ||
    params.selectedVfx === 'snow'
  ) {
    ctx.globalCompositeOperation = 'lighter'
  }

  const nextParticles: Particle[] = []
  for (const p of particles) {
    p.age++
    if (p.age >= p.maxAge) continue

    p.x += p.vx
    p.y += p.vy

    if (params.selectedVfx === 'smoke') {
      p.size += 0.22
      p.alpha = (1 - p.age / p.maxAge) * opacityFactor * 0.4
    } else if (params.selectedVfx === 'fire') {
      p.size *= 0.94
      p.alpha = (1 - p.age / p.maxAge) * opacityFactor
    } else {
      p.alpha = (1 - p.age / p.maxAge) * opacityFactor
    }

    ctx.fillStyle = p.color
    ctx.globalAlpha = Math.max(0, Math.min(p.alpha, 1))

    ctx.beginPath()
    if (params.selectedVfx === 'rain') {
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + p.vx * 1.5, p.y + p.vy * 1.5)
      ctx.stroke()
    } else {
      ctx.arc(p.x, p.y, Math.max(0.2, p.size), 0, Math.PI * 2)
      ctx.fill()
    }

    if (Math.abs(p.x) < drawW / 2 + 40 && Math.abs(p.y) < drawH / 2 + 40) {
      nextParticles.push(p)
    }
  }
  particles = nextParticles
  ctx.restore()
}

const drawVfxLightning = (drawW: number, drawH: number) => {
  if (!ctx) return
  const speedFactor = params.vfxSpeed / 50

  if (Math.random() > 0.88 - speedFactor * 0.12) {
    const color = params.vfxColor
    const strength = params.vfxStrength

    const emitterPts: { x: number; y: number }[] = []

    if (handData && handData.length > 0) {
      for (const hand of handData) {
        const indexTip = hand.landmarks[8]
        if (indexTip) {
          emitterPts.push({
            x: -drawW / 2 + indexTip.x * drawW,
            y: -drawH / 2 + indexTip.y * drawH,
          })
        }
      }
    }

    if (faceData && faceData.detected && faceData.landmarks.length > 0) {
      const nose = faceData.landmarks[1]
      if (nose) {
        emitterPts.push({
          x: -drawW / 2 + nose.x * drawW,
          y: -drawH / 2 + nose.y * drawH,
        })
      }
    }

    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = params.vfxRadius / 2.5
    ctx.globalAlpha = params.vfxOpacity / 100

    if (emitterPts.length >= 2) {
      drawLightningArc(
        emitterPts[0].x,
        emitterPts[0].y,
        emitterPts[1].x,
        emitterPts[1].y,
        color,
        strength
      )
    } else if (emitterPts.length === 1) {
      const edgeX = (Math.random() - 0.5) * drawW
      const edgeY = Math.random() > 0.5 ? -drawH / 2 : drawH / 2
      drawLightningArc(
        emitterPts[0].x,
        emitterPts[0].y,
        edgeX,
        edgeY,
        color,
        strength
      )
    } else {
      const x1 = (Math.random() - 0.5) * drawW
      const y1 = -drawH / 2
      const x2 = (Math.random() - 0.5) * drawW
      const y2 = drawH / 2
      drawLightningArc(x1, y1, x2, y2, color, strength)
    }
    ctx.restore()
  }
}

const drawVfxOverlays = (drawW: number, drawH: number) => {
  if (!ctx || params.selectedVfx === 'none') return

  const color = params.vfxColor
  const opacity = params.vfxOpacity / 100
  const radius = params.vfxRadius
  const strength = params.vfxStrength

  ctx.save()
  ctx.globalAlpha = opacity

  if (params.selectedVfx === 'glow' || params.selectedVfx === 'neon') {
    ctx.shadowColor = color
    ctx.shadowBlur = radius / 2.5
    ctx.strokeStyle = color
    ctx.lineWidth =
      params.selectedVfx === 'glow' ? strength / 10 + 2.5 : strength / 22 + 1.2
    ctx.fillStyle =
      params.selectedVfx === 'glow' ? `${color}25` : 'transparent'

    if (faceData && faceData.detected && faceData.landmarks.length > 0) {
      const landmarks = faceData.landmarks
      const getPt = (idx: number) => ({
        x: -drawW / 2 + landmarks[idx].x * drawW,
        y: -drawH / 2 + landmarks[idx].y * drawH,
      })

      ctx.beginPath()
      const faceOutlineIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
        379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
        234, 127, 162, 21, 54, 103, 67, 109,
      ]
      for (let i = 0; i < faceOutlineIndices.length; i++) {
        const pt = getPt(faceOutlineIndices[i])
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      }
      ctx.closePath()
      ctx.stroke()
      if (params.selectedVfx === 'glow') ctx.fill()
    }

    if (handData && handData.length > 0) {
      for (const hand of handData) {
        const getPt = (idx: number) => {
          const pt = hand.landmarks[idx]
          if (!pt) return null
          return {
            x: -drawW / 2 + pt.x * drawW,
            y: -drawH / 2 + pt.y * drawH,
          }
        }

        for (const conn of handConnections) {
          const pt1 = getPt(conn[0])
          const pt2 = getPt(conn[1])
          if (pt1 && pt2) {
            ctx.beginPath()
            ctx.moveTo(pt1.x, pt1.y)
            ctx.lineTo(pt2.x, pt2.y)
            ctx.stroke()
          }
        }
      }
    }

    if (poseData && poseData.detected && poseData.landmarks.length > 0) {
      const landmarks = poseData.landmarks
      const getPt = (idx: number) => {
        const pt = landmarks[idx]
        if (!pt) return null
        return {
          x: -drawW / 2 + pt.x * drawW,
          y: -drawH / 2 + pt.y * drawH,
        }
      }

      for (const conn of poseConnections) {
        const pt1 = getPt(conn[0])
        const pt2 = getPt(conn[1])
        if (pt1 && pt2) {
          ctx.beginPath()
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
          ctx.stroke()
        }
      }
    }
  } else if (params.selectedVfx === 'outline') {
    ctx.strokeStyle = color
    ctx.lineWidth = strength / 10 + 1.5
    ctx.shadowColor = 'transparent'

    if (faceData && faceData.detected && faceData.landmarks.length > 0) {
      const landmarks = faceData.landmarks
      const getPt = (idx: number) => ({
        x: -drawW / 2 + landmarks[idx].x * drawW,
        y: -drawH / 2 + landmarks[idx].y * drawH,
      })

      ctx.beginPath()
      const faceOutlineIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
        379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
        234, 127, 162, 21, 54, 103, 67, 109,
      ]
      for (let i = 0; i < faceOutlineIndices.length; i++) {
        const pt = getPt(faceOutlineIndices[i])
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }

  ctx.restore()
}



// FPS HUD Counters
let lastFpsTime = performance.now()
let frameCount = 0
let currentFps = 0

const updateFps = () => {
  frameCount++
  const now = performance.now()
  if (now - lastFpsTime >= 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime))
    frameCount = 0
    lastFpsTime = now
  }
}

const getFilterString = () => {
  let baseFilter = ''
  switch (params.filter) {
    case 'grayscale':
      baseFilter = 'grayscale(100%)'
      break
    case 'sepia':
      baseFilter = 'sepia(100%)'
      break
    case 'vintage':
      baseFilter = 'sepia(50%) saturate(140%) contrast(120%) hue-rotate(15deg)'
      break
    case 'noir':
      baseFilter = 'grayscale(100%) contrast(150%) brightness(75%)'
      break
    case 'cyberpunk':
      baseFilter = 'hue-rotate(90deg) saturate(200%) contrast(120%)'
      break
    case 'warm':
      baseFilter = 'saturate(125%) sepia(10%)'
      break
    case 'cool':
      baseFilter = 'saturate(110%) hue-rotate(15deg)'
      break
  }

  let blurVfx = ''
  if (params.selectedVfx === 'blur') {
    const blurAmt = (params.vfxRadius / 25) * (params.vfxStrength / 50)
    blurVfx = ` blur(${blurAmt}px)`
  }

  return `${baseFilter} brightness(${params.brightness}%) contrast(${params.contrast}%) saturate(${params.saturation}%) blur(${params.blur}px)${blurVfx}`.trim()
}

// Draw moving neon gradient backdrop
const drawSimulatedBackdrop = () => {
  if (!ctx || !canvas) return

  const angle = (performance.now() / 3000) * Math.PI
  const halfW = canvas.width / 2
  const halfH = canvas.height / 2

  const x1 = Math.cos(angle) * halfW
  const y1 = Math.sin(angle) * halfH
  const x2 = -Math.cos(angle) * halfW
  const y2 = -Math.sin(angle) * halfH

  const grad = ctx.createLinearGradient(x1, y1, x2, y2)
  grad.addColorStop(0, '#100b26') // deep slate violet
  grad.addColorStop(0.5, '#050512') // midnight blue
  grad.addColorStop(1, '#240828') // dark crimson magenta

  ctx.fillStyle = grad
  ctx.fillRect(-halfW, -halfH, canvas.width, canvas.height)

  // Render crosshairs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, 16, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.beginPath()
  ctx.arc(0, 0, 1.5, 0, Math.PI * 2)
  ctx.fill()

  // Render simulated hardware HUD specs
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.font = '9px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('F2.8', -halfW + 16, -halfH + 20)
  ctx.fillText('ISO 400', -halfW + 16, -halfH + 32)
  ctx.fillText('SHUTTER 1/120', -halfW + 16, halfH - 24)
  ctx.fillText('AF-S', -halfW + 16, halfH - 12)

  ctx.textAlign = 'right'
  ctx.fillText('4K UHD', halfW - 16, -halfH + 20)
  ctx.fillText('60FPS', halfW - 16, -halfH + 32)
  ctx.fillText('BATTERY 84%', halfW - 16, halfH - 12)
}

// Draw MediaPipe Face Landmarks (Supports all 478 points & wireframe connections)
const drawFaceLandmarks = (
  landmarks: { x: number; y: number; z: number }[],
  drawW: number,
  drawH: number
) => {
  if (!ctx) return

  const getPt = (idx: number) => {
    const pt = landmarks[idx]
    if (!pt) return null
    return {
      x: -drawW / 2 + pt.x * drawW,
      y: -drawH / 2 + pt.y * drawH,
    }
  }

  if (params.faceMeshEnabled) {
    // 1. Outline Contour Mode
    if (params.faceMeshMode === 'outline') {
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.55)' // Yellow contours
      ctx.lineWidth = 1
      ctx.beginPath()
      for (const conn of contourConnections) {
        const pt1 = getPt(conn[0])
        const pt2 = getPt(conn[1])
        if (pt1 && pt2) {
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
        }
      }
      ctx.stroke()

      ctx.strokeStyle = '#10b981' // Green outlines for iris/eyes
      ctx.beginPath()
      for (const conn of irisConnections) {
        const pt1 = getPt(conn[0])
        const pt2 = getPt(conn[1])
        if (pt1 && pt2) {
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
        }
      }
      ctx.stroke()
    }
    // 2. Wireframe / Full Mesh Mode
    else if (params.faceMeshMode === 'wireframe' || params.faceMeshMode === 'all') {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.28)' // Indigo triangulation wires
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (const conn of tesselationConnections) {
        const pt1 = getPt(conn[0])
        const pt2 = getPt(conn[1])
        if (pt1 && pt2) {
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
        }
      }
      ctx.stroke()

      // Connect accent contour outlines with higher opacity
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.55)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      for (const conn of contourConnections) {
        const pt1 = getPt(conn[0])
        const pt2 = getPt(conn[1])
        if (pt1 && pt2) {
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
        }
      }
      ctx.stroke()
    }

    // 3. Points Mode / Full Mesh Mode
    if (params.faceMeshMode === 'points' || params.faceMeshMode === 'all') {
      ctx.fillStyle = '#10b981' // Green face dots
      for (let i = 0; i < landmarks.length; i++) {
        const pt = getPt(i)
        if (!pt) continue
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 1.0, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw active iris highlighting in cyan
      ctx.fillStyle = '#67e8f9'
      for (const conn of irisConnections) {
        const pt1 = getPt(conn[0])
        const pt2 = getPt(conn[1])
        if (pt1) {
          ctx.beginPath()
          ctx.arc(pt1.x, pt1.y, 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
        if (pt2) {
          ctx.beginPath()
          ctx.arc(pt2.x, pt2.y, 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }
}

// Draw AR visors, lock reticles, and sci-fi boundaries following landmarks
const drawArObjects = (
  landmarks: { x: number; y: number; z: number }[],
  drawW: number,
  drawH: number
) => {
  if (!ctx) return

  const getPt = (idx: number) => {
    const pt = landmarks[idx]
    if (!pt) return null
    return {
      x: -drawW / 2 + pt.x * drawW,
      y: -drawH / 2 + pt.y * drawH,
    }
  }

  // 1. Nose tip lock-on crosshair (index 1)
  const nosePt = getPt(1)
  if (nosePt) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)' // Red lock reticle
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(nosePt.x, nosePt.y, 5, 0, Math.PI * 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(nosePt.x - 9, nosePt.y)
    ctx.lineTo(nosePt.x + 9, nosePt.y)
    ctx.moveTo(nosePt.x, nosePt.y - 9)
    ctx.lineTo(nosePt.x, nosePt.y + 9)
    ctx.stroke()
  }

  // 2. Cyan Glowing Eye Visor (anchored to outer eye corners: 33 left, 263 right)
  const leftEyePt = getPt(33)
  const rightEyePt = getPt(263)
  if (leftEyePt && rightEyePt) {
    const cx = (leftEyePt.x + rightEyePt.x) / 2
    const cy = (leftEyePt.y + rightEyePt.y) / 2

    const dx = rightEyePt.x - leftEyePt.x
    const dy = rightEyePt.y - leftEyePt.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    const visorW = dist * 2.2
    const visorH = dist * 0.44
    const angle = Math.atan2(dy, dx)

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    // Glass visor backplate
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)'
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.85)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(-visorW / 2, -visorH / 2, visorW, visorH, visorH / 2)
    ctx.fill()
    ctx.stroke()

    // Inner details grid line
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(-visorW / 2 + 12, 0)
    ctx.lineTo(visorW / 2 - 12, 0)
    ctx.stroke()

    ctx.restore()
  }

  // 3. Pupil center lock reticles (indices 468 left, 473 right)
  const lPupilPt = getPt(468)
  const rPupilPt = getPt(473)
  if (lPupilPt && rPupilPt) {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.95)' // Cyan pupil tracking ring
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(lPupilPt.x, lPupilPt.y, 2.5, 0, Math.PI * 2)
    ctx.arc(rPupilPt.x, rPupilPt.y, 2.5, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#ef4444' // Red center lock dot
    ctx.beginPath()
    ctx.arc(lPupilPt.x, lPupilPt.y, 0.8, 0, Math.PI * 2)
    ctx.arc(rPupilPt.x, rPupilPt.y, 0.8, 0, Math.PI * 2)
    ctx.fill()
  }

  // 4. Futuristic Target Bounding brackets (left face contour: 234, right: 454, top: 10, bottom: 152)
  const leftFace = getPt(234)
  const rightFace = getPt(454)
  const topFace = getPt(10)
  const bottomFace = getPt(152)

  if (leftFace && rightFace && topFace && bottomFace) {
    const pad = 12
    const minX = leftFace.x - pad
    const maxX = rightFace.x + pad
    const minY = topFace.y - pad * 1.5
    const maxY = bottomFace.y + pad

    const len = 10 // corner bracket width/height

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)' // Red brackets
    ctx.lineWidth = 1.2

    // Top-Left corner
    ctx.beginPath()
    ctx.moveTo(minX + len, minY)
    ctx.lineTo(minX, minY)
    ctx.lineTo(minX, minY + len)
    ctx.stroke()

    // Top-Right corner
    ctx.beginPath()
    ctx.moveTo(maxX - len, minY)
    ctx.lineTo(maxX, minY)
    ctx.lineTo(maxX, minY + len)
    ctx.stroke()

    // Bottom-Left corner
    ctx.beginPath()
    ctx.moveTo(minX + len, maxY)
    ctx.lineTo(minX, maxY)
    ctx.lineTo(minX, maxY - len)
    ctx.stroke()

    // Bottom-Right corner
    ctx.beginPath()
    ctx.moveTo(maxX - len, maxY)
    ctx.lineTo(maxX, maxY)
    ctx.lineTo(maxX, maxY - len)
    ctx.stroke()

    // Target stats label
    ctx.fillStyle = '#ef4444'
    ctx.font = 'bold 7px monospace'
    ctx.textAlign = 'left'
    ctx.fillText('SYS LOCK // SUBJECT_01', minX, minY - 6)
  }
}

// Draw Face Landmarker HUD Stats
const drawFaceStatsHud = () => {
  if (!ctx || !canvas) return

  const x = 12
  const y = 12
  const hudW = 145
  const hudH = 76

  // Background plate
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.beginPath()
  ctx.roundRect(x, y, hudW, hudH, 4)
  ctx.fill()

  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'left'

  if (faceData && faceData.detected) {
    // Face Detected: ACTIVE
    ctx.fillStyle = '#10b981' // Green
    ctx.fillText('• FACE TRACKING: ACTIVE', x + 8, y + 14)

    ctx.fillStyle = '#e4e4e7' // Slate White
    ctx.fillText(`CONFIDENCE: ${Math.round(faceData.confidence * 100)}%`, x + 8, y + 26)
    ctx.fillText(`PITCH:      ${Math.round(faceData.rotation.pitch)}°`, x + 8, y + 38)
    ctx.fillText(`YAW:        ${Math.round(faceData.rotation.yaw)}°`, x + 8, y + 50)
    ctx.fillText(`ROLL:       ${Math.round(faceData.rotation.roll)}°`, x + 8, y + 62)
  } else {
    // Face Detected: SEARCHING
    const pulse = Math.floor(performance.now() / 400) % 2 === 0
    ctx.fillStyle = pulse ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)' // Amber
    ctx.fillText('• FACE TRACKING: SEARCHING', x + 8, y + 14)
    ctx.fillStyle = '#a1a1aa'
    ctx.fillText('NO TARGET FACE DETECTED', x + 8, y + 26)
    ctx.fillText('ALIGN SUBJECT TO PREVIEW', x + 8, y + 38)
  }
}

// Draw Live Eye openness, pupil locking, and winking Telemetry debug HUD panel
const drawEyeDebugHud = (landmarks: { x: number; y: number; z: number }[]) => {
  if (!ctx || !canvas) return

  const getPtVal = (idx: number) => landmarks[idx] || null

  const lOuter = getPtVal(33)
  const lInner = getPtVal(133)
  const lTop = getPtVal(159)
  const lBottom = getPtVal(145)
  const lPupil = getPtVal(468)

  const rOuter = getPtVal(263)
  const rInner = getPtVal(362)
  const rTop = getPtVal(386)
  const rBottom = getPtVal(374)
  const rPupil = getPtVal(473)

  if (
    !lOuter ||
    !lInner ||
    !lTop ||
    !lBottom ||
    !lPupil ||
    !rOuter ||
    !rInner ||
    !rTop ||
    !rBottom ||
    !rPupil
  ) {
    return
  }

  // Calculate Euclidean distances
  const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  const lVert = dist(lTop, lBottom)
  const lHoriz = dist(lOuter, lInner)
  const lOpenness = lVert / lHoriz

  const rVert = dist(rTop, rBottom)
  const rHoriz = dist(rOuter, rInner)
  const rOpenness = rVert / rHoriz

  // Gaze ratio (relative coordinates)
  const lGaze = (lPupil.x - lOuter.x) / (lInner.x - lOuter.x)
  const rGaze = (rPupil.x - rInner.x) / (rOuter.x - rInner.x)
  const avgGaze = (lGaze + rGaze) / 2

  let gazeStr = 'CENTER'
  if (avgGaze < 0.44) {
    gazeStr = 'LOOKING LEFT'
  } else if (avgGaze > 0.56) {
    gazeStr = 'LOOKING RIGHT'
  }

  // Blink & Wink detection thresholds
  const blinkThreshold = 0.165
  const lBlink = lOpenness < blinkThreshold
  const rBlink = rOpenness < blinkThreshold

  let blinkStr = 'OPEN'
  if (lBlink && rBlink) {
    blinkStr = 'BLINKING'
  } else if (lBlink) {
    blinkStr = 'LEFT WINK'
  } else if (rBlink) {
    blinkStr = 'RIGHT WINK'
  }

  // Panel placement coordinates bottom-left
  const x = 12
  const hudH = 76
  const y = canvas.height - hudH - 12
  const hudW = 145

  // Background card
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.beginPath()
  ctx.roundRect(x, y, hudW, hudH, 4)
  ctx.fill()

  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#67e8f9' // Cyber cyan
  ctx.fillText('• EYE TRACKING TELEMETRY', x + 8, y + 14)

  ctx.fillStyle = '#e4e4e7'
  ctx.fillText(`L OPENNESS:  ${lOpenness.toFixed(2)}`, x + 8, y + 26)
  ctx.fillText(`R OPENNESS:  ${rOpenness.toFixed(2)}`, x + 8, y + 38)
  ctx.fillText(`PUPILS ID:   L:468, R:473`, x + 8, y + 50)
  ctx.fillText(`GAZE DIR:    ${gazeStr}`, x + 8, y + 62)

  // Color blink alert states
  if (blinkStr === 'BLINKING') {
    ctx.fillStyle = '#ef4444' // Red
  } else if (blinkStr.includes('WINK')) {
    ctx.fillStyle = '#f59e0b' // Amber
  } else {
    ctx.fillStyle = '#10b981' // Green
  }
  ctx.fillText(`BLINK STATE: ${blinkStr}`, x + 8, y + 70)
}

// Draw MediaPipe Hands Skeletons (Color coded Left neon pink, Right neon cyan)
const drawHandSkeletons = (
  hands: Hand[],
  drawW: number,
  drawH: number
) => {
  if (!ctx) return

  for (const hand of hands) {
    const landmarks = hand.landmarks
    const getPt = (idx: number) => {
      const pt = landmarks[idx]
      if (!pt) return null
      return {
        x: -drawW / 2 + pt.x * drawW,
        y: -drawH / 2 + pt.y * drawH,
      }
    }

    const color = hand.handedness === 'Left' ? '#ec4899' : '#06b6d4'
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1.8

    // Draw connection lines
    ctx.beginPath()
    for (const conn of handConnections) {
      const pt1 = getPt(conn[0])
      const pt2 = getPt(conn[1])
      if (pt1 && pt2) {
        ctx.moveTo(pt1.x, pt1.y)
        ctx.lineTo(pt2.x, pt2.y)
      }
    }
    ctx.stroke()

    // Draw joint dots
    for (let i = 0; i < landmarks.length; i++) {
      const pt = getPt(i)
      if (!pt) continue
      ctx.beginPath()
      ctx.arc(
        pt.x,
        pt.y,
        i === 0 || i === 4 || i === 8 || i === 12 || i === 16 || i === 20 ? 2.4 : 1.6,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    // Display floating gesture label above the hand knuckles (index 9)
    const labelPt = getPt(9)
    if (labelPt) {
      ctx.fillStyle = color
      ctx.font = 'bold 8px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(
        `${hand.handedness.toUpperCase()} // ${hand.gesture.toUpperCase()}`,
        labelPt.x,
        labelPt.y - 12
      )
    }
  }
}

// Draw MediaPipe Pose Body Skeleton (Neon Lime Green/Yellow #a3e635)
const drawPoseSkeleton = (
  pose: BodyPoseData,
  drawW: number,
  drawH: number
) => {
  if (!ctx) return

  const landmarks = pose.landmarks
  const getPt = (idx: number) => {
    const pt = landmarks[idx]
    if (!pt) return null
    return {
      x: -drawW / 2 + pt.x * drawW,
      y: -drawH / 2 + pt.y * drawH,
    }
  }

  ctx.strokeStyle = '#a3e635'
  ctx.fillStyle = '#a3e635'
  ctx.lineWidth = 2.2

  // Draw skeleton lines
  ctx.beginPath()
  for (const conn of poseConnections) {
    const pt1 = getPt(conn[0])
    const pt2 = getPt(conn[1])
    if (pt1 && pt2) {
      ctx.moveTo(pt1.x, pt1.y)
      ctx.lineTo(pt2.x, pt2.y)
    }
  }
  ctx.stroke()

  // Draw main keypoints joints (Nose, shoulders, elbows, wrists, hips, knees, ankles)
  const mainKeypoints = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]
  for (const idx of mainKeypoints) {
    const pt = getPt(idx)
    if (!pt) continue

    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2)
    ctx.stroke()
  }
}

// Render alignment lines, safe zones, vhs timestamps
const drawOverlays = () => {
  if (!ctx || !canvas) return

  const w = canvas.width
  const h = canvas.height

  switch (params.overlay) {
    case 'grid':
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(w / 3, 0)
      ctx.lineTo(w / 3, h)
      ctx.moveTo((w * 2) / 3, 0)
      ctx.lineTo((w * 2) / 3, h)
      ctx.moveTo(0, h / 3)
      ctx.lineTo(w, h / 3)
      ctx.moveTo(0, (h * 2) / 3)
      ctx.lineTo(w, (h * 2) / 3)
      ctx.stroke()
      break

    case 'safe-zone':
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.rect(w * 0.05, h * 0.05, w * 0.9, h * 0.9)
      ctx.rect(w * 0.1, h * 0.1, w * 0.8, h * 0.8)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.font = '8px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('ACTION SAFE', w * 0.05 + 6, h * 0.05 + 12)
      ctx.textAlign = 'right'
      ctx.fillText('TITLE SAFE', w * 0.9 - 6, h * 0.9 - 6)
      break

    case 'vhs':
      const isRed = Math.floor(performance.now() / 500) % 2 === 0
      ctx.fillStyle = isRed ? '#ef4444' : 'rgba(255, 255, 255, 0.3)'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'left'
      ctx.beginPath()
      ctx.arc(20, 20, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillText('REC', 30, 23)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'right'
      ctx.fillText('PLAY', w - 16, 23)
      ctx.fillText('SP L-24', w - 16, 35)

      ctx.textAlign = 'left'
      ctx.fillText('TRACKING: OK', 16, h - 35)
      ctx.fillText('LP MODE', 16, h - 23)

      ctx.textAlign = 'right'
      ctx.fillText('JULY 15, 2026', w - 16, h - 35)
      ctx.fillText('18:52:00', w - 16, h - 23)
      break

    case 'cinematic':
      ctx.fillStyle = '#000000'
      const barHeight = Math.round(h * 0.11)
      ctx.fillRect(0, 0, w, barHeight)
      ctx.fillRect(0, h - barHeight, w, barHeight)
      break
  }
}

// Render dynamic HUD performance metrics
const drawFpsHud = () => {
  if (!ctx || !canvas) return

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.beginPath()
  const hudW = 75
  const hudH = 18
  const x = canvas.width - hudW - 12
  const y = canvas.height - hudH - 12

  ctx.roundRect(x, y, hudW, hudH, 4)
  ctx.fill()

  ctx.fillStyle = '#10b981'
  ctx.beginPath()
  ctx.arc(x + 10, y + 9, 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#e4e4e7'
  ctx.font = 'bold 8px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(`${currentFps} FPS`, x + 18, y + 12)
}

const draw = () => {
  if (!ctx || !canvas) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()

  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((params.rotation * Math.PI) / 180)
  ctx.scale(params.scale, params.scale)

  ctx.filter = getFilterString()

  if (lastFrame) {
    const frameW = lastFrame.width
    const frameH = lastFrame.height

    const frameRatio = frameW / frameH
    const canvasRatio = canvas.width / canvas.height

    let drawW = canvas.width
    let drawH = canvas.height

    if (frameRatio > canvasRatio) {
      drawH = canvas.width / frameRatio
    } else {
      drawW = canvas.height * frameRatio
    }

    ctx.drawImage(lastFrame, -drawW / 2, -drawH / 2, drawW, drawH)

    // Render local face landmarks on top of the image inside transformation context
    if (faceData && faceData.detected && faceData.landmarks) {
      drawFaceLandmarks(faceData.landmarks, drawW, drawH)
      if (params.faceMeshEnabled) {
        drawArObjects(faceData.landmarks, drawW, drawH)
      }
    }

    // Render local hands skeletons inside transformation context
    if (handData && params.handTrackingEnabled) {
      drawHandSkeletons(handData, drawW, drawH)
    }

    // Render local body skeleton inside transformation context
    if (poseData && poseData.detected && params.poseTrackingEnabled) {
      drawPoseSkeleton(poseData, drawW, drawH)
    }

    if (params.selectedVfx !== 'none') {
      drawVfxOverlays(drawW, drawH)
      drawVfxLightning(drawW, drawH)
      updateParticles(drawW, drawH)
    }
  } else {
    drawSimulatedBackdrop()
    if (params.selectedVfx !== 'none') {
      drawVfxOverlays(canvas.width, canvas.height)
      drawVfxLightning(canvas.width, canvas.height)
      updateParticles(canvas.width, canvas.height)
    }
  }

  ctx.restore()

  drawOverlays()
  drawFpsHud()

  // Draw face stats overlays outside transform context
  drawFaceStatsHud()
  if (faceData && faceData.detected && params.faceMeshEnabled) {
    drawEyeDebugHud(faceData.landmarks)
  }
}

const startAnimationLoop = () => {
  if (animationFrameId !== null) return

  const tick = () => {
    updateFps()
    draw()
    animationFrameId = requestAnimationFrame(tick)
  }
  animationFrameId = requestAnimationFrame(tick)
}

const stopAnimationLoop = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// Message listener
self.onmessage = (e) => {
  const { type } = e.data

  switch (type) {
    case 'init':
      canvas = e.data.canvas
      if (canvas) {
        ctx = canvas.getContext('2d', {
          alpha: false,
          desynchronized: true,
          willReadFrequently: false,
        })
      }
      startAnimationLoop()
      break

    case 'init_mesh_connections':
      tesselationConnections = e.data.tesselation || []
      contourConnections = e.data.contours || []
      irisConnections = [
        ...(e.data.rightIris || []),
        ...(e.data.leftIris || [])
      ]
      break

    case 'resize':
      if (canvas) {
        canvas.width = e.data.width
        canvas.height = e.data.height
        draw()
      }
      break

    case 'params':
      params = { ...params, ...e.data.params }
      draw()
      break

    case 'frame':
      stopAnimationLoop()

      if (lastFrame) {
        lastFrame.close()
      }
      lastFrame = e.data.imageBitmap
      faceData = e.data.faceData || null
      handData = e.data.handData || null
      poseData = e.data.poseData || null

      updateFps()
      draw()
      break

    case 'clear_frame':
      if (lastFrame) {
        lastFrame.close()
        lastFrame = null
      }
      faceData = null
      handData = null
      poseData = null
      draw()
      startAnimationLoop()
      break

    case 'stop':
      stopAnimationLoop()
      break
  }
}
