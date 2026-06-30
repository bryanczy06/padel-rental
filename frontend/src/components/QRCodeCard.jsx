import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'

export default function QRCodeCard({ value, label, sublabel }) {
  const { t } = useTranslation()
  const canvas = useRef()

  useEffect(() => {
    if (!canvas.current || !value) return
    QRCode.toCanvas(canvas.current, value, { width: 200, margin: 1, color: { dark: '#111827' } })
  }, [value])

  function print() {
    const win = window.open('', '_blank')
    const src = canvas.current.toDataURL()
    win.document.write(`
      <html><body style="text-align:center;font-family:Inter,sans-serif;padding:2rem">
        <img src="${src}" style="width:200px"/>
        <p style="font-size:1.2rem;font-weight:600;margin-top:.5rem">${label}</p>
        ${sublabel ? `<p style="font-size:.9rem;color:#6b7280">${sublabel}</p>` : ''}
        <script>window.onload=()=>{window.print();window.close()}<\/script>
      </body></html>`)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvas} className="rounded-xl border border-gray-100" />
      <p className="font-semibold text-gray-900">{label}</p>
      {sublabel && <p className="text-sm text-gray-500">{sublabel}</p>}
      <button onClick={print} className="btn-secondary w-full">
        <Printer size={16} /> {t('common.print')}
      </button>
    </div>
  )
}
