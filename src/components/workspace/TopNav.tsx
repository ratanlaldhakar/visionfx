'use client'

import { useState } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import {
  Play,
  Pause,
  Download,
  Tv,
  PanelRightClose,
  PanelRight,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export function TopNav() {
  const {
    currentTime,
    isPlaying,
    setIsPlaying,
    rightPanelOpen,
    setRightPanelOpen,
    timelineOpen,
    setTimelineOpen,
  } = useEditorStore()

  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportQuality, setExportQuality] = useState('1080p')
  const [projectName, setProjectName] = useState('VisionFX Project')
  const [isEditingName, setIsEditingName] = useState(false)

  // Format time code: mm:ss:ff (frames)
  const formatTimecode = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * 30) // 30 FPS representation
    return `${min.toString().padStart(2, '0')}:${sec
      .toString()
      .padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }

  // Simulate video exporting
  const handleExport = () => {
    setIsExporting(true)
    setExportProgress(0)

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setIsExporting(false)
            toast.success('Project exported successfully!', {
              description: `Saved as ${projectName.toLowerCase().replace(/\s+/g, '_')}_${exportQuality}.mp4`,
            })
          }, 600)
          return 100
        }
        return prev + 4
      })
    }, 150)
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-100 bg-white/80 px-4 backdrop-blur-md">
      {/* Left side: Brand + Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-md shadow-zinc-950/20">
            <span className="font-mono text-base font-black italic tracking-tighter">V</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            VisionFX
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-200" />

        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingName(false)
              }}
              className="h-7 rounded border border-zinc-200 bg-zinc-50 px-2 text-xs font-medium text-zinc-800 focus:border-zinc-400 focus:outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="rounded px-1.5 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {projectName}
            </button>
          )}
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Center: Play status + Time Code */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50/50 py-1 pl-1.5 pr-3 shadow-inner">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 rounded-full hover:bg-white"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3 fill-zinc-900 stroke-zinc-900" />
            ) : (
              <Play className="h-3 w-3 fill-zinc-900 stroke-zinc-900" />
            )}
          </Button>
          <span className="font-mono text-xs font-semibold tracking-wider text-zinc-800">
            {formatTimecode(currentTime)}
          </span>
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-zinc-100/80 bg-zinc-50/60 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          SIMULATION ACTIVE
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        {/* Toggle Right Panel */}
        <Button
          size="icon"
          variant="ghost"
          className={`h-8 w-8 rounded-md border ${
            rightPanelOpen
              ? 'border-zinc-200 bg-zinc-50 text-zinc-800'
              : 'border-zinc-100 text-zinc-400 hover:text-zinc-700'
          }`}
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          title="Toggle properties panel"
        >
          {rightPanelOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRight className="h-4 w-4" />
          )}
        </Button>

        {/* Toggle Timeline */}
        <Button
          size="icon"
          variant="ghost"
          className={`h-8 w-8 rounded-md border ${
            timelineOpen
              ? 'border-zinc-200 bg-zinc-50 text-zinc-800'
              : 'border-zinc-100 text-zinc-400 hover:text-zinc-700'
          }`}
          onClick={() => setTimelineOpen(!timelineOpen)}
          title="Toggle timeline"
        >
          <Tv className="h-4 w-4" />
        </Button>

        {/* Export Modal */}
        <Dialog>
          <DialogTrigger
            render={
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-zinc-950 font-medium text-white hover:bg-zinc-800"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" /> Export Project
              </DialogTitle>
              <DialogDescription>
                Compile and export your dynamic workspace into a production-ready video file.
              </DialogDescription>
            </DialogHeader>

            {!isExporting ? (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-zinc-500">File Name</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-zinc-500">Quality Preset</label>
                  <Select value={exportQuality} onValueChange={(val) => setExportQuality(val || '1080p')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p HD (Fast rendering)</SelectItem>
                      <SelectItem value="1080p">1080p Full HD (Recommended)</SelectItem>
                      <SelectItem value="4K">4K Ultra HD (Maximum fidelity)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" className="h-9">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExport}
                    className="h-9 bg-zinc-950 hover:bg-zinc-800 text-white"
                  >
                    Start Rendering
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-6 text-center">
                <div className="flex justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-zinc-800" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-900">
                    {exportProgress === 100 ? 'Finalizing...' : 'Rendering video frames...'}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Applying filters, transformations, and overlays. Please keep the window open.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full bg-zinc-900 transition-all duration-300 ease-out"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                    <span>{exportProgress}%</span>
                    <span>30 fps</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </header>
  )
}
