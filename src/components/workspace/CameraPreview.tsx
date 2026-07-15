'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useEditorStore } from '@/store/useEditorStore'
import { useWebcam, ResolutionProfile } from '@/hooks/useWebcam'
import {
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  Square,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { FaceLandmarker, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'




export function CameraPreview() {
  const {
    brightness,
    contrast,
    saturation,
    blur,
    scale,
    rotation,
    aspectRatio,
    filter,
    overlay,
    isPlaying,
    tracks,
    faceMeshEnabled,
    faceMeshMode,
    faceMeshModeLevel,
    handTrackingEnabled,
    poseTrackingEnabled,
    threeActiveObject,
    selectedVfx,
    vfxOpacity,
    vfxColor,
    vfxStrength,
    vfxSpeed,
    vfxRadius,
  } = useEditorStore()

  // Find active timeline video clip reactively only when clip bounds change
  const activeClip = useEditorStore((state) => {
    const videoTrack = state.tracks.find((t) => t.type === 'video')
    if (!videoTrack) return null
    return (
      videoTrack.clips.find(
        (clip) => state.currentTime >= clip.start && state.currentTime <= clip.start + clip.duration
      ) || null
    )
  })

  // Interpolates keyframed clip properties at playhead time
  const getAnimatedValue = useCallback((
    currentTime: number,
    propertyName: 'opacity' | 'scale' | 'rotation' | 'volume',
    baseValue: number
  ) => {
    let activeClipWithKeyframes: import('@/types').TimelineClip | null = null
    for (const track of tracks) {
      const found = track.clips.find(
        (clip) => currentTime >= clip.start && currentTime <= clip.start + clip.duration
      )
      if (found && found.keyframes && found.keyframes.length > 0) {
        activeClipWithKeyframes = found
        break
      }
    }

    if (!activeClipWithKeyframes) return baseValue

    const relativeTime = currentTime - activeClipWithKeyframes.start
    const kfs = (activeClipWithKeyframes.keyframes || []).filter(
      (k) => k.property === propertyName
    )
    if (kfs.length === 0) return baseValue

    kfs.sort((a, b) => a.time - b.time)

    if (relativeTime <= kfs[0].time) return kfs[0].value
    if (relativeTime >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value

    let prevKf = kfs[0]
    let nextKf = kfs[kfs.length - 1]
    for (let i = 0; i < kfs.length - 1; i++) {
      if (relativeTime >= kfs[i].time && relativeTime <= kfs[i + 1].time) {
        prevKf = kfs[i]
        nextKf = kfs[i + 1]
        break
      }
    }

    const tRatio = (relativeTime - prevKf.time) / (nextKf.time - prevKf.time)
    return prevKf.value + tRatio * (nextKf.value - prevKf.value)
  }, [tracks])

  const {
    stream,
    isActive: isWebcamActive,
    isLoading: isWebcamLoading,
    error: webcamError,
    devices: webcamDevices,
    selectedDeviceId,
    selectedResolution,
    startWebcam,
    stopWebcam,
    switchDevice,
    switchResolution,
  } = useWebcam()

  const videoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const threeCanvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Local Video Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [isRecordingPaused, setIsRecordingPaused] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recordedBlobRef = useRef<Blob | null>(null)

  // AI Assistant States
  const [aiInput, setAiInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const applyAiStateChange = useEditorStore((state) => state.applyAiStateChange)
  const geminiApiKey = useEditorStore((state) => state.geminiApiKey)
  const groqApiKey = useEditorStore((state) => state.groqApiKey)
  const aiProvider = useEditorStore((state) => state.aiProvider)

  // Local Rule-based Fallback Parser
  const runLocalFallback = useCallback((prompt: string): boolean => {
    const text = prompt.toLowerCase()
    
    if (text.includes('neon') && (text.includes('face') || text.includes('head')) && (text.includes('blue') || text.includes('cyan'))) {
      applyAiStateChange({
        selectedVfx: 'neon',
        vfxColor: '#00ffff',
        vfxOpacity: 100,
        faceMeshEnabled: true,
        faceMeshMode: 'outline',
      })
      toast.success('AI: Created blue neon effect around your face!')
      return true
    }

    if (text.includes('neon') && text.includes('face')) {
      applyAiStateChange({
        selectedVfx: 'neon',
        vfxColor: '#a855f7',
        vfxOpacity: 90,
        faceMeshEnabled: true,
        faceMeshMode: 'outline',
      })
      toast.success('AI: Created purple neon effect around your face!')
      return true
    }

    if (text.includes('visor') || text.includes('glasses') || text.includes('cap') || text.includes('halo') || text.includes('ring')) {
      let object: 'halo' | 'ring' | 'glasses' | 'none' = 'glasses'
      if (text.includes('halo')) object = 'halo'
      else if (text.includes('ring')) object = 'ring'
      
      applyAiStateChange({
        threeActiveObject: object,
        faceMeshEnabled: true,
      })
      toast.success(`AI: Attached 3D overlay: ${object.toUpperCase()}`)
      return true
    }

    if (text.includes('fire') || text.includes('spark') || text.includes('smoke')) {
      applyAiStateChange({
        selectedVfx: text.includes('smoke') ? 'smoke' : 'fire',
        handTrackingEnabled: true,
        vfxOpacity: 100,
        vfxStrength: 80,
      })
      toast.success(`AI: Created fingertip emissions!`)
      return true
    }

    if (text.includes('lightning') || text.includes('electric') || text.includes('arc')) {
      applyAiStateChange({
        selectedVfx: 'lightning',
        handTrackingEnabled: true,
        faceMeshEnabled: true,
      })
      toast.success('AI: Enabled lightning electric arcs!')
      return true
    }

    if (text.includes('pose') || text.includes('skeleton') || text.includes('body')) {
      applyAiStateChange({
        poseTrackingEnabled: true,
      })
      toast.success('AI: Enabled Pose body skeleton overlays')
      return true
    }

    if (text.includes('rain') || text.includes('snow')) {
      const vfx = text.includes('rain') ? 'rain' : 'snow'
      applyAiStateChange({
        selectedVfx: vfx,
        vfxSpeed: 60,
        vfxOpacity: 90,
      })
      toast.success(`AI: Activated weather simulation: ${vfx}`)
      return true
    }

    if (text.includes('grayscale') || text.includes('sepia') || text.includes('noir') || text.includes('cyberpunk') || text.includes('vintage')) {
      let filterName: import('@/types').FilterType = 'noir'
      if (text.includes('grayscale')) filterName = 'grayscale'
      else if (text.includes('sepia')) filterName = 'sepia'
      else if (text.includes('cyberpunk')) filterName = 'cyberpunk'
      else if (text.includes('vintage')) filterName = 'vintage'
      
      applyAiStateChange({
        filter: filterName,
      })
      toast.success(`AI: Applied filter: ${filterName}`)
      return true
    }

    return false
  }, [applyAiStateChange])

  // AI submit form handler
  const handleAiSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiInput.trim()) return

    const promptText = aiInput.trim()
    setAiInput('')
    setIsAiLoading(true)

    const activeKey = aiProvider === 'gemini' ? geminiApiKey : groqApiKey
    if (!activeKey) {
      const handled = runLocalFallback(promptText)
      setIsAiLoading(false)
      if (handled) return

      toast.info('Please enter your Gemini or Groq API Key in Settings to execute arbitrary prompts!')
      return
    }

    try {
      let responseJson: Partial<import('@/store/useEditorStore').EditorState> | null = null

      if (aiProvider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`
        const body = {
          contents: [
            {
              parts: [
                {
                  text: `You are the AI Assistant for VisionFX, a real-time camera tracking and VFX effects application.
Your task is to translate user natural language requests into JSON configurations that update the application state.
The application state supports the following properties:
- brightness: number (0 to 200)
- contrast: number (0 to 200)
- saturation: number (0 to 200)
- blur: number (0 to 50)
- scale: number (0.5 to 2.5)
- rotation: number (-180 to 180)
- filter: 'none' | 'grayscale' | 'sepia' | 'vintage' | 'noir' | 'cyberpunk' | 'warm' | 'cool'
- overlay: 'none' | 'grid' | 'safe-zone' | 'vhs' | 'cinematic'
- faceMeshEnabled: boolean
- faceMeshMode: 'wireframe' | 'points' | 'outline' | 'all'
- faceMeshModeLevel: 'performance' | 'quality'
- handTrackingEnabled: boolean
- poseTrackingEnabled: boolean
- threeActiveObject: 'halo' | 'ring' | 'glasses' | 'none'
- selectedVfx: 'glow' | 'neon' | 'outline' | 'blur' | 'particles' | 'fire' | 'smoke' | 'lightning' | 'rain' | 'snow' | 'none'
- vfxOpacity: number (0 to 100)
- vfxColor: string (hex color format, e.g. '#00ffff')
- vfxStrength: number (1 to 100)
- vfxSpeed: number (1 to 100)
- vfxRadius: number (1 to 100)

Respond ONLY with a raw JSON object containing the properties that should be updated. Do not include markdown code blocks, backticks, or conversational text.
Example request: "Add blue neon around my face"
Response:
{"selectedVfx": "neon", "vfxColor": "#00f0ff", "vfxOpacity": 100, "faceMeshEnabled": true, "faceMeshMode": "outline"}

User request: "${promptText}"`
                }
              ]
            }
          ]
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })

        if (!res.ok) throw new Error(`Gemini API returned status ${res.status}`)
        const data = await res.json()
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
        responseJson = JSON.parse(cleanText)
      } else {
        const url = 'https://api.groq.com/openai/v1/chat/completions'
        const body = {
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: `You are the AI Assistant for VisionFX. Translate natural language requests into structured JSON updates.
State properties:
- brightness (0-200), contrast (0-200), saturation (0-200), blur (0-50), scale (0.5-2.5), rotation (-180 to 180)
- filter: 'none' | 'grayscale' | 'sepia' | 'vintage' | 'noir' | 'cyberpunk' | 'warm' | 'cool'
- overlay: 'none' | 'grid' | 'safe-zone' | 'vhs' | 'cinematic'
- faceMeshEnabled (boolean), faceMeshMode: 'wireframe' | 'points' | 'outline' | 'all'
- handTrackingEnabled (boolean), poseTrackingEnabled (boolean)
- threeActiveObject: 'halo' | 'ring' | 'glasses' | 'none'
- selectedVfx: 'glow' | 'neon' | 'outline' | 'blur' | 'particles' | 'fire' | 'smoke' | 'lightning' | 'rain' | 'snow' | 'none'
- vfxOpacity (0-100), vfxColor (hex), vfxStrength (1-100), vfxSpeed (1-100), vfxRadius (1-100)

Respond ONLY with raw JSON. No explanation, no backticks, no markdown code blocks.`
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          temperature: 0.1
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify(body)
        })

        if (!res.ok) throw new Error(`Groq API returned status ${res.status}`)
        const data = await res.json()
        const rawText = data.choices?.[0]?.message?.content || '{}'
        const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
        responseJson = JSON.parse(cleanText)
      }

      if (responseJson && Object.keys(responseJson).length > 0) {
        applyAiStateChange(responseJson)
        toast.success(`AI: Configured parameters: ${Object.keys(responseJson).join(', ')}`)
      } else {
        toast.error('AI: Response was empty or not understandable.')
      }
    } catch (err) {
      console.error('AI Command failed:', err)
      const handled = runLocalFallback(promptText)
      if (handled) return
      toast.error('AI: Prompt request failed. Please check your API key.')
    } finally {
      setIsAiLoading(false)
    }
  }, [aiInput, aiProvider, geminiApiKey, groqApiKey, runLocalFallback, applyAiStateChange])

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  // Smooth tracking ref histories
  const smoothedLandmarksRef = useRef<import('@mediapipe/tasks-vision').NormalizedLandmark[]>([])
  const smoothedRotationRef = useRef({ pitch: 0, yaw: 0, roll: 0 })
  const smoothedLeftHandRef = useRef<import('@mediapipe/tasks-vision').NormalizedLandmark[]>([])
  const smoothedRightHandRef = useRef<import('@mediapipe/tasks-vision').NormalizedLandmark[]>([])
  const smoothedPoseRef = useRef<import('@mediapipe/tasks-vision').NormalizedLandmark[]>([])

  // Three.js Engine Refs
  const threeSceneRef = useRef<THREE.Scene | null>(null)
  const threeCameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const haloMeshRef = useRef<THREE.Mesh | null>(null)
  const ringMeshRef = useRef<THREE.Mesh | null>(null)
  const glassesMeshRef = useRef<THREE.Group | null>(null)

  // Grabbing & Dragging Ref Histories
  const isGrabbedRef = useRef(false)
  const objectPositionRef = useRef({ x: 0, y: 0, z: 0 })

  const [muted, setMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const startRecording = () => {
    if (!canvasRef.current) return
    recordedChunksRef.current = []
    setRecordingDuration(0)

    try {
      const canvasEl = canvasRef.current as HTMLCanvasElement & { captureStream?: (fps: number) => MediaStream }
      const canvasStream = canvasEl.captureStream ? canvasEl.captureStream(30) : new MediaStream()
      const tracksToCombine = [...canvasStream.getVideoTracks()]

      if (stream) {
        const audioTracks = stream.getAudioTracks()
        if (audioTracks.length > 0) {
          tracksToCombine.push(audioTracks[0])
        }
      }

      const combinedStream = new MediaStream(tracksToCombine)

      let options = { mimeType: 'video/webm;codecs=vp9' }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8' }
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' }
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4' }
      }

      const recorder = new MediaRecorder(combinedStream, options)

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm'
        const blob = new Blob(recordedChunksRef.current, { type: mimeType })
        recordedBlobRef.current = blob
        const url = URL.createObjectURL(blob)
        setRecordedVideoUrl(url)
        setShowDownloadModal(true)
      }

      recorder.start(250)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setIsRecordingPaused(false)
      toast.success('Recording started!')

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Recording initialization failed:', err)
      toast.error('Could not initialize video recorder.')
    }
  }

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.pause()
      setIsRecordingPaused(true)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      toast.info('Recording paused')
    }
  }

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'paused') {
      recorder.resume()
      setIsRecordingPaused(false)
      toast.info('Recording resumed')
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
      recorder.stop()
      setIsRecording(false)
      setIsRecordingPaused(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      toast.success('Recording finished!')
    }
  }

  const downloadRecording = (format: 'webm' | 'mp4') => {
    const blob = recordedBlobRef.current
    if (!blob) return

    const type = format === 'mp4' ? 'video/mp4' : 'video/webm'
    const name = `visionfx_recording_${Date.now()}.${format}`
    const file = new File([blob], name, { type })
    const url = URL.createObjectURL(file)

    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Video downloaded as ${format.toUpperCase()}`)
  }

  // Face, Hand & Pose Landmarker states
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null)
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null)
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null)
  const [isModelLoading, setIsModelLoading] = useState(true)
  // 1. Initialize MediaPipe Face Landmarker model (Runs dynamically based on performance/quality delegate)
  useEffect(() => {
    let active = true
    let faceInstance: import('@mediapipe/tasks-vision').FaceLandmarker | null = null
    let handInstance: import('@mediapipe/tasks-vision').HandLandmarker | null = null
    let poseInstance: import('@mediapipe/tasks-vision').PoseLandmarker | null = null

    Promise.resolve().then(() => {
      if (active) setIsModelLoading(true)
    })

    const initLandmarkers = async () => {
      try {
        const {
          FilesetResolver,
          FaceLandmarker: FaceLandmarkerClass,
          HandLandmarker: HandLandmarkerClass,
          PoseLandmarker: PoseLandmarkerClass,
        } = await import('@mediapipe/tasks-vision')

        let vision
        try {
          vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
          )
        } catch (cdnErr) {
          console.warn('jsdelivr CDN timed out or was blocked, falling back to unpkg...', cdnErr)
          vision = await FilesetResolver.forVisionTasks(
            'https://unpkg.com/@mediapipe/tasks-vision@0.10.8/wasm'
          )
        }

        const isPerf = faceMeshModeLevel === 'performance'
        const delegate = isPerf ? 'GPU' : 'CPU'

        // Helper to enforce download timeout to prevent hanging forever
        const withTimeout = <T,>(promise: Promise<T>, ms: number, errMsg: string): Promise<T> => {
          return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(errMsg)), ms)
            promise
              .then((res) => {
                clearTimeout(timer)
                resolve(res)
              })
              .catch((err) => {
                clearTimeout(timer)
                reject(err)
              })
          })
        }

        // Load models in parallel (concurrently) with a 10-second timeout safety margin
        const [faceResult, handResult, poseResult] = await Promise.allSettled([
          withTimeout(
            FaceLandmarkerClass.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate,
              },
              runningMode: 'VIDEO',
              outputFaceBlendshapes: true,
              outputFacialTransformationMatrixes: true,
              numFaces: 1,
              minFaceDetectionConfidence: isPerf ? 0.35 : 0.65,
              minFacePresenceConfidence: isPerf ? 0.35 : 0.65,
              minTrackingConfidence: isPerf ? 0.35 : 0.65,
            }),
            10000,
            'Face Landmarker download timed out'
          ),
          withTimeout(
            HandLandmarkerClass.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate,
              },
              runningMode: 'VIDEO',
              numHands: 2,
              minHandDetectionConfidence: isPerf ? 0.35 : 0.65,
              minHandPresenceConfidence: isPerf ? 0.35 : 0.65,
              minTrackingConfidence: isPerf ? 0.35 : 0.65,
            }),
            10000,
            'Hand Landmarker download timed out'
          ),
          withTimeout(
            PoseLandmarkerClass.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
                delegate,
              },
              runningMode: 'VIDEO',
              numPoses: 1,
              minPoseDetectionConfidence: isPerf ? 0.35 : 0.65,
              minPosePresenceConfidence: isPerf ? 0.35 : 0.65,
              minTrackingConfidence: isPerf ? 0.35 : 0.65,
            }),
            10000,
            'Pose Landmarker download timed out'
          ),
        ])

        if (faceResult.status === 'fulfilled') {
          faceInstance = faceResult.value
          if (active) setFaceLandmarker(faceResult.value)
        } else {
          console.error('Face landmarker model failed to load:', faceResult.reason)
        }

        if (handResult.status === 'fulfilled') {
          handInstance = handResult.value
          if (active) setHandLandmarker(handResult.value)
        } else {
          console.error('Hand landmarker model failed to load:', handResult.reason)
        }

        if (poseResult.status === 'fulfilled') {
          poseInstance = poseResult.value
          if (active) setPoseLandmarker(poseResult.value)
        } else {
          console.error('Pose landmarker model failed to load:', poseResult.reason)
        }

        if (active) {
          setIsModelLoading(false)
          if (faceResult.status === 'fulfilled') {
            toast.success(`Tracking running in ${isPerf ? 'GPU Performance' : 'CPU Quality'} mode`)
          } else {
            toast.warning('Face Tracking failed to load, but other tracking channels might be available.')
          }
        }
      } catch (err) {
        console.error('Failed to resolve MediaPipe modules:', err)
        if (active) {
          setIsModelLoading(false)
          toast.error('Face, hand, and pose tracking model initialization failed.')
        }
      }
    }

    initLandmarkers()

    return () => {
      active = false
      if (faceInstance) faceInstance.close()
      if (handInstance) handInstance.close()
      if (poseInstance) poseInstance.close()
    }
  }, [faceMeshModeLevel])

  // 1b. Transfer FaceLandmarker triangulation connections to worker
  useEffect(() => {
    const worker = workerRef.current
    if (worker && faceLandmarker) {
      import('@mediapipe/face_mesh').then((mp) => {
        worker.postMessage({
          type: 'init_mesh_connections',
          tesselation: mp.FACEMESH_TESSELATION,
          contours: mp.FACEMESH_CONTOURS,
          rightIris: mp.FACEMESH_RIGHT_IRIS,
          leftIris: mp.FACEMESH_LEFT_IRIS,
        })
      })
    }
  }, [faceLandmarker])

  // 2. Initialize Web Worker and OffscreenCanvas transfer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const worker = new Worker(new URL('./renderer.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker

    const width = canvas.clientWidth || 640
    const height = canvas.clientHeight || 360

    canvas.width = width
    canvas.height = height

    const offscreen = canvas.transferControlToOffscreen()
    worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen])

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return
      const { width: newW, height: newH } = entries[0].contentRect
      const w = Math.round(newW) || 640
      const h = Math.round(newH) || 360
      worker.postMessage({ type: 'resize', width: w, height: h })
    })
    resizeObserver.observe(canvas)

    return () => {
      resizeObserver.disconnect()
      worker.postMessage({ type: 'stop' })
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // 3a. Sync manual parameters to Web Worker
  useEffect(() => {
    if (workerRef.current) {
      const state = useEditorStore.getState()
      const animOpacity = getAnimatedValue(state.currentTime, 'opacity', vfxOpacity)
      const animScale = getAnimatedValue(state.currentTime, 'scale', scale)
      const animRotation = getAnimatedValue(state.currentTime, 'rotation', rotation)

      workerRef.current.postMessage({
        type: 'params',
        params: {
          brightness,
          contrast,
          saturation,
          blur,
          rotation: animRotation,
          scale: animScale,
          aspectRatio,
          filter,
          overlay,
          faceMeshEnabled,
          faceMeshMode,
          handTrackingEnabled,
          poseTrackingEnabled,
          selectedVfx,
          vfxOpacity: animOpacity,
          vfxColor,
          vfxStrength,
          vfxSpeed,
          vfxRadius,
        },
      })
    }
  }, [
    brightness,
    contrast,
    saturation,
    blur,
    rotation,
    scale,
    aspectRatio,
    filter,
    overlay,
    faceMeshEnabled,
    faceMeshMode,
    handTrackingEnabled,
    poseTrackingEnabled,
    selectedVfx,
    vfxOpacity,
    vfxColor,
    vfxStrength,
    vfxSpeed,
    vfxRadius,
    getAnimatedValue,
  ])

  // 3b. Transient subscription to animate properties during playhead ticks without React renders
  useEffect(() => {
    let lastTime = 0
    const unsub = useEditorStore.subscribe((state) => {
      if (state.currentTime !== lastTime && workerRef.current) {
        lastTime = state.currentTime
        const animOpacity = getAnimatedValue(state.currentTime, 'opacity', state.vfxOpacity)
        const animScale = getAnimatedValue(state.currentTime, 'scale', state.scale)
        const animRotation = getAnimatedValue(state.currentTime, 'rotation', state.rotation)

        workerRef.current.postMessage({
          type: 'params',
          params: {
            brightness: state.brightness,
            contrast: state.contrast,
            saturation: state.saturation,
            blur: state.blur,
            rotation: animRotation,
            scale: animScale,
            aspectRatio: state.aspectRatio,
            filter: state.filter,
            overlay: state.overlay,
            faceMeshEnabled: state.faceMeshEnabled,
            faceMeshMode: state.faceMeshMode,
            handTrackingEnabled: state.handTrackingEnabled,
            poseTrackingEnabled: state.poseTrackingEnabled,
            selectedVfx: state.selectedVfx,
            vfxOpacity: animOpacity,
            vfxColor: state.vfxColor,
            vfxStrength: state.vfxStrength,
            vfxSpeed: state.vfxSpeed,
            vfxRadius: state.vfxRadius,
          },
        })
      }
    })
    return unsub
  }, [getAnimatedValue])

  // 3b. Initialize and manage Three.js WebGL transparent overlay scene
  useEffect(() => {
    const canvas = threeCanvasRef.current
    if (!canvas || threeActiveObject === 'none') {
      if (threeRendererRef.current) {
        threeRendererRef.current.dispose()
        threeRendererRef.current = null
      }
      threeSceneRef.current = null
      threeCameraRef.current = null
      haloMeshRef.current = null
      ringMeshRef.current = null
      glassesMeshRef.current = null
      return
    }

    const width = canvas.clientWidth || 640
    const height = canvas.clientHeight || 360

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    threeRendererRef.current = renderer

    const scene = new THREE.Scene()
    threeSceneRef.current = scene

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    )
    camera.position.z = 100
    threeCameraRef.current = camera

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 2, 300)
    pointLight.position.set(0, 100, 100)
    scene.add(pointLight)

    if (threeActiveObject === 'halo') {
      const geometry = new THREE.TorusGeometry(32, 4, 16, 64)
      const material = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.85,
      })
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)
      haloMeshRef.current = mesh
    } else if (threeActiveObject === 'ring') {
      const geometry = new THREE.TorusGeometry(38, 2, 8, 48)
      const material = new THREE.MeshBasicMaterial({
        color: 0xec4899,
        transparent: true,
        opacity: 0.9,
      })
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)
      ringMeshRef.current = mesh
    } else if (threeActiveObject === 'glasses') {
      const group = new THREE.Group()

      const visorGeo = new THREE.BoxGeometry(60, 14, 2)
      const visorMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.65,
      })
      const visorPlate = new THREE.Mesh(visorGeo, visorMat)
      group.add(visorPlate)

      const barGeo = new THREE.BoxGeometry(64, 2, 4)
      const barMat = new THREE.MeshBasicMaterial({ color: 0xec4899 })
      const visorBar = new THREE.Mesh(barGeo, barMat)
      visorBar.position.y = 7
      group.add(visorBar)

      scene.add(group)
      glassesMeshRef.current = group
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return
      const { width: newW, height: newH } = entries[0].contentRect
      renderer.setSize(newW, newH)
      camera.left = -newW / 2
      camera.right = newW / 2
      camera.top = newH / 2
      camera.bottom = -newH / 2
      camera.updateProjectionMatrix()
    })
    resizeObserver.observe(canvas)

    return () => {
      resizeObserver.disconnect()
      
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose()
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => mat.dispose())
            } else {
              obj.material.dispose()
            }
          }
        }
      })

      renderer.dispose()
      threeRendererRef.current = null
      threeSceneRef.current = null
      threeCameraRef.current = null
      haloMeshRef.current = null
      ringMeshRef.current = null
      glassesMeshRef.current = null
    }
  }, [threeActiveObject])

  // 3c. Run simulated floating loop for Three.js when preview is idle
  useEffect(() => {
    if (threeActiveObject === 'none') return

    let animFrameId: number
    const tickSim = () => {
      const isVideoActive = isWebcamActive || activeClip
      if (!isVideoActive) {
        const activeMesh = haloMeshRef.current || ringMeshRef.current || glassesMeshRef.current
        if (activeMesh && threeSceneRef.current && threeCameraRef.current && threeRendererRef.current) {
          const t = performance.now() * 0.002
          
          objectPositionRef.current.x = Math.sin(t) * 15
          objectPositionRef.current.y = Math.cos(t * 1.5) * 10

          activeMesh.position.set(objectPositionRef.current.x, objectPositionRef.current.y, 0)
          activeMesh.scale.setScalar(2.2)

          const defaultPitch = threeActiveObject === 'glasses' ? 0 : Math.PI / 2
          activeMesh.rotation.x = defaultPitch + Math.sin(t * 0.5) * 0.15
          activeMesh.rotation.y = t * 0.5
          activeMesh.rotation.z = Math.cos(t * 0.5) * 0.1

          threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current)
        }
      }
      animFrameId = requestAnimationFrame(tickSim)
    }

    animFrameId = requestAnimationFrame(tickSim)
    return () => cancelAnimationFrame(animFrameId)
  }, [threeActiveObject, isWebcamActive, activeClip])

  // 5. Sync hidden stock video player with store status
  useEffect(() => {
    const video = previewVideoRef.current
    if (!video || !activeClip) return

    if (isPlaying) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }

    const clipOffset = useEditorStore.getState().currentTime - activeClip.start
    if (Math.abs(video.currentTime - clipOffset) > (isPlaying ? 0.35 : 0.1)) {
      video.currentTime = clipOffset
    }
  }, [isPlaying, activeClip])

  // 6. Capture video frames, run MediaPipe face landmarker, & transfer ImageBitmaps to Worker
  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return

    const activeVideo = isWebcamActive
      ? videoRef.current
      : activeClip
        ? previewVideoRef.current
        : null

    if (!activeVideo) {
      worker.postMessage({ type: 'clear_frame' })
      return
    }

    let callbackId: number
    let isTerminated = false

    const sendFrame = () => {
      if (isTerminated) return

      if (activeVideo.paused || activeVideo.ended || (!isWebcamActive && !activeClip)) {
        callbackId = requestAnimationFrame(sendFrame)
        return
      }

      if (activeVideo.readyState >= 2) {
        if (activeClip && isPlaying) {
          const curTime = useEditorStore.getState().currentTime
          const clipOffset = curTime - activeClip.start
          if (Math.abs(activeVideo.currentTime - clipOffset) > 0.35) {
            activeVideo.currentTime = clipOffset
          }
        }

        let faceDataResult = {
          detected: false,
          landmarks: [] as { x: number; y: number; z: number }[],
          rotation: { pitch: 0, yaw: 0, roll: 0 },
          confidence: 0,
        }

        // Run MediaPipe Face Landmarker inference on current video frame
        if (faceLandmarker) {
          const timestamp = performance.now()
          try {
            const results = faceLandmarker.detectForVideo(activeVideo, timestamp)
            if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
              const landmarks = results.faceLandmarks[0]

              // Decompose 4x4 matrix to extract head rotation angles (Euler yaw, pitch, roll)
              let pitch = 0
              let yaw = 0
              let roll = 0

              if (
                results.facialTransformationMatrixes &&
                results.facialTransformationMatrixes.length > 0
              ) {
                const matrix = results.facialTransformationMatrixes[0].data
                const m00 = matrix[0]
                const m10 = matrix[1]
                const m20 = matrix[2]
                const m21 = matrix[6]
                const m22 = matrix[10]

                // yaw (rotation around Y-axis)
                yaw = Math.asin(-Math.max(-1, Math.min(1, m20))) * (180 / Math.PI)

                // pitch (rotation around X-axis)
                pitch = Math.atan2(m21, m22) * (180 / Math.PI)

                // roll (rotation around Z-axis)
                roll = Math.atan2(m10, m00) * (180 / Math.PI)
              }

              // Apply Exponential Moving Average (EMA) smoothing to eliminate high-frequency tracking jitter
              const smoothedLandmarks = [...landmarks]
              let smoothedRotation = { pitch, yaw, roll }

              const alphaL = 0.22 // Coordinate smooth factor (high dampening)
              const alphaR = 0.16 // Rotation angle smooth factor (more dampening to suppress jitter)

              if (smoothedLandmarksRef.current.length === landmarks.length) {
                // Interpolate coordinate vectors
                for (let i = 0; i < landmarks.length; i++) {
                  smoothedLandmarks[i] = {
                    ...landmarks[i],
                    x: alphaL * landmarks[i].x + (1 - alphaL) * smoothedLandmarksRef.current[i].x,
                    y: alphaL * landmarks[i].y + (1 - alphaL) * smoothedLandmarksRef.current[i].y,
                    z: alphaL * landmarks[i].z + (1 - alphaL) * smoothedLandmarksRef.current[i].z,
                  }
                }

                // Interpolate rotation angles
                smoothedRotation = {
                  pitch: alphaR * pitch + (1 - alphaR) * smoothedRotationRef.current.pitch,
                  yaw: alphaR * yaw + (1 - alphaR) * smoothedRotationRef.current.yaw,
                  roll: alphaR * roll + (1 - alphaR) * smoothedRotationRef.current.roll,
                }
              }

              // Save smoothed parameters to history refs
              smoothedLandmarksRef.current = smoothedLandmarks
              smoothedRotationRef.current = smoothedRotation

              faceDataResult = {
                detected: true,
                landmarks: smoothedLandmarks, // Use smoothed landmarks
                rotation: smoothedRotation,   // Use smoothed rotation angles
                confidence:
                  results.faceBlendshapes && results.faceBlendshapes.length > 0 ? 0.92 : 0.85,
              }
            } else {
              // Reset caches if face target is lost to avoid coordinate jumping on target acquisition
              smoothedLandmarksRef.current = []
            }
          } catch (err) {
            console.error('MediaPipe landmarker detection error:', err)
          }
        }

        interface HandResult {
          landmarks: import('@mediapipe/tasks-vision').NormalizedLandmark[]
          handedness: 'Left' | 'Right'
          gesture: string
        }
        const handDataResult: HandResult[] = []

        if (handLandmarker && handTrackingEnabled) {
          const timestamp = performance.now()
          try {
            const results = handLandmarker.detectForVideo(activeVideo, timestamp)
            if (results && results.landmarks && results.landmarks.length > 0) {
              let leftDetected = false
              let rightDetected = false

              for (let hIdx = 0; hIdx < results.landmarks.length; hIdx++) {
                const rawLandmarks = results.landmarks[hIdx]
                const handednessInfo = results.handedness[hIdx]?.[0]
                const handednessLabel = (handednessInfo?.displayName === 'Right' ? 'Left' : 'Right') as 'Left' | 'Right'

                if (handednessLabel === 'Left') leftDetected = true
                else rightDetected = true

                // EMA Hand Smoothing
                const targetRef = handednessLabel === 'Left' ? smoothedLeftHandRef : smoothedRightHandRef
                const smoothedHand = [...rawLandmarks]
                const alphaH = 0.24

                if (targetRef.current.length === rawLandmarks.length) {
                  for (let i = 0; i < rawLandmarks.length; i++) {
                    smoothedHand[i] = {
                      ...rawLandmarks[i],
                      x: alphaH * rawLandmarks[i].x + (1 - alphaH) * targetRef.current[i].x,
                      y: alphaH * rawLandmarks[i].y + (1 - alphaH) * targetRef.current[i].y,
                      z: alphaH * rawLandmarks[i].z + (1 - alphaH) * targetRef.current[i].z,
                    }
                  }
                }
                targetRef.current = smoothedHand

                // Gestures Classifier
                const isIndexOpen = smoothedHand[8].y < smoothedHand[6].y
                const isMiddleOpen = smoothedHand[12].y < smoothedHand[10].y
                const isRingOpen = smoothedHand[16].y < smoothedHand[14].y
                const isPinkyOpen = smoothedHand[20].y < smoothedHand[18].y
                const isThumbOpen = Math.abs(smoothedHand[4].x - smoothedHand[5].x) > 0.07

                let gesture = 'UNKNOWN'
                if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
                  gesture = 'OPEN HAND'
                } else if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
                  gesture = 'FIST'
                } else if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
                  gesture = 'VICTORY'
                } else if (isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
                  gesture = 'POINT'
                } else if (isIndexOpen && !isMiddleOpen && !isRingOpen && isPinkyOpen) {
                  gesture = 'ROCK ON'
                } else if (isThumbOpen && !isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
                  gesture = 'THUMBS UP'
                }

                handDataResult.push({
                  landmarks: smoothedHand,
                  handedness: handednessLabel,
                  gesture,
                })
              }

              if (!leftDetected) smoothedLeftHandRef.current = []
              if (!rightDetected) smoothedRightHandRef.current = []
            } else {
              smoothedLeftHandRef.current = []
              smoothedRightHandRef.current = []
            }
          } catch (err) {
            console.error('MediaPipe hand tracking error:', err)
          }
        } else {
          smoothedLeftHandRef.current = []
          smoothedRightHandRef.current = []
        }

        interface PoseResult {
          detected: boolean
          landmarks: import('@mediapipe/tasks-vision').NormalizedLandmark[]
        }
        let poseDataResult: PoseResult | null = null

        if (poseLandmarker && poseTrackingEnabled) {
          const timestamp = performance.now()
          try {
            const results = poseLandmarker.detectForVideo(activeVideo, timestamp)
            if (results && results.landmarks && results.landmarks.length > 0) {
              const rawLandmarks = results.landmarks[0]
              const smoothedPose = [...rawLandmarks]
              const alphaP = 0.22

              if (smoothedPoseRef.current.length === rawLandmarks.length) {
                for (let i = 0; i < rawLandmarks.length; i++) {
                  smoothedPose[i] = {
                    ...rawLandmarks[i],
                    x: alphaP * rawLandmarks[i].x + (1 - alphaP) * smoothedPoseRef.current[i].x,
                    y: alphaP * rawLandmarks[i].y + (1 - alphaP) * smoothedPoseRef.current[i].y,
                    z: alphaP * rawLandmarks[i].z + (1 - alphaP) * smoothedPoseRef.current[i].z,
                  }
                }
              }
              smoothedPoseRef.current = smoothedPose
              poseDataResult = {
                detected: true,
                landmarks: smoothedPose,
              }
            } else {
              smoothedPoseRef.current = []
            }
          } catch (err) {
            console.error('MediaPipe pose landmarker error:', err)
          }
        } else {
          smoothedPoseRef.current = []
        }

        // 3D Three.js AR update
        if (threeActiveObject !== 'none' && threeSceneRef.current) {
          const drawW = canvasRef.current?.width || 640
          const drawH = canvasRef.current?.height || 360
          
           let targetX = 0
          let targetY = 0
          let targetRotX = 0
          let targetRotY = 0
          let targetRotZ = 0

          let faceScale = 60

          if (faceDataResult.detected && faceDataResult.landmarks.length > 0) {
            const landmarks = faceDataResult.landmarks
            const leftEye = landmarks[33]
            const rightEye = landmarks[263]
            
            const fcX = ((leftEye.x + rightEye.x) / 2) * drawW - drawW / 2
            const fcY = drawH / 2 - ((leftEye.y + rightEye.y) / 2) * drawH
            
            const dx = rightEye.x - leftEye.x
            const dy = rightEye.y - leftEye.y
            faceScale = Math.sqrt(dx * dx + dy * dy) * drawW

            const headOffset = threeActiveObject === 'glasses' ? 0 : faceScale * 0.72
            targetX = fcX
            targetY = fcY + headOffset

            targetRotX = faceDataResult.rotation.pitch * (Math.PI / 180)
            targetRotY = -faceDataResult.rotation.yaw * (Math.PI / 180)
            targetRotZ = -faceDataResult.rotation.roll * (Math.PI / 180)
          }

          let grabbedByHand = false
          if (handDataResult.length > 0) {
            const hand = handDataResult[0]
            const isFist = hand.gesture === 'FIST'
            
            const hX = hand.landmarks[8].x * drawW - drawW / 2
            const hY = drawH / 2 - hand.landmarks[8].y * drawH

            const distToObj = Math.sqrt((hX - objectPositionRef.current.x) ** 2 + (hY - objectPositionRef.current.y) ** 2)

            if (isFist && distToObj < faceScale * 0.65) {
              isGrabbedRef.current = true
              grabbedByHand = true
              
              objectPositionRef.current.x += 0.3 * (hX - objectPositionRef.current.x)
              objectPositionRef.current.y += 0.3 * (hY - objectPositionRef.current.y)
            }
          }

          if (!grabbedByHand) {
            isGrabbedRef.current = false
            
            if (faceDataResult.detected) {
              objectPositionRef.current.x += 0.25 * (targetX - objectPositionRef.current.x)
              objectPositionRef.current.y += 0.25 * (targetY - objectPositionRef.current.y)
            } else {
              const t = performance.now() * 0.002
              objectPositionRef.current.x += 0.05 * (Math.sin(t) * 15 - objectPositionRef.current.x)
              objectPositionRef.current.y += 0.05 * (Math.cos(t * 1.5) * 10 - objectPositionRef.current.y)
            }
          }

          const activeMesh = haloMeshRef.current || ringMeshRef.current || glassesMeshRef.current
          if (activeMesh && threeCameraRef.current && threeRendererRef.current) {
            activeMesh.position.set(objectPositionRef.current.x, objectPositionRef.current.y, 0)
            
            const scaleFactor = threeActiveObject === 'glasses' ? 0.95 : 1.15
            const curTime = useEditorStore.getState().currentTime
            const animScale = getAnimatedValue(curTime, 'scale', scale)
            activeMesh.scale.setScalar(((faceScale * scaleFactor) / 32) * animScale)

            if (isGrabbedRef.current) {
              const defaultPitch = threeActiveObject === 'glasses' ? 0 : Math.PI / 2
              activeMesh.rotation.x += 0.18 * (defaultPitch - activeMesh.rotation.x)
              activeMesh.rotation.y += 0.18 * (0 - activeMesh.rotation.y)
              activeMesh.rotation.z += 0.18 * (0 - activeMesh.rotation.z)
            } else {
              const defaultPitch = threeActiveObject === 'glasses' ? 0 : Math.PI / 2
              activeMesh.rotation.x = defaultPitch + targetRotX
              activeMesh.rotation.y = targetRotY
              activeMesh.rotation.z = targetRotZ
            }

            threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current)
          }
        }

        createImageBitmap(activeVideo)
          .then((bitmap) => {
            if (isTerminated) {
              bitmap.close()
              return
            }
            // Transfer bitmap and send calculated face/hand/pose landmarks data
            worker.postMessage(
              {
                type: 'frame',
                imageBitmap: bitmap,
                faceData: faceDataResult,
                handData: handDataResult,
                poseData: poseDataResult,
              },
              [bitmap]
            )

            if (activeVideo.requestVideoFrameCallback) {
              callbackId = activeVideo.requestVideoFrameCallback(sendFrame)
            } else {
              callbackId = requestAnimationFrame(sendFrame)
            }
          })
          .catch(() => {
            callbackId = requestAnimationFrame(sendFrame)
          })
      } else {
        callbackId = requestAnimationFrame(sendFrame)
      }
    }

    if (activeVideo.requestVideoFrameCallback) {
      callbackId = activeVideo.requestVideoFrameCallback(sendFrame)
    } else {
      callbackId = requestAnimationFrame(sendFrame)
    }

    return () => {
      isTerminated = true
      if (activeVideo.cancelVideoFrameCallback) {
        activeVideo.cancelVideoFrameCallback(callbackId)
      } else {
        cancelAnimationFrame(callbackId)
      }
    }
  }, [
    isWebcamActive,
    activeClip,
    stream,
    faceLandmarker,
    handLandmarker,
    poseLandmarker,
    handTrackingEnabled,
    poseTrackingEnabled,
    threeActiveObject,
    getAnimatedValue,
    scale,
    isPlaying,
  ])

  // 7. Bind webcam streams
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch((err) => {
        console.warn('Failed to auto-play webcam stream:', err)
      })
    }
  }, [stream])

  // 8. Fullscreen controller
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true)
        })
        .catch((err) => {
          toast.error(`Fullscreen failed: ${err.message}`)
        })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
      })
    }
  }

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const getAspectClass = () => {
    if (isFullscreen) return 'w-full h-full object-contain max-w-none max-h-none'

    switch (aspectRatio) {
      case '9-16':
        return 'aspect-[9/16] h-[480px] max-w-[270px]'
      case '1-1':
        return 'aspect-square h-[420px] max-w-[420px]'
      default:
        return 'aspect-video w-full max-w-[840px] max-h-[472px]'
    }
  }

  const handleToggleWebcam = () => {
    if (isWebcamActive) {
      stopWebcam()
      toast.success('Live camera preview stopped')
    } else {
      startWebcam()
    }
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col p-6 overflow-hidden select-none transition-all ${
        isFullscreen ? 'bg-zinc-950 p-0' : 'bg-zinc-50 border-r border-slate-100'
      }`}
    >
      {/* Action Header Bar */}
      {!isFullscreen && (
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="h-4 w-4 text-zinc-700" /> Preview Canvas
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {isWebcamActive && webcamDevices.length > 0 && (
              <Select value={selectedDeviceId} onValueChange={(val) => { if (val) switchDevice(val) }}>
                <SelectTrigger className="h-7 w-36 text-xs bg-white border-zinc-200">
                  <SelectValue placeholder="Select Camera" />
                </SelectTrigger>
                <SelectContent>
                  {webcamDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 4)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isWebcamActive && (
              <Select
                value={selectedResolution}
                onValueChange={(val) => { if (val) switchResolution(val as ResolutionProfile) }}
              >
                <SelectTrigger className="h-7 w-20 text-xs bg-white border-zinc-200">
                  <SelectValue placeholder="Res" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="360p">360p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="4K">4K</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleWebcam}
              className={`h-7 gap-1.5 border-zinc-200/80 hover:bg-zinc-100 text-zinc-700 text-xs font-medium rounded-md ${
                isWebcamActive
                  ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700'
                  : ''
              }`}
            >
              {isWebcamActive ? (
                <>
                  <CameraOff className="h-3.5 w-3.5" /> Stop Camera
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" /> Use Live Camera
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={isRecording ? stopRecording : startRecording}
              className={`h-7 gap-1.5 border-zinc-200/80 hover:bg-zinc-100 text-zinc-700 text-xs font-medium rounded-md ${
                isRecording
                  ? 'bg-red-50 border-red-200 hover:bg-red-100 text-red-600 font-bold'
                  : ''
              }`}
            >
              <span className={`h-2 w-2 rounded-full bg-red-500 ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording ? 'Stop Recording' : 'Record Preview'}
            </Button>

            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 rounded-md border-zinc-200/80 text-zinc-700 bg-white"
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}

      {/* Main Preview canvas viewport */}
      <div
        className={`flex-grow flex items-center justify-center overflow-hidden relative group transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full bg-black rounded-none border-none'
            : 'bg-zinc-950 rounded-xl shadow-inner border border-zinc-200/20'
        }`}
      >
        {/* Floating Recording HUD overlay */}
        {isRecording && (
          <div className="absolute top-4 left-4 z-40 bg-zinc-950/85 backdrop-blur-md border border-zinc-800 text-white rounded-full px-3 py-1.5 flex items-center gap-3 text-[10px] font-medium shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full bg-red-500 ${isRecordingPaused ? '' : 'animate-pulse'}`} />
              <span className="font-bold tracking-wide uppercase text-[9px] text-zinc-400">
                {isRecordingPaused ? 'PAUSED' : 'REC'}
              </span>
            </div>
            <div className="h-3.5 w-px bg-zinc-800" />
            <span className="font-mono font-bold text-red-400 text-xs">
              {(() => {
                const m = Math.floor(recordingDuration / 60)
                const s = Math.floor(recordingDuration % 60)
                return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
              })()}
            </span>
            <div className="h-3.5 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              {isRecordingPaused ? (
                <button
                  onClick={resumeRecording}
                  className="text-zinc-300 hover:text-cyan-400 p-0.5 transition-colors cursor-pointer"
                  title="Resume Recording"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="text-zinc-300 hover:text-cyan-400 p-0.5 transition-colors cursor-pointer"
                  title="Pause Recording"
                >
                  <Pause className="h-3.5 w-3.5 fill-current" />
                </button>
              )}
              <button
                onClick={stopRecording}
                className="text-red-500 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                title="Stop & Save"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            </div>
          </div>
        )}
        {/* Hidden video tags serving as frame decoders */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
        />

        {activeClip && (
          <video
            ref={previewVideoRef}
            src={activeClip.content}
            loop
            playsInline
            muted={muted}
            style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
          />
        )}

        {/* GPU accelerated canvas */}
        {!webcamError && (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`relative overflow-hidden bg-zinc-900 shadow-2xl transition-all duration-300 ${getAspectClass()}`}
            />
            {threeActiveObject !== 'none' && (
              <canvas
                ref={threeCanvasRef}
                className="absolute inset-0 pointer-events-none z-20"
              />
            )}
          </div>
        )}

        {/* Glassmorphic loading spinner */}
        {(isWebcamLoading || isModelLoading) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">
                {isModelLoading ? 'Initializing Face Landmarker' : 'Configuring Camera Stream'}
              </p>
              <p className="text-[10px] text-zinc-400 font-medium">
                {isModelLoading
                  ? 'Downloading MediaPipe assets locally...'
                  : `Setting constraints: ${selectedResolution} profile...`}
              </p>
            </div>
          </div>
        )}

        {/* Camera error boundaries */}
        {webcamError && (
          <div className="absolute inset-4 rounded-lg bg-red-950/20 border border-red-500/30 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h4 className="text-sm font-semibold text-red-200 mb-1">Hardware Access Blocked</h4>
            <p className="text-xs text-red-300/80 max-w-sm mb-4 leading-normal">
              {webcamError}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => startWebcam()}
                className="h-8 text-xs bg-red-600 hover:bg-red-500 text-white"
              >
                Try Again
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={stopWebcam}
                className="h-8 text-xs border-zinc-700/60 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
              >
                Reset to Simulator
              </Button>
            </div>
          </div>
        )}

        {/* Fullscreen control overlay */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 z-20">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/60 hover:bg-black/85 text-white border-none rounded-md shadow backdrop-blur-xs"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Floating AI Command Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4">
          <form
            onSubmit={handleAiSubmit}
            className="flex items-center gap-2 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-full py-1.5 pl-3.5 pr-1.5 shadow-2xl text-xs text-white"
          >
            <Sparkles className={`h-4 w-4 text-indigo-400 ${isAiLoading ? 'animate-spin' : 'animate-pulse'}`} />
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder='Try: "Add blue neon around my face"...'
              className="flex-grow bg-transparent outline-none text-[11px] text-zinc-100 placeholder-zinc-500"
              disabled={isAiLoading}
            />
            <Button
              type="submit"
              disabled={isAiLoading || !aiInput.trim()}
              className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-[10px] font-semibold flex items-center gap-1"
            >
              {isAiLoading ? 'AI...' : 'Apply'}
            </Button>
          </form>
        </div>
      </div>

      {/* Dialog popup for recorded video downloader preview */}
      <Dialog open={showDownloadModal} onOpenChange={setShowDownloadModal}>
        <DialogContent className="sm:max-w-md bg-white border border-zinc-200 shadow-2xl p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-zinc-900 tracking-wide">
              Preview & Save Recording
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            {recordedVideoUrl && (
              <video
                src={recordedVideoUrl}
                controls
                autoPlay
                className="w-full aspect-video rounded-lg border border-zinc-200/50 bg-zinc-950 object-contain shadow-sm"
              />
            )}
            <div className="rounded-lg bg-zinc-50 border border-zinc-200/50 p-2.5 text-[10px] text-zinc-500 leading-relaxed">
              <span className="font-semibold text-zinc-800 block mb-0.5">Recording Details</span>
              MIME container: <span className="font-mono text-zinc-700">video/webm</span>. Select output format below. WebM offers high compression; MP4 is widely compatible.
            </div>
            <div className="flex items-center justify-end gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                onClick={() => downloadRecording('webm')}
              >
                Save as WebM
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-zinc-950 hover:bg-zinc-900 text-white"
                onClick={() => downloadRecording('mp4')}
              >
                Save as MP4
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
