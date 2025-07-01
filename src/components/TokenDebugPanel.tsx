import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

interface TokenDebugPanelProps {
  projectToken?: string
  connectionStatus?: string
  currentRoom?: string
}

const TokenDebugPanel: React.FC<TokenDebugPanelProps> = ({ 
  projectToken: propToken, 
  connectionStatus, 
  currentRoom 
}) => {
  const { projectToken: urlToken } = useParams<{ projectToken?: string }>()
  const [widgetToken, setWidgetToken] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    // Check localStorage for widget token
    const storedToken = localStorage.getItem('pcd_project_token')
    setWidgetToken(storedToken)

    // Listen for storage changes (in case widget updates it)
    const handleStorageChange = () => {
      const newToken = localStorage.getItem('pcd_project_token')
      setWidgetToken(newToken)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
      >
        Show Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">Token Debug Panel</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <span className="text-gray-400">URL Token:</span>
          <div className="text-green-400 break-all">{urlToken || 'none'}</div>
        </div>
        
        <div>
          <span className="text-gray-400">Widget Token (localStorage):</span>
          <div className="text-blue-400 break-all">{widgetToken || 'none'}</div>
        </div>
        
        <div>
          <span className="text-gray-400">Prop Token:</span>
          <div className="text-yellow-400 break-all">{propToken || 'none'}</div>
        </div>
        
        <div>
          <span className="text-gray-400">Current Room:</span>
          <div className="text-purple-400">{currentRoom || 'none'}</div>
        </div>
        
        <div>
          <span className="text-gray-400">Connection:</span>
          <div className={connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'}>
            {connectionStatus || 'unknown'}
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <div className={urlToken === widgetToken ? 'text-green-400' : 'text-red-400'}>
            {urlToken === widgetToken ? '✓ Tokens Match' : '✗ Token Mismatch!'}
          </div>
        </div>
        
        <div className="pt-2">
          <button
            onClick={() => {
              if (widgetToken) {
                window.location.href = `/inbox/${widgetToken}`
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs w-full"
            disabled={!widgetToken}
          >
            Go to Widget Token
          </button>
        </div>
      </div>
    </div>
  )
}

export default TokenDebugPanel 