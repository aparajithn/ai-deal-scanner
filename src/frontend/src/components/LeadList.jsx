export default function LeadList({ leads, onLeadClick }) {
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

  const getStatusBadge = (status) => {
    const badges = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-green-100 text-green-800',
      interested: 'bg-purple-100 text-purple-800',
      not_interested: 'bg-gray-100 text-gray-800',
      closed: 'bg-gray-200 text-gray-600'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <p className="text-gray-600">No leads found</p>
        <p className="text-sm text-gray-500 mt-2">
          Adjust your filters or wait for the next scan
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Business Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onLeadClick(lead.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTagColor(lead.ai_tag)}`}>
                      {getTagIcon(lead.ai_tag)}
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {lead.intent_score || '-'}/10
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 line-clamp-1">
                    {lead.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    r/{lead.subreddit} • u/{lead.author}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {lead.business_type || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {lead.location || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(lead.status)}`}>
                    {lead.status?.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
