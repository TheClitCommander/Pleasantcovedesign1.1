import React from 'react'
import { FileText, Calendar } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
}

interface ClientNoteProps {
  note: Note
}

const ClientNote: React.FC<ClientNoteProps> = ({ note }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <FileText className="h-4 w-4 text-primary-500 mr-2" />
          <h4 className="font-medium text-foreground">{note.title}</h4>
        </div>
        <div className="flex items-center text-xs text-muted">
          <Calendar className="h-3 w-3 mr-1" />
          {formatDate(note.createdAt)}
        </div>
      </div>
      
      <p className="text-sm text-muted leading-relaxed">{note.content}</p>
      
      <div className="mt-3 flex justify-end space-x-2">
        <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
          Edit
        </button>
        <button className="text-xs text-error hover:text-red-700 font-medium">
          Delete
        </button>
      </div>
    </div>
  )
}

export default ClientNote 