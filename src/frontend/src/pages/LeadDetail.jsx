import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'

export default function LeadDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('new')

  useEffect(() => {
    fetchLead()
  }, [id])

  const fetchLead = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setLead(data)
      setNotes(data.notes || '')
      setStatus(data.status)
    } catch (error) {
      console.error('Error fetching lead:', error)
      alert('Failed to load lead')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('leads')
        .update({ notes, status })
        .eq('id', id)

      if (error) throw error

      alert('Lead updated successfully')
      fetchLead()
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkContacted = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'contacted',
          contacted_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      alert('Marked as contacted!')
      fetchLead()
    } catch (error) {
      console.error('Error marking contacted:', error)
      alert('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  const getTagColor = (tag) => {
    const colors = {
      hot: 'bg-red-100 text-red-800',
      warm: 'bg-yellow-100 text-yellow-800',
      cold: 'bg-blue-100 text-blue-800',
      error: 'bg-gray-100 text-gray-800'
    }
    return colors[tag] || 'bg-gray-100 text-gray-800'
  }

  const getTagIcon = (tag) => {
    const icons = {
      hot: '🔥',
      warm: '🟡',
      cold: '❄️',
      error: '⚠️'
    }
    return icons[tag] || '📄'
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

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header session={session} />
        <div className="max-w-4xl mx-auto py-12 text-center">
          <p className="text-gray-600">Lead not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} />
      
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 text-blue-600 hover:text-blue-700 flex items-center"
        >
          ← Back to Dashboard
        </button>

        {/* Lead Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getTagColor(lead.ai_tag)}`}>
                  {getTagIcon(lead.ai_tag)} {lead.ai_tag?.toUpperCase()}
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  {lead.intent_score}/10
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {lead.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>👤 u/{lead.author}</span>
                <span>📍 r/{lead.subreddit}</span>
                <span>📅 {new Date(lead.posted_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            View original post →
          </a>
        </div>

        {/* Post Content */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Post Content</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{lead.content || lead.title}</p>
        </div>

        {/* AI Analysis */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Business Type</p>
              <p className="font-semibold">{lead.business_type || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Location</p>
              <p className="font-semibold">{lead.location || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Urgency</p>
              <p className="font-semibold capitalize">{lead.urgency || 'Unknown'}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Reasoning</p>
            <p className="text-gray-700">{lead.reasoning || 'No analysis available'}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Suggested Outreach</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2">{lead.outreach_message || 'No suggestion available'}</p>
              <button
                onClick={() => copyToClipboard(lead.outreach_message)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                📋 Copy to clipboard
              </button>
            </div>
          </div>
        </div>

        {/* CRM Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">CRM Actions</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add your notes here..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              
              {status !== 'contacted' && (
                <button
                  onClick={handleMarkContacted}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Mark as Contacted
                </button>
              )}
            </div>

            {lead.contacted_at && (
              <p className="text-sm text-gray-600">
                Contacted: {new Date(lead.contacted_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
