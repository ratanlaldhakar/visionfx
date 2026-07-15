'use client'

import { useEditorStore } from '@/store/useEditorStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen,
  Sparkles,
  Grid3X3,
  Sliders,
  Plus,
  Video,
  Image as ImageIcon,
  Check,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterType, OverlayType } from '@/types'
import { toast } from 'sonner'

export function Sidebar() {
  const {
    sidebarTab,
    setSidebarTab,
    mediaLibrary,
    filter,
    setFilter,
    overlay,
    setOverlay,
    tracks,
    addMediaItem,
    geminiApiKey,
    setGeminiApiKey,
    groqApiKey,
    setGroqApiKey,
    aiProvider,
    setAiProvider,
  } = useEditorStore()

  // Tab configurations
  const tabs = [
    { id: 'media', icon: FolderOpen, label: 'Media' },
    { id: 'effects', icon: Sparkles, label: 'Filters' },
    { id: 'overlays', icon: Grid3X3, label: 'Overlays' },
    { id: 'settings', icon: Sliders, label: 'Settings' },
  ] as const

  // Filters configurations with visual description
  const filters: { id: FilterType; label: string; color: string; desc: string }[] = [
    { id: 'none', label: 'Original', color: 'bg-zinc-100', desc: 'No color alterations' },
    { id: 'grayscale', label: 'Mono', color: 'bg-zinc-200 grayscale', desc: 'High contrast black & white' },
    { id: 'sepia', label: 'Retro Sepia', color: 'bg-amber-100 sepia', desc: 'Warm nostalgic tones' },
    { id: 'vintage', label: 'Vintage Gold', color: 'bg-amber-200 saturate-150 contrast-125 hue-rotate-15', desc: 'Faded film aesthetic' },
    { id: 'noir', label: 'Classic Noir', color: 'bg-zinc-800 contrast-150 brightness-75 grayscale', desc: 'Deep shadows, dramatic whites' },
    { id: 'cyberpunk', label: 'Neon Cyber', color: 'bg-purple-950 hue-rotate-90 saturate-200 contrast-125', desc: 'Vibrant purples and cyans' },
    { id: 'warm', label: 'Golden Hour', color: 'bg-orange-100 saturate-125 sepia-[0.1]', desc: 'Warm sun-drenched lighting' },
    { id: 'cool', label: 'Nordic Cool', color: 'bg-sky-100 saturate-110 hue-rotate-15', desc: 'Cool blue undertones' },
  ]

  // Overlays configurations
  const overlays: { id: OverlayType; label: string; desc: string }[] = [
    { id: 'none', label: 'Clean Feed', desc: 'Hide all UI guides and decorations' },
    { id: 'grid', label: 'Rule of Thirds Grid', desc: 'Align your subject using 3x3 layout lines' },
    { id: 'safe-zone', label: 'Safe Action Zone', desc: 'Render 90% and 80% boundary guidelines' },
    { id: 'vhs', label: 'VHS Tape Artifacts', desc: 'Add scanlines, timestamps, and tracking noise' },
    { id: 'cinematic', label: 'Letterbox Borders', desc: 'Add 2.39:1 movie bar letterboxes' },
  ]

  const handleSimulateUpload = () => {
    const names = [
      'Glitch Effect.mp4',
      'Urban Timelapse.mp4',
      'Forest Stream.mp4',
      'Desert Dunes.mp4',
      'Macro Flower.mp4',
    ]
    const randomName = names[Math.floor(Math.random() * names.length)]
    const randomDuration = Math.floor(Math.random() * 15) + 5
    const images = [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=60',
    ]
    const randomThumb = images[Math.floor(Math.random() * images.length)]

    addMediaItem({
      id: 'm-' + Date.now(),
      name: randomName,
      type: 'video',
      duration: randomDuration,
      thumbnail: randomThumb,
      url: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
    })

    toast.success(`${randomName} imported!`, {
      description: `Added to library (${randomDuration}s duration).`,
    })
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] select-none bg-white">
      {/* Icon-only narrow bar */}
      <div className="flex w-[3.5rem] flex-col items-center justify-between border-r border-slate-100 bg-white py-3">
        <div className="flex flex-col gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = sidebarTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-zinc-950 text-white shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-800'
                }`}
                title={tab.label}
              >
                <Icon className="h-4.5 w-4.5" />
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute -left-[1px] top-[25%] h-5 w-[3px] rounded-r bg-zinc-900"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
        <div className="text-[10px] font-bold text-zinc-300">V1.0</div>
      </div>

      {/* Expanded sub-panel */}
      <div className="w-64 border-r border-slate-100 bg-zinc-50/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={sidebarTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="flex h-full flex-col p-4"
          >
            {/* Media Panel */}
            {sidebarTab === 'media' && (
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
                    Project Assets
                  </h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSimulateUpload}
                    className="h-6 w-6 rounded-md hover:bg-zinc-100"
                    title="Import mock asset"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {mediaLibrary.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex items-center gap-3 rounded-lg border border-zinc-200/60 bg-white p-2 shadow-sm transition-all hover:border-zinc-300"
                    >
                      <div className="relative h-10 w-16 overflow-hidden rounded bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-zinc-900/80 px-1 text-[8px] font-semibold text-white">
                          {item.duration}s
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-zinc-700">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-zinc-400 capitalize flex items-center gap-1">
                          {item.type === 'video' ? (
                            <Video className="h-2.5 w-2.5" />
                          ) : (
                            <ImageIcon className="h-2.5 w-2.5" />
                          )}
                          {item.type}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          toast.success('Clip added to play queue', {
                            description: `Previewing ${item.name} inside simulated loop.`,
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-950/20 transition-opacity"
                      >
                        <span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold shadow-sm hover:scale-105 transition-transform">
                          Preview
                        </span>
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleSimulateUpload}
                    className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 p-4 text-center hover:bg-zinc-100/50"
                  >
                    <Upload className="h-4 w-4 text-zinc-400" />
                    <span className="text-[10px] font-semibold text-zinc-500">
                      Import Media File
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Filters Panel */}
            {sidebarTab === 'effects' && (
              <div className="flex h-full flex-col gap-4">
                <div>
                  <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
                    Camera Filters
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Select a look to color grade the camera preview feed.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filters.map((f) => {
                    const isSelected = filter === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`flex w-full items-start gap-3 rounded-lg border p-2 text-left transition-all ${
                          isSelected
                            ? 'border-zinc-900 bg-white ring-1 ring-zinc-900 shadow-sm'
                            : 'border-zinc-200/60 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-md border border-zinc-200 flex-shrink-0 ${f.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-800">
                              {f.label}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900" />}
                          </div>
                          <p className="text-[9px] text-zinc-400 mt-0.5 truncate">
                            {f.desc}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Overlays Panel */}
            {sidebarTab === 'overlays' && (
              <div className="flex h-full flex-col gap-4">
                <div>
                  <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
                    Screen Guides
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Toggle guidelines and canvas filters on the live screen.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {overlays.map((o) => {
                    const isSelected = overlay === o.id
                    return (
                      <button
                        key={o.id}
                        onClick={() => setOverlay(o.id)}
                        className={`flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-zinc-900 bg-white ring-1 ring-zinc-900 shadow-sm'
                            : 'border-zinc-200/60 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-zinc-800">
                            {o.label}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-zinc-900" />}
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-normal">
                          {o.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Settings/General Panel */}
            {sidebarTab === 'settings' && (
              <div className="flex h-full flex-col gap-4">
                <h3 className="text-xs font-semibold tracking-wider uppercase text-zinc-500">
                  Workspace Settings
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="rounded-lg border border-zinc-200/60 bg-white p-3 space-y-2">
                    <p className="font-semibold text-zinc-700">Project Details</p>
                    <div className="space-y-1 text-zinc-500">
                      <div className="flex justify-between">
                        <span>Format:</span>
                        <span className="font-medium text-zinc-800">MPEG-4</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Tracks:</span>
                        <span className="font-medium text-zinc-800">{tracks.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Resolution:</span>
                        <span className="font-medium text-zinc-800">1920 x 1080</span>
                      </div>
                    </div>
                  </div>

                  {/* AI API Configuration Card */}
                  <div className="rounded-lg border border-zinc-200/60 bg-white p-3 space-y-3">
                    <p className="font-semibold text-zinc-700 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500 fill-indigo-500/10" /> AI API Settings
                    </p>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                          AI Provider
                        </label>
                        <select
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'groq')}
                          className="w-full h-8 px-2 text-xs bg-white border border-zinc-200 rounded-md text-zinc-700 outline-none"
                        >
                          <option value="gemini">Gemini API</option>
                          <option value="groq">Groq API (groq.com)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Gemini API Key
                        </label>
                        <input
                          type="password"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="Paste Gemini API Key..."
                          className="w-full h-8 px-2 text-xs bg-white border border-zinc-200 rounded-md text-zinc-700 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Groq API Key
                        </label>
                        <input
                          type="password"
                          value={groqApiKey}
                          onChange={(e) => setGroqApiKey(e.target.value)}
                          placeholder="Paste Groq API Key..."
                          className="w-full h-8 px-2 text-xs bg-white border border-zinc-200 rounded-md text-zinc-700 outline-none"
                        />
                      </div>
                      <p className="text-[9px] leading-relaxed text-zinc-400">
                        Keys are saved locally in your browser storage. If keys are missing, a local rule matcher handles common prompts.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200/60 bg-white p-3 space-y-1 text-center text-zinc-500">
                    <Sliders className="h-5 w-5 mx-auto mb-2 text-zinc-400" />
                    <p className="font-semibold text-zinc-700">Global Reset</p>
                    <p className="text-[10px] pb-2">Revert all filters and configurations back to standard specs.</p>
                    <Button
                      onClick={() => {
                        useEditorStore.getState().resetAdjustments()
                        toast.success('Workspace filters reset')
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full text-zinc-800"
                    >
                      Reset Workspace
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
