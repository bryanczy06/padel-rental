import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  const remove = (id) => setToasts(p => p.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:left-auto sm:w-80 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-lg text-sm font-medium
              ${t.type === 'success' ? 'bg-brand-600 text-white' : 'bg-red-600 text-white'}`}>
            {t.type === 'success'
              ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              : <XCircle size={18} className="shrink-0 mt-0.5" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="shrink-0 opacity-75 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
