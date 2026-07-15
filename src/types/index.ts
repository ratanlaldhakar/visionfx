export type AspectRatio = '16-9' | '9-16' | '1-1'

export type FilterType =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'vintage'
  | 'noir'
  | 'cyberpunk'
  | 'warm'
  | 'cool'

export type OverlayType = 'none' | 'grid' | 'safe-zone' | 'vhs' | 'cinematic'

export interface MediaItem {
  id: string
  name: string
  type: 'video' | 'image'
  duration: number // in seconds
  thumbnail: string
  url: string
}

export interface Keyframe {
  id: string
  time: number // in seconds, relative to clip start
  value: number // generic animation value (e.g. 0 to 100)
  property: 'opacity' | 'scale' | 'rotation' | 'volume'
}

export interface TimelineClip {
  id: string
  trackId: string
  name: string
  type: 'video' | 'image' | 'audio' | 'text'
  start: number // start time in seconds
  duration: number // duration in seconds
  color: string // CSS background color or tailwind class
  content?: string // Text for text clips, src for image/video
  keyframes?: Keyframe[]
}

export interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio' | 'text'
  clips: TimelineClip[]
}
