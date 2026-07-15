'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEditorStore } from '@/store/useEditorStore'
import { CameraPreview } from './CameraPreview'
import {
  FolderOpen,
  Sliders,
  Sparkles,
  Grid3X3,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { FilterType, OverlayType } from '@/types'

type MobileTab = 'none' | 'media' | 'adjust' | 'ar' | 'vfx' | 'settings'

export function MobileWorkspace() {
  const [activeTab, setActiveTab] = useState<MobileTab>('none')
  
  const {
    // Store variables
    brightness,
    contrast,
    saturation,
    blur,
    scale,
    rotation,
    aspectRatio,
    filter,
    overlay,
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
    isPlaying,
    currentTime,
    duration,
    mediaLibrary,
    geminiApiKey,
    groqApiKey,
    aiProvider,

    // Store setters
    setBrightness,
    setContrast,
    setSaturation,
    setBlur,
    setScale,
    setRotation,
    setAspectRatio,
    setFilter,
    setOverlay,
    setFaceMeshEnabled,
    setFaceMeshMode,
    setFaceMeshModeLevel,
    setHandTrackingEnabled,
    setPoseTrackingEnabled,
    setThreeActiveObject,
    setSelectedVfx,
    setVfxOpacity,
    setVfxColor,
    setVfxStrength,
    setVfxSpeed,
    setVfxRadius,
    setIsPlaying,
    setCurrentTime,
    resetAdjustments,
    addMediaItem,
    setGeminiApiKey,
    setGroqApiKey,
    setAiProvider,
  } = useEditorStore()

  // Format playback time helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  };

  // Handle local file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    const newMedia = {
      id: `m-custom-${Date.now()}`,
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
      duration: 15,
      thumbnail: file.type.startsWith('video/') 
        ? 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=200&auto=format&fit=crop&q=60'
        : objectUrl,
      url: objectUrl,
    }

    addMediaItem(newMedia)
    toast.success('Media added to library')
  }

  // Predefined adjustment filters
  const filters: { id: FilterType; label: string }[] = [
    { id: 'none', label: 'Original' },
    { id: 'grayscale', label: 'Mono' },
    { id: 'sepia', label: 'Sepia' },
    { id: 'vintage', label: 'Retro' },
    { id: 'noir', label: 'Noir' },
    { id: 'cyberpunk', label: 'Cyber' },
    { id: 'warm', label: 'Warm' },
    { id: 'cool', label: 'Cool' },
  ]

  // Predefined device spec grid overlays
  const overlays: { id: OverlayType; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'grid', label: 'Grid Rule' },
    { id: 'safe-zone', label: 'Action Safe' },
    { id: 'vhs', label: 'VHS Frame' },
    { id: 'cinematic', label: 'Cinematic' },
  ]

  // Predefined VFX color swatches
  const vfxColors = [
    { name: 'Cyan', value: '#00ffff' },
    { name: 'Rose', value: '#ec4899' },
    { name: 'Violet', value: '#a855f7' },
    { name: 'Lime', value: '#a3e635' },
    { name: 'Orange', value: '#f97316' },
  ]

  return (
    <div className="relative flex flex-col flex-1 w-full bg-zinc-950 overflow-hidden select-none">
      
      {/* 1. Camera preview viewport */}
      <div className="flex-1 flex items-center justify-center p-3 relative min-h-0">
        <CameraPreview />
      </div>

      {/* 2. Compact Playback / Timer controls bar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-900/60 border-t border-zinc-900 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-8 w-8 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 shadow-md"
          >
            {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </Button>
          <span className="font-mono text-[11px] font-bold text-zinc-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Simplified scrub indicator */}
        <div className="flex-grow max-w-xs mx-4">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration}
            step={0.1}
            onValueChange={(val) => setCurrentTime(Array.isArray(val) ? val[0] : val)}
            className="w-full"
          />
        </div>
      </div>

      {/* 3. Action Tabs bottom navigation dock */}
      <div className="grid grid-cols-5 gap-1 py-1.5 bg-zinc-900 border-t border-zinc-800 text-[10px] font-bold text-zinc-400 shadow-2xl">
        <button
          onClick={() => setActiveTab(activeTab === 'media' ? 'none' : 'media')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${activeTab === 'media' ? 'text-white' : 'hover:text-zinc-200'}`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>Media</span>
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'adjust' ? 'none' : 'adjust')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${activeTab === 'adjust' ? 'text-white' : 'hover:text-zinc-200'}`}
        >
          <Sliders className="h-4 w-4" />
          <span>Adjust</span>
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'ar' ? 'none' : 'ar')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${activeTab === 'ar' ? 'text-white' : 'hover:text-zinc-200'}`}
        >
          <Grid3X3 className="h-4 w-4" />
          <span>AR Overlays</span>
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'vfx' ? 'none' : 'vfx')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${activeTab === 'vfx' ? 'text-white' : 'hover:text-zinc-200'}`}
        >
          <Sparkles className="h-4 w-4" />
          <span>VFX</span>
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'settings' ? 'none' : 'settings')}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${activeTab === 'settings' ? 'text-white' : 'hover:text-zinc-200'}`}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* 4. Sliding Bottom Sheet Tray */}
      <AnimatePresence>
        {activeTab !== 'none' && (
          <>
            {/* Backdrop screen overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveTab('none')}
              className="absolute inset-0 bg-black z-40"
            />

            {/* Sliding Drawer Card */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 max-h-[60%] bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-50 flex flex-col shadow-2xl overflow-hidden pb-safe"
            >
              
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-900/90 backdrop-blur-md sticky top-0 z-10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                  {activeTab === 'media' && <FolderOpen className="h-4 w-4 text-cyan-400" />}
                  {activeTab === 'adjust' && <Sliders className="h-4 w-4 text-cyan-400" />}
                  {activeTab === 'ar' && <Grid3X3 className="h-4 w-4 text-cyan-400" />}
                  {activeTab === 'vfx' && <Sparkles className="h-4 w-4 text-cyan-400" />}
                  {activeTab === 'settings' && <Settings className="h-4 w-4 text-cyan-400" />}
                  {activeTab.toUpperCase()}
                </span>
                <button
                  onClick={() => setActiveTab('none')}
                  className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="h-4.5 w-4.5 text-zinc-400" />
                </button>
              </div>

              {/* Drawer contents */}
              <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-5 text-white">
                
                {/* A. MEDIA DRAWER */}
                {activeTab === 'media' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Media Library</span>
                      <label className="flex h-7 items-center gap-1.5 rounded-full bg-white text-zinc-950 px-3 text-[10px] font-bold hover:bg-zinc-100 cursor-pointer shadow-md">
                        <Upload className="h-3 w-3" /> Upload
                        <input
                          type="file"
                          accept="video/*,image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {mediaLibrary.map((item) => (
                        <div
                          key={item.id}
                          className="group relative h-20 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950/40 p-1 flex gap-2 items-center"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.thumbnail}
                            alt={item.name}
                            className="h-14 w-14 rounded object-cover shrink-0 bg-zinc-900"
                          />
                          <div className="min-w-0 flex-1 flex flex-col justify-between h-full py-1">
                            <span className="text-[10px] font-semibold text-zinc-300 truncate pr-1">
                              {item.name}
                            </span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                              {item.type}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* B. ADJUSTMENTS DRAWER */}
                {activeTab === 'adjust' && (
                  <div className="space-y-4 pb-4">
                    
                    {/* Presets filter selector */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Color Grade presets</label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {filters.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`h-7 px-3 text-[10px] font-semibold rounded-full border shrink-0 transition-all ${
                              filter === f.id
                                ? 'bg-white text-zinc-950 border-white'
                                : 'border-zinc-800 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hardware Grid Overlays */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Safety Grid overlays</label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {overlays.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => setOverlay(o.id)}
                            className={`h-7 px-3 text-[10px] font-semibold rounded-full border shrink-0 transition-all ${
                              overlay === o.id
                                ? 'bg-white text-zinc-950 border-white'
                                : 'border-zinc-800 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-zinc-850 my-1" />

                    {/* Granular Sliders */}
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Camera Tweaks</span>
                        <Button
                          variant="ghost"
                          onClick={resetAdjustments}
                          className="h-6 gap-1 text-[9px] font-bold text-zinc-500 hover:text-white px-2 rounded-full"
                        >
                          <RotateCcw className="h-3 w-3" /> Reset
                        </Button>
                      </div>

                      {/* Brightness */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-zinc-300">
                          <span>Brightness</span>
                          <span className="font-mono font-bold text-zinc-400">{brightness}%</span>
                        </div>
                        <Slider
                          value={[brightness]}
                          min={0}
                          max={200}
                          onValueChange={(val) => setBrightness(Array.isArray(val) ? val[0] : val)}
                        />
                      </div>

                      {/* Contrast */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-zinc-300">
                          <span>Contrast</span>
                          <span className="font-mono font-bold text-zinc-400">{contrast}%</span>
                        </div>
                        <Slider
                          value={[contrast]}
                          min={0}
                          max={200}
                          onValueChange={(val) => setContrast(Array.isArray(val) ? val[0] : val)}
                        />
                      </div>

                      {/* Saturation */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-zinc-300">
                          <span>Saturation</span>
                          <span className="font-mono font-bold text-zinc-400">{saturation}%</span>
                        </div>
                        <Slider
                          value={[saturation]}
                          min={0}
                          max={200}
                          onValueChange={(val) => setSaturation(Array.isArray(val) ? val[0] : val)}
                        />
                      </div>

                      {/* Blur */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-zinc-300">
                          <span>Lens Blur</span>
                          <span className="font-mono font-bold text-zinc-400">{blur}px</span>
                        </div>
                        <Slider
                          value={[blur]}
                          min={0}
                          max={50}
                          onValueChange={(val) => setBlur(Array.isArray(val) ? val[0] : val)}
                        />
                      </div>

                      {/* Scale */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-zinc-300">
                          <span>Scale multiplier</span>
                          <span className="font-mono font-bold text-zinc-400">{scale.toFixed(1)}x</span>
                        </div>
                        <Slider
                          value={[scale]}
                          min={0.5}
                          max={2.5}
                          step={0.1}
                          onValueChange={(val) => setScale(Array.isArray(val) ? val[0] : val)}
                        />
                      </div>
                      {/* Rotation */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-zinc-300">
                          <span>Rotation angle</span>
                          <span className="font-mono font-bold text-zinc-400">{rotation}°</span>
                        </div>
                        <Slider
                          value={[rotation]}
                          min={-180}
                          max={180}
                          onValueChange={(val) => setRotation(Array.isArray(val) ? val[0] : val)}
                        />
                      </div>
                      {/* Aspect Ratio Selector */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-zinc-300">Layout Format</span>
                        <Select
                          value={aspectRatio}
                          onValueChange={(val) => setAspectRatio(val as import('@/types').AspectRatio)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800 text-white">
                            <SelectValue placeholder="Select Aspect" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                            <SelectItem value="16-9">Wide (16:9)</SelectItem>
                            <SelectItem value="9-16">Vertical (9:16)</SelectItem>
                            <SelectItem value="1-1">Square (1:1)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* C. AR OVERLAYS DRAWER */}
                {activeTab === 'ar' && (
                  <div className="space-y-4 pb-4">
                    
                    {/* Face Mesh switches */}
                    <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-300">Face Contour Mesh</span>
                        <Switch
                          checked={faceMeshEnabled}
                          onCheckedChange={setFaceMeshEnabled}
                        />
                      </div>

                      {faceMeshEnabled && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Draw Mode</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {(['wireframe', 'points', 'outline', 'all'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setFaceMeshMode(mode)}
                                  className={`h-6 text-[8px] font-bold uppercase rounded-md border transition-all ${
                                    faceMeshMode === mode
                                      ? 'bg-white text-zinc-950 border-white'
                                      : 'border-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Inference Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                              {(['performance', 'quality'] as const).map((level) => (
                                <button
                                  key={level}
                                  onClick={() => setFaceMeshModeLevel(level)}
                                  className={`h-6 text-[9px] font-bold uppercase rounded-md border transition-all ${
                                    faceMeshModeLevel === level
                                      ? 'bg-white text-zinc-950 border-white'
                                      : 'border-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* MediaPipe Hand & Pose Tracking switches */}
                    <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-300">Fingertip Hand Tracking</span>
                        <Switch
                          checked={handTrackingEnabled}
                          onCheckedChange={setHandTrackingEnabled}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-300">Pose Body Tracking</span>
                        <Switch
                          checked={poseTrackingEnabled}
                          onCheckedChange={setPoseTrackingEnabled}
                        />
                      </div>
                    </div>

                    {/* 3D AR Objects */}
                    <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-850 space-y-3">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Three.js 3D overlay items</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['halo', 'ring', 'glasses', 'none'] as const).map((obj) => (
                          <button
                            key={obj}
                            onClick={() => setThreeActiveObject(obj)}
                            className={`h-7 text-[10px] font-semibold rounded-lg border transition-all ${
                              threeActiveObject === obj
                                ? 'bg-white text-zinc-950 border-white'
                                : 'border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {obj.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* D. VFX ENGINE DRAWER */}
                {activeTab === 'vfx' && (
                  <div className="space-y-4 pb-4">
                    
                    {/* Effects Preset Selectors */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Active Shader VFX</label>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {([
                          'none',
                          'glow',
                          'neon',
                          'outline',
                          'blur',
                          'particles',
                          'fire',
                          'smoke',
                          'lightning',
                          'rain',
                          'snow',
                        ] as const).map((vfx) => (
                          <button
                            key={vfx}
                            onClick={() => setSelectedVfx(vfx)}
                            className={`h-7 px-3.5 text-[10px] font-semibold rounded-full border shrink-0 transition-all ${
                              selectedVfx === vfx
                                ? 'bg-white text-zinc-950 border-white'
                                : 'border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            {vfx.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedVfx !== 'none' && (
                      <div className="space-y-4">
                        <div className="h-px bg-zinc-850" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Shader parameters</span>

                        {/* Opacity */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-zinc-300">
                            <span>VFX Opacity</span>
                            <span className="font-mono font-bold text-zinc-400">{vfxOpacity}%</span>
                          </div>
                          <Slider
                            value={[vfxOpacity]}
                            min={0}
                            max={100}
                            onValueChange={(val) => setVfxOpacity(Array.isArray(val) ? val[0] : val)}
                          />
                        </div>

                        {/* Color Selector */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-zinc-300">VFX Glow Color</span>
                          <div className="flex gap-2">
                            {vfxColors.map((c) => (
                              <button
                                key={c.value}
                                onClick={() => setVfxColor(c.value)}
                                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                                  vfxColor === c.value ? 'scale-110 border-white' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: c.value }}
                                title={c.name}
                              />
                            ))}
                            {/* Color picker */}
                            <input
                              type="color"
                              value={vfxColor}
                              onChange={(e) => setVfxColor(e.target.value)}
                              className="h-6 w-6 rounded-full bg-transparent border-0 cursor-pointer overflow-hidden"
                            />
                          </div>
                        </div>

                        {/* Strength */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-zinc-300">
                            <span>VFX Strength</span>
                            <span className="font-mono font-bold text-zinc-400">{vfxStrength}</span>
                          </div>
                          <Slider
                            value={[vfxStrength]}
                            min={1}
                            max={100}
                            onValueChange={(val) => setVfxStrength(Array.isArray(val) ? val[0] : val)}
                          />
                        </div>

                        {/* Speed */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-zinc-300">
                            <span>Animation Speed</span>
                            <span className="font-mono font-bold text-zinc-400">{vfxSpeed}</span>
                          </div>
                          <Slider
                            value={[vfxSpeed]}
                            min={1}
                            max={100}
                            onValueChange={(val) => setVfxSpeed(Array.isArray(val) ? val[0] : val)}
                          />
                        </div>

                        {/* Radius */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-zinc-300">
                            <span>Scatter Radius</span>
                            <span className="font-mono font-bold text-zinc-400">{vfxRadius}</span>
                          </div>
                          <Slider
                            value={[vfxRadius]}
                            min={1}
                            max={100}
                            onValueChange={(val) => setVfxRadius(Array.isArray(val) ? val[0] : val)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* E. SETTINGS DRAWER */}
                {activeTab === 'settings' && (
                  <div className="space-y-4 pb-4">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">AI Prompt Integrations</span>

                    {/* Provider */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-300">AI Model Provider</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(['gemini', 'groq'] as const).map((prov) => (
                          <button
                            key={prov}
                            onClick={() => setAiProvider(prov)}
                            className={`h-8 text-[11px] font-semibold rounded-lg border transition-all ${
                              aiProvider === prov
                                ? 'bg-white text-zinc-950 border-white'
                                : 'border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {prov === 'gemini' ? 'Gemini 2.5 Flash' : 'Groq Llama 3'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gemini Key */}
                    {aiProvider === 'gemini' && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-zinc-300">Gemini API Key</span>
                        <input
                          type="password"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="AI.Ab8..."
                          className="h-8 w-full rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white px-3 focus:border-zinc-700 outline-none"
                        />
                      </div>
                    )}

                    {/* Groq Key */}
                    {aiProvider === 'groq' && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-zinc-300">Groq API Key</span>
                        <input
                          type="password"
                          value={groqApiKey}
                          onChange={(e) => setGroqApiKey(e.target.value)}
                          placeholder="gsk_..."
                          className="h-8 w-full rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white px-3 focus:border-zinc-700 outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
