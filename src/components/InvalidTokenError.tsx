import React from 'react'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface InvalidTokenErrorProps {
  token?: string
  onRetry?: () => void
}

const InvalidTokenError: React.FC<InvalidTokenErrorProps> = ({ token, onRetry }) => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Invalid Project Token
        </h2>
        
        <p className="text-gray-600 mb-6">
          {token ? (
            <>
              The project token <code className="bg-gray-100 px-2 py-1 rounded text-sm">{token.substring(0, 8)}...</code> is invalid or you don't have permission to access it.
            </>
          ) : (
            'No project token provided. Please select a conversation from your inbox.'
          )}
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/inbox')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Inbox
          </button>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  )
}

export default InvalidTokenError 