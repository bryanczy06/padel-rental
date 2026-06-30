import { useTranslation } from 'react-i18next'

export default function LanguageToggle({ className = '' }) {
  const { i18n } = useTranslation()
  const isHe = i18n.language === 'he'

  function toggle() {
    const next = isHe ? 'en' : 'he'
    i18n.changeLanguage(next)
    localStorage.setItem('lang', next)
    document.documentElement.lang = next
    document.documentElement.dir  = next === 'he' ? 'rtl' : 'ltr'
  }

  return (
    <button
      onClick={toggle}
      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200
                  hover:bg-gray-50 transition-colors ${className}`}
    >
      {isHe ? 'EN' : 'עב'}
    </button>
  )
}
