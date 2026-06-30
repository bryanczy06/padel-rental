import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Modal({ open, onClose, title, children, maxW = 'max-w-md' }) {
  const { t } = useTranslation()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${maxW} bg-white rounded-2xl shadow-xl p-6 animate-in slide-in-from-bottom-4 duration-200`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
