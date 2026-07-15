import { create } from 'zustand'
import {
  AspectRatio,
  FilterType,
  OverlayType,
  MediaItem,
  TimelineTrack,
} from '@/types'

export interface EditorState {
  // Camera Adjustments
  brightness: number
  contrast: number
  saturation: number
  blur: number
  rotation: number
  scale: number
  aspectRatio: AspectRatio
  filter: FilterType
  overlay: OverlayType

  // Playback Control
  isPlaying: boolean
  currentTime: number
  duration: number
  zoomLevel: number

  // Workspace Layout
  sidebarTab: 'media' | 'effects' | 'overlays' | 'settings'
  rightPanelOpen: boolean
  timelineOpen: boolean

  // Timeline & Media Data
  mediaLibrary: MediaItem[]
  tracks: TimelineTrack[]
  selectedClipId: string | null

  // Face Mesh Settings
  faceMeshEnabled: boolean
  faceMeshMode: 'wireframe' | 'points' | 'outline' | 'all'
  faceMeshModeLevel: 'performance' | 'quality'

  // Hand Tracking Settings
  handTrackingEnabled: boolean

  // Pose Tracking Settings
  poseTrackingEnabled: boolean

  // Three.js 3D Objects Settings
  threeActiveObject: 'halo' | 'ring' | 'glasses' | 'none'

  // VFX Effect Engine Settings
  selectedVfx: 'glow' | 'neon' | 'outline' | 'blur' | 'particles' | 'fire' | 'smoke' | 'lightning' | 'rain' | 'snow' | 'none'
  vfxOpacity: number
  vfxColor: string
  vfxStrength: number
  vfxSpeed: number
  vfxRadius: number

  // AI Command settings
  geminiApiKey: string
  groqApiKey: string
  aiProvider: 'gemini' | 'groq'

  // Actions
  setBrightness: (val: number) => void
  setContrast: (val: number) => void
  setSaturation: (val: number) => void
  setBlur: (val: number) => void
  setRotation: (val: number) => void
  setScale: (val: number) => void
  setAspectRatio: (val: AspectRatio) => void
  setFilter: (val: FilterType) => void
  setOverlay: (val: OverlayType) => void
  setIsPlaying: (val: boolean) => void
  setCurrentTime: (val: number | ((prev: number) => number)) => void
  setDuration: (val: number) => void
  setZoomLevel: (val: number) => void
  setSidebarTab: (val: 'media' | 'effects' | 'overlays' | 'settings') => void
  setRightPanelOpen: (val: boolean) => void
  setTimelineOpen: (val: boolean) => void
  setSelectedClipId: (val: string | null) => void
  setFaceMeshEnabled: (val: boolean) => void
  setFaceMeshMode: (val: 'wireframe' | 'points' | 'outline' | 'all') => void
  setFaceMeshModeLevel: (val: 'performance' | 'quality') => void
  setHandTrackingEnabled: (val: boolean) => void
  setPoseTrackingEnabled: (val: boolean) => void
  setThreeActiveObject: (val: 'halo' | 'ring' | 'glasses' | 'none') => void
  setSelectedVfx: (val: 'glow' | 'neon' | 'outline' | 'blur' | 'particles' | 'fire' | 'smoke' | 'lightning' | 'rain' | 'snow' | 'none') => void
  setVfxOpacity: (val: number) => void
  setVfxColor: (val: string) => void
  setVfxStrength: (val: number) => void
  setVfxSpeed: (val: number) => void
  setVfxRadius: (val: number) => void
  updateClipPosition: (clipId: string, start: number, duration?: number) => void
  updateClipContent: (clipId: string, content: string) => void
  deleteClip: (clipId: string) => void
  duplicateClip: (clipId: string) => void
  resizeClip: (clipId: string, duration: number) => void
  addKeyframe: (clipId: string, time: number, value: number, property: 'opacity' | 'scale' | 'rotation' | 'volume') => void
  removeKeyframe: (clipId: string, keyframeId: string) => void
  setGeminiApiKey: (val: string) => void
  setGroqApiKey: (val: string) => void
  setAiProvider: (val: 'gemini' | 'groq') => void
  applyAiStateChange: (updates: Partial<Omit<EditorState, 'tracks' | 'mediaLibrary'>>) => void
  addMediaItem: (item: MediaItem) => void
  resetAdjustments: () => void
}

const INITIAL_MEDIA_LIBRARY: MediaItem[] = [
  {
    id: 'm1',
    name: 'Nature Sunrise.mp4',
    type: 'video',
    duration: 15,
    thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&auto=format&fit=crop&q=60',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
  },
  {
    id: 'm2',
    name: 'Cyberpunk City.mp4',
    type: 'video',
    duration: 20,
    thumbnail: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?w=200&auto=format&fit=crop&q=60',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-neon-light-from-a-building-in-a-japanese-city-43641-large.mp4',
  },
  {
    id: 'm3',
    name: 'Studio Portrait.mp4',
    type: 'video',
    duration: 12,
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-posing-in-a-neon-lit-studio-41793-large.mp4',
  },
  {
    id: 'm4',
    name: 'Ocean Waves.mp4',
    type: 'video',
    duration: 18,
    thumbnail: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&auto=format&fit=crop&q=60',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-crashing-on-rocks-from-above-4916-large.mp4',
  },
]

const INITIAL_TRACKS: TimelineTrack[] = [
  {
    id: 't-video',
    name: 'Video Track',
    type: 'video',
    clips: [
      {
        id: 'c-v1',
        trackId: 't-video',
        name: 'Nature Sunrise.mp4',
        type: 'video',
        start: 4,
        duration: 22,
        color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-700',
        content: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
      },
      {
        id: 'c-v2',
        trackId: 't-video',
        name: 'Cyberpunk City.mp4',
        type: 'video',
        start: 32,
        duration: 28,
        color: 'bg-purple-500/10 border-purple-500/30 text-purple-700',
        content: 'https://assets.mixkit.co/videos/preview/mixkit-neon-light-from-a-building-in-a-japanese-city-43641-large.mp4',
      },
      {
        id: 'c-v3',
        trackId: 't-video',
        name: 'Studio Portrait.mp4',
        type: 'video',
        start: 70,
        duration: 15,
        color: 'bg-pink-500/10 border-pink-500/30 text-pink-700',
        content: 'https://assets.mixkit.co/videos/preview/mixkit-woman-posing-in-a-neon-lit-studio-41793-large.mp4',
      },
    ],
  },
  {
    id: 't-audio',
    name: 'Audio Track',
    type: 'audio',
    clips: [
      {
        id: 'c-a1',
        trackId: 't-audio',
        name: 'Synthwave Background.mp3',
        type: 'audio',
        start: 0,
        duration: 55,
        color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
      },
      {
        id: 'c-a2',
        trackId: 't-audio',
        name: 'Lofi Chill Beat.mp3',
        type: 'audio',
        start: 60,
        duration: 40,
        color: 'bg-teal-500/10 border-teal-500/30 text-teal-700',
      },
    ],
  },
  {
    id: 't-text',
    name: 'Overlay Track',
    type: 'text',
    clips: [
      {
        id: 'c-t1',
        trackId: 't-text',
        name: 'Title Card: Morning Glow',
        type: 'text',
        start: 8,
        duration: 10,
        color: 'bg-amber-500/10 border-amber-500/30 text-amber-700',
        content: 'Morning Glow',
      },
      {
        id: 'c-t2',
        trackId: 't-text',
        name: 'Caption: Neon Pulse',
        type: 'text',
        start: 36,
        duration: 12,
        color: 'bg-sky-500/10 border-sky-500/30 text-sky-700',
        content: 'Neon Pulse',
      },
    ],
  },
]

export const useEditorStore = create<EditorState>((set) => ({
  // Default values
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  rotation: 0,
  scale: 1,
  aspectRatio: '16-9',
  filter: 'none',
  overlay: 'none',

  isPlaying: false,
  currentTime: 0,
  duration: 120,
  zoomLevel: 1.5,

  sidebarTab: 'media',
  rightPanelOpen: true,
  timelineOpen: true,

  mediaLibrary: INITIAL_MEDIA_LIBRARY,
  tracks: INITIAL_TRACKS,
  selectedClipId: null,

  faceMeshEnabled: true,
  faceMeshMode: 'wireframe',
  faceMeshModeLevel: 'performance',
  handTrackingEnabled: true,
  poseTrackingEnabled: true,
  threeActiveObject: 'halo',

  selectedVfx: 'none',
  vfxOpacity: 80,
  vfxColor: '#00f2fe',
  vfxStrength: 50,
  vfxSpeed: 50,
  vfxRadius: 40,

  geminiApiKey: typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '') : (process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''),
  groqApiKey: typeof window !== 'undefined' ? (localStorage.getItem('groq_api_key') || process.env.NEXT_PUBLIC_GROQ_API_KEY || '') : (process.env.NEXT_PUBLIC_GROQ_API_KEY || ''),
  aiProvider: typeof window !== 'undefined' ? ((localStorage.getItem('ai_provider') as 'gemini' | 'groq') || 'gemini') : 'gemini',

  // Setters
  setBrightness: (val) => set({ brightness: val }),
  setContrast: (val) => set({ contrast: val }),
  setSaturation: (val) => set({ saturation: val }),
  setBlur: (val) => set({ blur: val }),
  setRotation: (val) => set({ rotation: val }),
  setScale: (val) => set({ scale: val }),
  setAspectRatio: (val) => set({ aspectRatio: val }),
  setFilter: (val) => set({ filter: val }),
  setOverlay: (val) => set({ overlay: val }),
  setIsPlaying: (val) => set({ isPlaying: val }),
  setCurrentTime: (val) =>
    set((state) => ({
      currentTime: typeof val === 'function' ? val(state.currentTime) : val,
    })),
  setDuration: (val) => set({ duration: val }),
  setZoomLevel: (val) => set({ zoomLevel: val }),
  setSidebarTab: (val) => set({ sidebarTab: val }),
  setRightPanelOpen: (val) => set({ rightPanelOpen: val }),
  setTimelineOpen: (val) => set({ timelineOpen: val }),
  setSelectedClipId: (val) => set({ selectedClipId: val }),
  setFaceMeshEnabled: (val) => set({ faceMeshEnabled: val }),
  setFaceMeshMode: (val) => set({ faceMeshMode: val }),
  setFaceMeshModeLevel: (val) => set({ faceMeshModeLevel: val }),
  setHandTrackingEnabled: (val) => set({ handTrackingEnabled: val }),
  setPoseTrackingEnabled: (val) => set({ poseTrackingEnabled: val }),
  setThreeActiveObject: (val) => set({ threeActiveObject: val }),
  setSelectedVfx: (val) => set({ selectedVfx: val }),
  setVfxOpacity: (val) => set({ vfxOpacity: val }),
  setVfxColor: (val) => set({ vfxColor: val }),
  setVfxStrength: (val) => set({ vfxStrength: val }),
  setVfxSpeed: (val) => set({ vfxSpeed: val }),
  setVfxRadius: (val) => set({ vfxRadius: val }),

  updateClipPosition: (clipId, start, duration) =>
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            return {
              ...clip,
              start: Math.max(0, start),
              duration: duration !== undefined ? Math.max(0.5, duration) : clip.duration,
            }
          }
          return clip
        }),
      })),
    })),

  updateClipContent: (clipId, content) =>
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            return {
              ...clip,
              content,
            }
          }
          return clip
        }),
      })),
    })),

  deleteClip: (clipId) =>
    set((state) => ({
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.id !== clipId),
      })),
    })),

  duplicateClip: (clipId) =>
    set((state) => {
      let clipToCopy: import('@/types').TimelineClip | null = null
      state.tracks.forEach((t) => {
        const found = t.clips.find((c) => c.id === clipId)
        if (found) clipToCopy = found
      })
      if (!clipToCopy) return { tracks: state.tracks }

      const targetClip = clipToCopy as import('@/types').TimelineClip
      const newClip = {
        ...targetClip,
        id: `c_${Math.random().toString(36).substr(2, 9)}`,
        start: targetClip.start + targetClip.duration,
      }

      return {
        tracks: state.tracks.map((t) => {
          if (t.id === targetClip.trackId) {
            return { ...t, clips: [...t.clips, newClip] }
          }
          return t
        }),
      }
    }),

  resizeClip: (clipId, duration) =>
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            return {
              ...clip,
              duration: Math.max(0.5, duration),
            }
          }
          return clip
        }),
      })),
    })),

  addKeyframe: (clipId, time, value, property) =>
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            const keyframes = clip.keyframes || []
            const newKf = {
              id: `kf_${Math.random().toString(36).substr(2, 9)}`,
              time: Math.max(0, Math.min(clip.duration, time)),
              value,
              property,
            }
            return {
              ...clip,
              keyframes: [...keyframes.filter((k) => !(k.time === time && k.property === property)), newKf].sort((a, b) => a.time - b.time),
            }
          }
          return clip
        }),
      })),
    })),

  removeKeyframe: (clipId, keyframeId) =>
    set((state) => ({
      tracks: state.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          if (clip.id === clipId) {
            return {
              ...clip,
              keyframes: (clip.keyframes || []).filter((kf) => kf.id !== keyframeId),
            }
          }
          return clip
        }),
      })),
    })),

  addMediaItem: (item) =>
    set((state) => ({
      mediaLibrary: [...state.mediaLibrary, item],
    })),

  setGeminiApiKey: (val) => {
    if (typeof window !== 'undefined') localStorage.setItem('gemini_api_key', val)
    set({ geminiApiKey: val })
  },
  setGroqApiKey: (val) => {
    if (typeof window !== 'undefined') localStorage.setItem('groq_api_key', val)
    set({ groqApiKey: val })
  },
  setAiProvider: (val) => {
    if (typeof window !== 'undefined') localStorage.setItem('ai_provider', val)
    set({ aiProvider: val })
  },
  applyAiStateChange: (updates) => {
    set((state) => ({
      ...state,
      ...updates,
    }))
  },

  resetAdjustments: () =>
    set({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      rotation: 0,
      scale: 1,
      filter: 'none',
      overlay: 'none',
    }),
}))
