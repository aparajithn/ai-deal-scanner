import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Header({ session }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-blue-600">
              AI Deal Scanner
            </h1>
            
            <nav className="hidden md:flex space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/settings')}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive('/settings')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden sm:block">
              {session?.user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
