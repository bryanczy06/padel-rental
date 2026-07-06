import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useTranslation } from 'react-i18next'
import { Camera, X } from 'lucide-react'

export default function QRScanner({ onResult, onClose, large = false }) {
  const { t } = useTranslation()
  const id      = useRef('qr-reader-' + Math.random().toString(36).slice(2))
  const scanner = useRef(null)
  const [error, setError]     = useState(null)
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState(false)

  function startScanner() {
    setLoading(true)
    setStarted(true)  // show div first so html5-qrcode can find it
    setError(null)
    setTimeout(() => {
      try {
        scanner.current = new Html5Qrcode(id.current)
        Html5Qrcode.getCameras()
          .then(cameras => {
            if (!cameras.length) { setError('לא נמצאה מצלמה'); setLoading(false); return }
            const cam = cameras.find(c => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1]
            return scanner.current.start(
              { facingMode: 'environment' },
              { fps: 10, qrbox: { width: large ? 350 : 250, height: large ? 350 : 250 }, aspectRatio: 1 },
              (text) => { onResult(text) },
              () => {}
            )
          })
          .then(() => {
            setLoading(false)
            if (large) {
              // apply 2× zoom on the active camera track
              const video = document.querySelector(`#${id.current} video`)
              if (video?.srcObject) {
                const track = video.srcObject.getVideoTracks()[0]
                const caps = track?.getCapabilities?.()
                if (caps?.zoom) {
                  const zoom = Math.min(2, caps.zoom.max)
                  track.applyConstraints({ advanced: [{ zoom }] }).catch(() => {})
                }
              }
            }
          })
          .catch(e => { setError(e.message || 'שגיאת מצלמה'); setLoading(false); setStarted(false) })
      } catch(e) {
        setError(e.message || 'שגיאה'); setLoading(false); setStarted(false)
      }
    }, 100)
  }

  useEffect(() => {
    return () => { scanner.current?.stop().catch(() => {}) }
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* scanner container always in DOM so html5-qrcode can find the element */}
      <div id={id.current} style={{ minHeight: started ? (large ? 420 : 280) : 0 }} className={`w-full rounded-xl overflow-hidden ${started ? '' : 'hidden'}`} />

      {!started && !error && (
        <button onClick={startScanner} disabled={loading}
          className="btn-primary w-full py-4 text-base gap-3">
          <Camera size={22} />
          {loading ? 'מפעיל מצלמה...' : 'פתח סורק QR'}
        </button>
      )}

      {error && (
        <div className="text-red-500 text-sm text-center py-4 bg-red-50 rounded-xl w-full px-3">
          {error}
          <button onClick={startScanner} className="block mt-2 text-brand-600 font-medium">נסה שוב</button>
        </div>
      )}

      {onClose && (
        <button onClick={onClose} className="btn-secondary w-full">
          <X size={16} /> {t('common.close')}
        </button>
      )}
    </div>
  )
}
