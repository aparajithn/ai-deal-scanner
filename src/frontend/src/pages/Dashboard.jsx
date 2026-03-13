import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import StatsCard from '../components/StatsCard'
import LeadList from '../components/LeadList'

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [filteredLeads, setFilteredLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    hot: 0,
    warm: 0,
    contacted: 0
  })
  
  // Filters
  const [tagFilter, setTagFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLeads()
  }, [])

  useEffect(() => {
    // Apply filters
    let filtered = leads

    if (tagFilter !== 'all') {
      filtered = filtered.filter(lead => lead.ai_tag === tagFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(lead =>
        lead.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.content && lead.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setFilteredLeads(filtered)
  }, [leads, tagFilter, statusFilter, searchQuery])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setLeads(data || [])
      
      // Calculate stats
      const stats = {
        total: data.length,
        hot: data.filter(l => l.ai_tag === 'hot').length,
        warm: data.filter(l => l.ai_tag === 'warm').length,
        contacted: data.filter(l => l.status === 'contacted').length
      }
      setStats(stats)
      
    } catch (error) {
      console.error('Error fetching leads:', error)
      alert('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const handleLeadClick = (leadId) => {
    navigate(`/leads/${leadId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Leads" value={stats.total} icon="📊" />
          <StatsCard title="Hot Leads" value={stats.hot} icon="🔥" color="text-red-600" />
          <StatsCard title="Warm Leads" value={stats.warm} icon="🟡" color="text-yellow-600" />
          <StatsCard title="Contacted" value={stats.contacted} icon="📧" color="text-blue-600" />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search leads..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tag
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="all">All Tags</option>
                <option value="hot">🔥 Hot</option>
                <option value="warm">🟡 Warm</option>
                <option value="cold">❄️ Cold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not Interested</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchLeads}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Lead List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <LeadList leads={filteredLeads} onLeadClick={handleLeadClick} />
        )}
      </main>
    </div>
  )
}
