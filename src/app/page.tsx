'use client'

import { useEffect, useState } from 'react'
import { useEditorStore } from '@/store/useEditorStore'
import { Sidebar } from '@/components/workspace/Sidebar'
import { TopNav } from '@/components/workspace/TopNav'
import { CameraPreview } from '@/components/workspace/CameraPreview'
import { PropertiesPanel } from '@/components/workspace/PropertiesPanel'
import { Timeline } from '@/components/workspace/Timeline'
import { MobileWorkspace } from '@/components/workspace/MobileWorkspace'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

export default function WorkspacePage() {
  const { isPlaying, duration, setCurrentTime, setIsPlaying } = useEditorStore()
  const [isMobile, setIsMobile] = useState(false)

  // Sync playback timer
  useEffect(() => {
    let timerId: NodeJS.Timeout
    if (isPlaying) {
      const intervalMs = 100 // Tick every 100ms
      const incrementSec = 0.1 // Representing 100ms in seconds

      timerId = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + incrementSec
        })
      }, intervalMs)
    }

    return () => {
      if (timerId) clearInterval(timerId)
    }
  }, [isPlaying, duration, setCurrentTime, setIsPlaying])

  // Track responsive screen dimensions
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-50 font-sans antialiased">
        {/* Top Header Navigation */}
        <TopNav />

        {/* Workspace Body */}
        {isMobile ? (
          <MobileWorkspace />
        ) : (
          <div className="flex flex-1 w-full overflow-hidden">
            {/* Left Options/Media Sidebar */}
            <Sidebar />

            {/* Core canvas & adjustments area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top Workspace (Camera Preview & Right properties) */}
              <div className="flex-1 flex overflow-hidden">
                <CameraPreview />
                <PropertiesPanel />
              </div>

              {/* Bottom Timeline */}
              <Timeline />
            </div>
          </div>
        )}

        {/* Global Toast Notification Engine */}
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  )
}
