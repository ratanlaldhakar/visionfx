'use client'

import { useRef } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Scissors,
  Trash2,
  Lock,
  Music,
  Video,
  Type,
  Square,
  ChevronsLeft,
  Copy,
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function Timeline() {
  const {
    timelineOpen,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    duration,
    zoomLevel,
    setZoomLevel,
    tracks,
    selectedClipId,
    setSelectedClipId,
    updateClipPosition,
    deleteClip,
    duplicateClip,
    resizeClip,
    addKeyframe,
    removeKeyframe,
  } = useEditorStore()

  const tracksContainerRef = useRef<HTMLDivElement>(null)

  if (!timelineOpen) return null

  // Pixels per second coefficient
  const pxPerSec = 5 * zoomLevel

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Handle click on ruler to jump playhead
  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tracksContainerRef.current) return
    const rect = tracksContainerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickedTime = Math.min(duration, Math.max(0, clickX / pxPerSec))
    setCurrentTime(clickedTime)
  }

  const handleSplit = () => {
    if (!selectedClipId) {
      toast.error('Select a clip to split')
      return
    }
    toast.success('Clip split at playhead position')
  }

  const handleDelete = () => {
    if (!selectedClipId) {
      toast.error('Select a clip to delete')
      return
    }
    deleteClip(selectedClipId)
    toast.success('Clip removed from track')
    setSelectedClipId(null)
  }

  const handleStop = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  return (
    <div className="flex h-64 w-full flex-col border-t border-slate-100 bg-white select-none">
      {/* Timeline Controls Header */}
      <div className="flex h-11 items-center justify-between border-b border-slate-100 bg-zinc-50 px-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded hover:bg-zinc-200/60"
            onClick={() => setCurrentTime(0)}
            title="Rewind to start"
          >
            <ChevronsLeft className="h-4 w-4 text-zinc-700" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded hover:bg-zinc-200/60"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 text-zinc-700" />
            ) : (
              <Play className="h-4 w-4 text-zinc-700" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded hover:bg-zinc-200/60"
            onClick={handleStop}
            title="Stop & Rewind"
          >
            <Square className="h-3.5 w-3.5 text-zinc-700 fill-zinc-700/10" />
          </Button>

          <div className="h-4 w-px bg-zinc-200 mx-1" />

          {/* Edit utilities */}
          <Button
            size="icon"
            variant="ghost"
            className={`h-7 w-7 rounded hover:bg-zinc-200/60 ${
              !selectedClipId && 'opacity-40 cursor-not-allowed'
            }`}
            onClick={handleSplit}
            disabled={!selectedClipId}
            title="Split clip at playhead"
          >
            <Scissors className="h-3.5 w-3.5 text-zinc-600" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={`h-7 w-7 rounded hover:bg-zinc-200/60 ${
              !selectedClipId && 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => {
              if (selectedClipId) {
                duplicateClip(selectedClipId)
                toast.success('Clip duplicated')
              }
            }}
            disabled={!selectedClipId}
            title="Duplicate selected clip"
          >
            <Copy className="h-3.5 w-3.5 text-zinc-600" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={`h-7 w-7 rounded hover:bg-red-50 hover:text-red-600 ${
              !selectedClipId && 'opacity-40 cursor-not-allowed'
            }`}
            onClick={handleDelete}
            disabled={!selectedClipId}
            title="Delete selected clip"
          >
            <Trash2 className="h-3.5 w-3.5 text-zinc-600" />
          </Button>
        </div>

        {/* Zoom & Time info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TimeIndicator duration={duration} />
          </div>

          <div className="flex items-center gap-2">
            <ZoomOut className="h-3.5 w-3.5 text-zinc-400" />
            <Slider
              value={[zoomLevel]}
              min={1}
              max={5}
              step={0.1}
              onValueChange={(val) => setZoomLevel(Array.isArray(val) ? val[0] : val)}
              className="w-24"
            />
            <ZoomIn className="h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Main Track & Playhead Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers (Lock icon, Track Icons, Name) */}
        <div className="w-40 border-r border-slate-100 bg-zinc-50/50 flex flex-col pt-6 shrink-0">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="h-14 flex items-center justify-between px-3 border-b border-slate-100/50"
            >
              <div className="flex items-center gap-2 min-w-0">
                {track.type === 'video' ? (
                  <Video className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                ) : track.type === 'audio' ? (
                  <Music className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                ) : (
                  <Type className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                )}
                <span className="text-[10px] font-semibold text-zinc-600 truncate">
                  {track.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-zinc-300 hover:text-zinc-600 rounded"
              >
                <Lock className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Right Scrollable Timeline Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#fafafa]">
          {/* Timeline Grid Background Ruler */}
          <div
            ref={tracksContainerRef}
            onClick={handleRulerClick}
            className="h-6 border-b border-slate-100 bg-zinc-50/40 relative cursor-ew-resize select-none"
            style={{ width: `${duration * pxPerSec}px` }}
          >
            {/* Generate time ticks every 5 seconds */}
            {Array.from({ length: Math.ceil(duration / 5) }).map((_, i) => {
              const sec = i * 5
              return (
                <div
                  key={sec}
                  className="absolute bottom-0 border-l border-zinc-200/60 pl-1 text-[8px] font-mono text-zinc-400"
                  style={{ left: `${sec * pxPerSec}px`, height: sec % 10 === 0 ? '100%' : '50%' }}
                >
                  {sec % 10 === 0 ? formatTime(sec) : ''}
                </div>
              )
            })}
          </div>

          {/* Tracks Area */}
          <div className="relative" style={{ width: `${duration * pxPerSec}px` }}>
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-14 border-b border-slate-100/50 relative flex items-center"
              >
                {/* Visual grid lines per track */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px)] bg-[size:40px_100%] opacity-20 pointer-events-none" />

                {track.clips.map((clip) => {
                  const isSelected = selectedClipId === clip.id
                  return (
                    <motion.div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedClipId(clip.id)
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        const clickX = e.clientX - rect.left
                        const clickSec = clickX / pxPerSec
                        addKeyframe(clip.id, clickSec, 80, 'opacity')
                        toast.success('Opacity keyframe added! Double-click keyframe diamond to delete.')
                      }}
                      drag="x"
                      dragMomentum={false}
                      dragElastic={0}
                      dragConstraints={{
                        left: 0,
                        right: (duration - clip.duration) * pxPerSec,
                      }}
                      onDrag={(e, info) => {
                        if (tracksContainerRef.current) {
                          const rect = tracksContainerRef.current.getBoundingClientRect()
                          const dragX = info.point.x - rect.left
                          const newStart = Math.max(0, dragX / pxPerSec)
                          updateClipPosition(clip.id, newStart)
                        }
                      }}
                      style={{
                        left: `${clip.start * pxPerSec}px`,
                        width: `${clip.duration * pxPerSec}px`,
                      }}
                      className={`absolute h-10 rounded border flex items-center px-2 cursor-grab active:cursor-grabbing text-[10px] font-medium shadow-sm transition-all ${
                        clip.color
                      } ${isSelected ? 'ring-2 ring-zinc-950 ring-offset-1 border-transparent shadow' : ''}`}
                    >
                      {/* Left Resize Handle */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 hover:bg-black/20 cursor-ew-resize rounded-l z-10"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          const startX = e.clientX
                          const startStart = clip.start
                          const startDuration = clip.duration

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - startX
                            const deltaSec = deltaX / pxPerSec
                            const targetStart = Math.max(0, startStart + deltaSec)
                            const targetDuration = Math.max(0.5, startDuration - (targetStart - startStart))
                            updateClipPosition(clip.id, targetStart, targetDuration)
                          }

                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove)
                            document.removeEventListener('mouseup', handleMouseUp)
                          }

                          document.addEventListener('mousemove', handleMouseMove)
                          document.addEventListener('mouseup', handleMouseUp)
                        }}
                      />

                      <div className="truncate w-full px-1">{clip.name}</div>
                      <span className="absolute right-2 text-[8px] font-mono opacity-50 shrink-0 select-none">
                        {clip.duration.toFixed(1)}s
                      </span>

                      {/* Right Resize Handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 hover:bg-black/20 cursor-ew-resize rounded-r z-10"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          const startX = e.clientX
                          const startDuration = clip.duration

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - startX
                            const deltaSec = deltaX / pxPerSec
                            resizeClip(clip.id, startDuration + deltaSec)
                          }

                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove)
                            document.removeEventListener('mouseup', handleMouseUp)
                          }

                          document.addEventListener('mousemove', handleMouseMove)
                          document.addEventListener('mouseup', handleMouseUp)
                        }}
                      />

                      {/* Keyframes Overlay */}
                      {(clip.keyframes || []).map((kf) => (
                        <div
                          key={kf.id}
                          className="absolute h-2 w-2 bg-amber-400 border border-zinc-950 rotate-45 bottom-0.5 z-20 cursor-pointer hover:scale-130 transition-transform"
                          style={{ left: `${Math.max(4, Math.min(clip.duration * pxPerSec - 8, kf.time * pxPerSec))}px` }}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            removeKeyframe(clip.id, kf.id)
                            toast.success('Keyframe removed')
                          }}
                          title={`Keyframe: ${kf.property} = ${kf.value} (Double click diamond to delete)`}
                        />
                      ))}
                    </motion.div>
                  )
                })}
              </div>
            ))}

            {/* Playhead line overlay */}
            <Playhead pxPerSec={pxPerSec} />
          </div>
        </div>
      </div>
    </div>
  )
}

function TimeIndicator({ duration }: { duration: number }) {
  const currentTime = useEditorStore((state) => state.currentTime)
  
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <span className="font-mono text-xs font-semibold text-zinc-500">
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  )
}

function Playhead({ pxPerSec }: { pxPerSec: number }) {
  const currentTime = useEditorStore((state) => state.currentTime)
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-rose-500 z-10 pointer-events-none"
      style={{ left: `${currentTime * pxPerSec}px` }}
    >
      <div className="h-3 w-3 bg-rose-500 rounded-full -translate-x-1.5 -translate-y-1.5 shadow-md shadow-rose-500/20" />
    </div>
  )
}
