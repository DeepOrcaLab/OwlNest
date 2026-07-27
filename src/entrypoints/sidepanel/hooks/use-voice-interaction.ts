import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { browser } from "#imports"

export type VoicePermissionState = "unknown" | "requesting" | "granted" | "denied" | "requires-page" | "unavailable" | "error"
export type VoiceStatus = "idle" | "requesting" | "listening" | "transcript-ready" | "error"

interface StartListeningOptions {
  autoSend?: boolean
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort?: () => void
}

function getSpeechRecognitionConstructor() {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
}

function getVoiceErrorMessage(error: unknown): { message: string, permissionState: VoicePermissionState } {
  const name = error instanceof DOMException ? error.name : error && typeof error === "object" && "name" in error ? String((error as { name?: unknown }).name) : "Unknown"

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        message: "麦克风权限被拒绝，请在浏览器权限中允许 OwlNest 使用麦克风。",
        permissionState: "denied",
      }
    case "NotFoundError":
    case "DevicesNotFoundError":
      return {
        message: "没有检测到麦克风，请检查设备。",
        permissionState: "unavailable",
      }
    case "NotReadableError":
    case "TrackStartError":
      return {
        message: "麦克风可能被其他应用占用。",
        permissionState: "error",
      }
    case "SecurityError":
      return {
        message: "当前扩展页面无法请求麦克风权限，请打开 OwlNest 语音权限页面授权。",
        permissionState: "requires-page",
      }
    default:
      return {
        message: "语音功能启动失败，请查看控制台错误。",
        permissionState: "error",
      }
  }
}

export function useVoiceInteraction(language = "zh-CN") {
  const [permissionState, setPermissionState] = useState<VoicePermissionState>("unknown")
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const autoSendRef = useRef(false)

  const isSupported = useMemo(() => {
    return !!getSpeechRecognitionConstructor()
  }, [])

  const stopAudioTracks = useCallback(() => {
    audioStreamRef.current?.getTracks().forEach(track => track.stop())
    audioStreamRef.current = null
  }, [])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    }
    catch {
      // Silently ignore — recognition may already be stopped
    }
    recognitionRef.current = null
    autoSendRef.current = false
    setIsListening(false)
    stopAudioTracks()
  }, [stopAudioTracks])

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    setError(null)
    setPermissionState("requesting")
    setIsRequestingPermission(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState("requires-page")
      setError("当前扩展页面无法请求麦克风权限，请打开 OwlNest 语音权限页面授权。")
      setIsRequestingPermission(false)
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      stopAudioTracks()
      setPermissionState("granted")
      return true
    }
    catch (permissionError) {
      const resolved = getVoiceErrorMessage(permissionError)
      setPermissionState(resolved.permissionState)
      setError(resolved.message)
      return false
    }
    finally {
      setIsRequestingPermission(false)
    }
  }, [stopAudioTracks])

  const startListening = useCallback(async (options?: StartListeningOptions): Promise<boolean> => {
    setError(null)
    setTranscript("")
    setInterimTranscript("")

    const SpeechRecognition = getSpeechRecognitionConstructor()
    if (!SpeechRecognition) {
      setPermissionState("unavailable")
      setError("当前浏览器不支持语音识别，请使用 Chrome。")
      return false
    }

    const hasPermission = await requestMicrophonePermission()
    if (!hasPermission)
      return false

    try {
      const recognition = new SpeechRecognition() as SpeechRecognitionLike
      recognition.lang = language
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event: any) => {
        let finalText = ""
        let interimText = ""
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index]
          const text = result[0]?.transcript ?? ""
          if (result.isFinal)
            finalText += text
          else
            interimText += text
        }

        if (interimText)
          setInterimTranscript(interimText)

        if (finalText) {
          setTranscript(finalText)
          setInterimTranscript("")
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setPermissionState("denied")
          setError("麦克风权限被拒绝，请在浏览器权限中允许 OwlNest 使用麦克风。")
        }
        else if (event.error === "audio-capture") {
          setPermissionState("unavailable")
          setError("没有检测到麦克风，请检查设备。")
        }
        else {
          setPermissionState("error")
          setError("语音功能启动失败，请查看控制台错误。")
        }
        setIsListening(false)
        autoSendRef.current = false
      }

      recognition.onend = () => {
        setIsListening(false)
        autoSendRef.current = false
      }

      recognitionRef.current = recognition
      autoSendRef.current = !!options?.autoSend
      recognition.start()
      setIsListening(true)
      return true
    }
    catch (startError) {
      const resolved = getVoiceErrorMessage(startError)
      setPermissionState(resolved.permissionState)
      setError(resolved.message)
      setIsListening(false)
      autoSendRef.current = false
      return false
    }
  }, [language, requestMicrophonePermission])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
  }, [])

  const openPermissionPage = useCallback(async () => {
    const url = browser.runtime.getURL("/voice-permission.html")
    await browser.tabs.create({ url, active: true })
  }, [])

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.()
        recognitionRef.current?.stop()
      }
      catch {
        // Silently ignore — recognition may already be torn down
      }
      stopAudioTracks()
      try {
        window.speechSynthesis.cancel()
      }
      catch {
        /* ignore */
      }
    }
  }, [stopAudioTracks])

  const status: VoiceStatus = error
    ? "error"
    : isRequestingPermission
      ? "requesting"
      : isListening
        ? "listening"
        : transcript
          ? "transcript-ready"
          : "idle"

  return {
    isSupported,
    permissionState,
    isRequestingPermission,
    isListening,
    transcript,
    interimTranscript,
    error,
    status,
    requestMicrophonePermission,
    startListening,
    stopListening,
    resetTranscript,
    openPermissionPage,
  }
}
