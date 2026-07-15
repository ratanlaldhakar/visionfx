'use client'

import { useEditorStore } from '@/store/useEditorStore'
import { motion } from 'framer-motion'
import {
  Sliders,
  RotateCcw,
  RefreshCw,
  Info,
  Clock,
  Layers,
} from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AspectRatio } from '@/types'

export function PropertiesPanel() {
  const {
    rightPanelOpen,
    brightness,
    contrast,
    saturation,
    blur,
    scale,
    rotation,
    aspectRatio,
    setBrightness,
    setContrast,
    setSaturation,
    setBlur,
    setScale,
    setRotation,
    setAspectRatio,
    resetAdjustments,
    tracks,
    selectedClipId,
    updateClipContent,
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
  } = useEditorStore()

  if (!rightPanelOpen) return null

  // Find the selected clip info if any
  let selectedClip = null
  if (selectedClipId) {
    for (const track of tracks) {
      const found = track.clips.find((clip) => clip.id === selectedClipId)
      if (found) {
        selectedClip = found
        break
      }
    }
  }

  const aspectRatios: { id: AspectRatio; label: string; desc: string }[] = [
    { id: '16-9', label: '16:9', desc: 'YouTube / Desktop' },
    { id: '9-16', label: '9:16', desc: 'TikTok / Shorts / Reels' },
    { id: '1-1', label: '1:1', desc: 'Instagram Square' },
  ]

  const handleRotate = () => {
    const nextRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270
    setRotation(nextRotation)
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="flex h-[calc(100vh-3.5rem)] w-72 flex-col border-l border-slate-100 bg-white select-none overflow-y-auto"
    >
      {/* Tab Navigation header */}
      <div className="flex h-12 items-center justify-between border-b border-slate-100 px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5" /> Inspector
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetAdjustments}
          className="h-7 w-7 rounded-md hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700"
          title="Reset adjustments"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 space-y-5 p-4">
        {/* Dynamic Panel: If Clip Selected show Clip Inspector, else show Camera Inspector */}
        {selectedClip ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs mb-1">
                <Layers className="h-3.5 w-3.5" /> Clip Properties
              </div>
              <p className="text-xs font-medium text-zinc-800 truncate mb-2">
                {selectedClip.name}
              </p>

              <div className="space-y-1.5 text-[10px] text-zinc-500">
                <div className="flex justify-between">
                  <span>Track:</span>
                  <span className="font-semibold text-zinc-700 uppercase">
                    {selectedClip.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Start:
                  </span>
                  <span className="font-mono text-zinc-700">
                    {selectedClip.start.toFixed(2)}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Duration:
                  </span>
                  <span className="font-mono text-zinc-700">
                    {selectedClip.duration.toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>

            {selectedClip.type === 'text' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500">Text Content</label>
                <input
                  type="text"
                  value={selectedClip.content || ''}
                  className="flex h-8 w-full rounded border border-zinc-200 px-2 py-1 text-xs outline-none focus:border-zinc-500"
                  onChange={(e) => {
                    if (selectedClip) {
                      updateClipContent(selectedClip.id, e.target.value)
                    }
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-zinc-50 border border-zinc-200/50 p-3 flex gap-2.5 items-start">
            <Info className="h-4 w-4 text-zinc-400 mt-0.5" />
            <div className="text-[10px] text-zinc-500 leading-relaxed">
              <span className="font-semibold text-zinc-700 block mb-0.5">Camera Inspector</span>
              No clip selected in timeline. Displaying global camera adjustments and canvas filters.
            </div>
          </div>
        )}

        {/* Section: Face Mesh Tracking */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Face Mesh Overlay
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-zinc-500">Enable</span>
              <input
                type="checkbox"
                checked={faceMeshEnabled}
                onChange={(e) => setFaceMeshEnabled(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950 cursor-pointer"
              />
            </div>
          </div>

          {faceMeshEnabled && (
            <div className="space-y-3 bg-zinc-50/50 border border-zinc-200/40 rounded-lg p-2.5 transition-all">
              {/* Render Mode Select */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500">Render Mode</span>
                <div className="grid grid-cols-4 gap-1">
                  {(['wireframe', 'points', 'outline', 'all'] as const).map((mode) => {
                    const isSelected = faceMeshMode === mode
                    return (
                      <button
                        key={mode}
                        onClick={() => setFaceMeshMode(mode)}
                        className={`py-1 text-[9px] font-semibold rounded border capitalize transition-all ${
                          isSelected
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-600'
                        }`}
                      >
                        {mode === 'all' ? 'Full' : mode}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quality Delegate Toggle */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500">Inference Mode</span>
                <div className="grid grid-cols-2 gap-1">
                  {(['performance', 'quality'] as const).map((lvl) => {
                    const isSelected = faceMeshModeLevel === lvl
                    return (
                      <button
                        key={lvl}
                        onClick={() => setFaceMeshModeLevel(lvl)}
                        className={`py-1 text-[9px] font-semibold rounded border capitalize transition-all ${
                          isSelected
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-600'
                        }`}
                      >
                        {lvl === 'performance' ? 'Performance' : 'Quality'}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Hand Tracking */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Hand Tracking
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-zinc-500">Enable</span>
              <input
                type="checkbox"
                checked={handTrackingEnabled}
                onChange={(e) => setHandTrackingEnabled(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section: Pose Tracking */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Pose Tracking
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-zinc-500">Enable</span>
              <input
                type="checkbox"
                checked={poseTrackingEnabled}
                onChange={(e) => setPoseTrackingEnabled(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section: 3D AR Objects */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            3D AR Overlay
          </label>
          <div className="grid grid-cols-4 gap-1">
            {([
              { id: 'halo', label: 'Halo' },
              { id: 'ring', label: 'Ring' },
              { id: 'glasses', label: 'Visor' },
              { id: 'none', label: 'Off' }
            ] as const).map((obj) => {
              const isSelected = threeActiveObject === obj.id
              return (
                <button
                  key={obj.id}
                  onClick={() => setThreeActiveObject(obj.id)}
                  className={`py-1.5 text-[9px] font-semibold rounded border capitalize transition-all ${
                    isSelected
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 text-zinc-600'
                  }`}
                >
                  {obj.label}
                </button>
              )
            })}
          </div>
          {threeActiveObject !== 'none' && (
            <div className="rounded-lg bg-zinc-50 border border-zinc-200/50 p-2 text-[9px] text-zinc-500 leading-normal animate-in fade-in duration-200">
              <span className="font-semibold text-zinc-700 block mb-0.5">Interaction Alert</span>
              Make a <span className="font-bold text-cyan-600 uppercase">fist gesture</span> near the 3D object to grab and drag it with hand movements. Release to drop.
            </div>
          )}
        </div>

        {/* Section: VFX Effect Engine */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            VFX Effect Engine
          </label>
          
          {/* Effect Selector Dropdown */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-medium text-zinc-500">Active Effect</span>
            <Select
              value={selectedVfx}
              onValueChange={(val) => { if (val) setSelectedVfx(val as Parameters<typeof setSelectedVfx>[0]) }}
            >
              <SelectTrigger className="h-7 text-[10px] bg-white border-zinc-200">
                <SelectValue placeholder="Select Effect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Disabled)</SelectItem>
                <SelectItem value="glow">Glow Overlay</SelectItem>
                <SelectItem value="neon">Neon Wireframe</SelectItem>
                <SelectItem value="outline">Outline Silhouette</SelectItem>
                <SelectItem value="blur">Motion Blur</SelectItem>
                <SelectItem value="particles">Orbiting Particles</SelectItem>
                <SelectItem value="fire">Fire Sparks</SelectItem>
                <SelectItem value="smoke">Rising Smoke</SelectItem>
                <SelectItem value="lightning">Lightning Bolts</SelectItem>
                <SelectItem value="rain">Digital Rain</SelectItem>
                <SelectItem value="snow">Cosmic Snow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedVfx !== 'none' && (
            <div className="space-y-3.5 animate-in slide-in-from-top-2 duration-200">
              
              {/* Color Presets */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium text-zinc-500">Effect Color</span>
                  <span className="text-[9px] font-mono text-zinc-400 uppercase">{vfxColor}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={vfxColor}
                    onChange={(e) => setVfxColor(e.target.value)}
                    style={{ padding: 0 }}
                    className="h-6 w-8 rounded border border-zinc-200 cursor-pointer bg-white p-0.5"
                  />
                  <div className="flex flex-wrap gap-1 flex-1">
                    {[
                      { hex: '#00f2fe', label: 'Cyan' },
                      { hex: '#ec4899', label: 'Pink' },
                      { hex: '#a3e635', label: 'Lime' },
                      { hex: '#8b5cf6', label: 'Violet' },
                      { hex: '#f97316', label: 'Amber' }
                    ].map((preset) => (
                      <button
                        key={preset.hex}
                        onClick={() => setVfxColor(preset.hex)}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.label}
                        className={`h-4 w-4 rounded-full border border-white shadow-sm ring-1 ring-zinc-200/50 cursor-pointer transition-transform hover:scale-115 ${
                          vfxColor === preset.hex ? 'ring-zinc-950 scale-110' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-medium text-zinc-500">Opacity</span>
                  <span className="font-mono text-zinc-700">{vfxOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vfxOpacity}
                  onChange={(e) => setVfxOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-150 rounded-lg appearance-none cursor-pointer accent-zinc-950"
                />
              </div>

              {/* Strength Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-medium text-zinc-500">Strength / Intensity</span>
                  <span className="font-mono text-zinc-700">{vfxStrength}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={vfxStrength}
                  onChange={(e) => setVfxStrength(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-150 rounded-lg appearance-none cursor-pointer accent-zinc-950"
                />
              </div>

              {/* Speed Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-medium text-zinc-500">Speed / Velocity</span>
                  <span className="font-mono text-zinc-700">{vfxSpeed}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={vfxSpeed}
                  onChange={(e) => setVfxSpeed(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-150 rounded-lg appearance-none cursor-pointer accent-zinc-950"
                />
              </div>

              {/* Radius Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-medium text-zinc-500">Radius / Size</span>
                  <span className="font-mono text-zinc-700">{vfxRadius}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  value={vfxRadius}
                  onChange={(e) => setVfxRadius(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-150 rounded-lg appearance-none cursor-pointer accent-zinc-950"
                />
              </div>

            </div>
          )}
        </div>

        {/* Section: Layout Aspect Ratio */}
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-1">
            {aspectRatios.map((ratio) => {
              const isSelected = aspectRatio === ratio.id
              return (
                <button
                  key={ratio.id}
                  onClick={() => setAspectRatio(ratio.id)}
                  className={`flex flex-col items-center justify-center rounded-lg border py-2.5 text-center transition-all ${
                    isSelected
                      ? 'border-zinc-950 bg-zinc-950 text-white shadow-sm'
                      : 'border-zinc-200/60 bg-white hover:border-zinc-300 text-zinc-600'
                  }`}
                >
                  <span className="text-xs font-semibold">{ratio.label}</span>
                  <span
                    className={`text-[8px] mt-0.5 tracking-tight ${
                      isSelected ? 'text-zinc-300' : 'text-zinc-400'
                    }`}
                  >
                    {ratio.id === '16-9' ? 'Landscape' : ratio.id === '9-16' ? 'Portrait' : 'Square'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Section: Color Grade Adjustments */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Color Grading
          </label>

          {/* Brightness slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Brightness</span>
              <span className="font-mono text-zinc-800">{brightness}%</span>
            </div>
            <Slider
              value={[brightness]}
              min={0}
              max={200}
              step={1}
              onValueChange={(val) => setBrightness(Array.isArray(val) ? val[0] : val)}
            />
          </div>

          {/* Contrast slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Contrast</span>
              <span className="font-mono text-zinc-800">{contrast}%</span>
            </div>
            <Slider
              value={[contrast]}
              min={0}
              max={200}
              step={1}
              onValueChange={(val) => setContrast(Array.isArray(val) ? val[0] : val)}
            />
          </div>

          {/* Saturation slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Saturation</span>
              <span className="font-mono text-zinc-800">{saturation}%</span>
            </div>
            <Slider
              value={[saturation]}
              min={0}
              max={200}
              step={1}
              onValueChange={(val) => setSaturation(Array.isArray(val) ? val[0] : val)}
            />
          </div>

          {/* Blur slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Lens Blur</span>
              <span className="font-mono text-zinc-800">{blur}px</span>
            </div>
            <Slider
              value={[blur]}
              min={0}
              max={20}
              step={0.5}
              onValueChange={(val) => setBlur(Array.isArray(val) ? val[0] : val)}
            />
          </div>
        </div>

        {/* Section: Scale & Transform */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Transformations
          </label>

          {/* Scale slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Scale Zoom</span>
              <span className="font-mono text-zinc-800">{scale.toFixed(2)}x</span>
            </div>
            <Slider
              value={[scale]}
              min={0.5}
              max={2.0}
              step={0.05}
              onValueChange={(val) => setScale(Array.isArray(val) ? val[0] : val)}
            />
          </div>

          {/* Rotation Toggle */}
          <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-xs">
            <span className="text-zinc-500 font-medium">Rotation Angle</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-800 font-semibold">{rotation}°</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
                className="h-8 gap-1.5 hover:bg-zinc-50 border-zinc-200/80 text-zinc-700"
              >
                <RefreshCw className="h-3 w-3" /> Rotate 90°
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
