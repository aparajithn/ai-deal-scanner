import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'

export default function Settings({ session }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState(null)
  const [subreddits, setSubreddits] = useState('')
  const [keywords, setKeywords] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [scanInterval, setScanInterval] = useState(6)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('scan_configs')
        .select('*')
        .single()

      if (error) {
        // If no config exists, create default
        if (error.code === 'PGRST116') {
          await createDefaultConfig()
        } else {
          throw error
        }
      } else {
        setConfig(data)
        setSubreddits(data.subreddits?.join(', ') || '')
        setKeywords(data.keywords?.join(', ') || '')
        setEnabled(data.enabled)
        setScanInterval(data.scan_interval_hours || 6)
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      alert('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const createDefaultConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_configs')
        .insert({
          user_id: session.user.id,
          subreddits: ['smallbusiness', 'Entrepreneur'],
          keywords: ['tired of', 'selling business', 'want out', 'looking to exit'],
          enabled: true,
          scan_interval_hours: 6
        })
        .select()
        .single()

      if (error) throw error

      setConfig(data)
      setSubreddits(data.subreddits.join(', '))
      setKeywords(data.keywords.join(', '))
      setEnabled(data.enabled)
      setScanInterval(data.scan_interval_hours)
    } catch (error) {
      console.error('Error creating default config:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Parse comma-separated strings to arrays
      const subredditsArray = subreddits
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      
      const keywordsArray = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)

      const { error } = await supabase
        .from('scan_configs')
        .update({
          subreddits: subredditsArray,
          keywords: keywordsArray,
          enabled,
          scan_interval_hours: scanInterval
        })
        .eq('user_id', session.user.id)

      if (error) throw error

      alert('Settings saved successfully!')
      fetchConfig()
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header session={session} />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Scan Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Scan Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable automatic scanning
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subreddits (comma-separated)
              </label>
              <input
                type="text"
                value={subreddits}
                onChange={(e) => setSubreddits(e.target.value)}
                placeholder="e.g., smallbusiness, Entrepreneur, SaaS"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter subreddit names without "r/" prefix
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords (comma-separated)
              </label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={3}
                placeholder="e.g., tired of, selling business, want out, looking to exit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Posts matching these keywords will be captured
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scan Interval
              </label>
              <select
                value={scanInterval}
                onChange={(e) => setScanInterval(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <p className="text-gray-900">{session.user.email}</p>
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  navigate('/login')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
