import { useState, useCallback, useEffect, useRef } from 'react'

export type ResolutionProfile = '360p' | '720p' | '1080p' | '4K'

interface ResolutionDetails {
  width: number
  height: number
}

const RESOLUTION_MAP: Record<ResolutionProfile, ResolutionDetails> = {
  '360p': { width: 640, height: 360 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4K': { width: 3840, height: 2160 },
}

export const useWebcam = () => {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [selectedResolution, setSelectedResolution] = useState<ResolutionProfile>('720p')

  // Keep stream in ref to access inside cleanups without dependencies
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  // Stop current active webcam stream
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      setStream(null)
      streamRef.current = null
    }
    setIsActive(false)
    setIsLoading(false)
  }, [])

  // Enumerate active video inputs
  const enumerateDevices = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter((device) => device.kind === 'videoinput')
      setDevices(videoDevices)
    } catch (err) {
      console.error('Failed to enumerate video devices:', err)
    }
  }, [])

  // Start webcam with custom device constraints and resolutions
  const startWebcam = useCallback(
    async (deviceId?: string, resolution?: ResolutionProfile) => {
      // First clean up any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (typeof window !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
        setError('Camera access requires a Secure Context (localhost or HTTPS). Chrome blocks camera permission over insecure HTTP local network IPs (e.g. 192.168.1.4:3000). Please open the page via http://localhost:3000 or deploy with SSL.')
        setIsLoading(false)
        setIsActive(false)
        return
      }

      setIsLoading(true)
      setError(null)

      const targetDevice = deviceId ?? selectedDeviceId
      const targetRes = resolution ?? selectedResolution

      const dimensions = RESOLUTION_MAP[targetRes]
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: dimensions.width },
        height: { ideal: dimensions.height },
      }

      if (targetDevice) {
        videoConstraints.deviceId = { ideal: targetDevice }
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false, // video capture only for canvas preview
        })

        setStream(mediaStream)
        streamRef.current = mediaStream
        setIsActive(true)
        setIsLoading(false)

        // Capture settings of current active track
        const activeTrack = mediaStream.getVideoTracks()[0]
        if (activeTrack) {
          const settings = activeTrack.getSettings()
          if (settings.deviceId) {
            setSelectedDeviceId(settings.deviceId)
          }
        }

        // Query labels (labels only appear after permissions are granted)
        await enumerateDevices()
      } catch (err: unknown) {
        console.error('Error starting camera stream:', err)
        setIsActive(false)
        setIsLoading(false)

        if (err instanceof DOMException) {
          switch (err.name) {
            case 'NotAllowedError':
              setError('Camera permission denied. Please grant camera access in browser settings.')
              break
            case 'NotFoundError':
              setError('No camera device found. Please verify hardware connection.')
              break
            case 'NotReadableError':
              setError('Camera is in use by another tab or program.')
              break
            case 'OverconstrainedError':
              setError('Requested resolution profile is not supported by this camera.')
              break
            case 'TypeError':
              setError('Invalid camera configuration constraints.')
              break
            default:
              setError(`Camera Access Error: ${err.message}`)
          }
        } else {
          setError(err instanceof Error ? err.message : 'Failed to connect to camera device.')
        }
      }
    },
    [selectedDeviceId, selectedResolution, enumerateDevices]
  )

  // Switch devices on the fly
  const switchDevice = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId)
      if (isActive) {
        await startWebcam(deviceId, selectedResolution)
      }
    },
    [isActive, selectedResolution, startWebcam]
  )

  // Switch resolutions on the fly
  const switchResolution = useCallback(
    async (resolution: ResolutionProfile) => {
      setSelectedResolution(resolution)
      if (isActive) {
        await startWebcam(selectedDeviceId, resolution)
      }
    },
    [isActive, selectedDeviceId, startWebcam]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return {
    stream,
    isActive,
    isLoading,
    error,
    devices,
    selectedDeviceId,
    selectedResolution,
    startWebcam,
    stopWebcam,
    switchDevice,
    switchResolution,
  }
}
