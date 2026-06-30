import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../lib/AuthContext'
import Layout from '../../components/Layout'
import { CirclePlus, Undo2 } from 'lucide-react'

export default function StaffDashboard() {
  const { t }       = useTranslation()
  const { profile } = useAuth()

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 max-w-sm mx-auto text-center">
        <div>
          <p className="text-gray-500 text-sm">{t('dashboard.welcome')},</p>
          <h1 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h1>
        </div>

        <div className="w-full flex flex-col gap-4">
          <Link to="/staff/rent"
            className="card flex flex-col items-center gap-3 py-10 border-2 border-brand-100
                       hover:border-brand-400 hover:shadow-md hover:shadow-brand-100
                       transition-all duration-200 cursor-pointer no-underline">
            <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-200">
              <CirclePlus size={28} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{t('dashboard.quickRent')}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('rent.scanCustomer')}</p>
            </div>
          </Link>

          <Link to="/staff/return"
            className="card flex flex-col items-center gap-3 py-10 border-2 border-gray-100
                       hover:border-gray-300 hover:shadow-md
                       transition-all duration-200 cursor-pointer no-underline">
            <div className="h-14 w-14 rounded-2xl bg-gray-800 flex items-center justify-center shadow-md shadow-gray-200">
              <Undo2 size={26} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{t('dashboard.quickReturn')}</p>
              <p className="text-sm text-gray-500 mt-0.5">{t('return.scanRacket')}</p>
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
