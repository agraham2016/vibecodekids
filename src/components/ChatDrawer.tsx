import { useRef, useCallback, useEffect } from 'react'
import { Message } from '../types'
import ChatPanel from './ChatPanel'
import './ChatDrawer.css'

type DrawerState = 'minimized' | 'half' | 'full'

interface ChatDrawerProps {
  messages: Message[]
  onSendMessage: (content: string, image?: string) => void
  isLoading: boolean
  mode: 'plan' | 'vibe'
  onModeChange: (mode: 'plan' | 'vibe') => void
  drawerState: DrawerState
  onDrawerStateChange: (state: DrawerState) => void
}

// Height values for each state
const DRAWER_HEIGHTS = {
  minimized: 100,
  half: 380,
  full: window.innerHeight * 0.85
}

export default function ChatDrawer({
  messages,
  onSendMessage,
  isLoading,
  mode,
  onModeChange,
  drawerState,
  onDrawerStateChange
}: ChatDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number>(0)
  const dragStartHeight = useRef<number>(0)
  const isDragging = useRef<boolean>(false)
  
  // Get current height based on state
  const getHeight = useCallback(() => {
    return DRAWER_HEIGHTS[drawerState]
  }, [drawerState])
  
  // Handle drag start
  const handleDragStart = useCallback((clientY: number) => {
    isDragging.current = true
    dragStartY.current = clientY
    dragStartHeight.current = getHeight()
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }, [getHeight])
  
  // Handle drag move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging.current || !drawerRef.current) return
    
    const deltaY = dragStartY.current - clientY
    const newHeight = Math.max(80, Math.min(window.innerHeight * 0.9, dragStartHeight.current + deltaY))
    
    drawerRef.current.style.height = `${newHeight}px`
  }, [])
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging.current || !drawerRef.current) return
    
    isDragging.current = false
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    
    const currentHeight = drawerRef.current.offsetHeight
    
    // Snap to closest state
    if (currentHeight < 150) {
      onDrawerStateChange('minimized')
    } else if (currentHeight < window.innerHeight * 0.5) {
      onDrawerStateChange('half')
    } else {
      onDrawerStateChange('full')
    }
    
    // Reset inline style to let CSS handle it
    drawerRef.current.style.height = ''
  }, [onDrawerStateChange])
  
  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleDragStart(e.clientY)
  }, [handleDragStart])
  
  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY)
  }, [handleDragStart])
  
  // Global mouse/touch move and end
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientY)
    const handleMouseUp = () => handleDragEnd()
    const handleTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientY)
    const handleTouchEnd = () => handleDragEnd()
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleDragMove, handleDragEnd])
  
  // Cycle through states on handle click
  const handleHandleClick = useCallback(() => {
    const states: DrawerState[] = ['minimized', 'half', 'full']
    const currentIndex = states.indexOf(drawerState)
    const nextIndex = (currentIndex + 1) % states.length
    onDrawerStateChange(states[nextIndex])
  }, [drawerState, onDrawerStateChange])
  
  return (
    <div 
      ref={drawerRef}
      className={`chat-drawer drawer-${drawerState} ${mode === 'plan' ? 'plan-mode-active' : ''}`}
    >
      {/* Plan Mode Warning Banner */}
      {mode === 'plan' && drawerState !== 'minimized' && (
        <div className="plan-mode-banner">
          <span className="banner-icon">📝</span>
          <span className="banner-text">
            <strong>Planning Mode</strong> - I'm helping you brainstorm! Nothing will be built yet.
          </span>
          <button 
            className="switch-to-vibe-btn"
            onClick={() => onModeChange('vibe')}
          >
            Switch to Build Mode 🚀
          </button>
        </div>
      )}
      
      {/* Drag Handle */}
      <div 
        className="drawer-handle"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleHandleClick}
      >
        <div className="handle-pill"></div>
        <div className="handle-label">
          {drawerState === 'minimized' 
            ? (mode === 'plan' ? '📝 Planning Mode (not building)' : '💬 Chat with AI') 
            : mode === 'plan' 
              ? '📝 Planning (not building yet)' 
              : '🚀 Building Mode'}
        </div>
        <div className="handle-buttons">
          <button 
            className={`mode-toggle-btn ${mode === 'plan' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onModeChange('plan'); }}
            title="Plan Mode - Brainstorm ideas without building"
          >
            📝
          </button>
          <button 
            className={`mode-toggle-btn ${mode === 'vibe' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onModeChange('vibe'); }}
            title="Vibe Mode - Build your game!"
          >
            🚀
          </button>
        </div>
      </div>
      
      {/* Chat Content */}
      <div className="drawer-content">
        <ChatPanel
          messages={messages}
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          mode={mode}
          onModeChange={onModeChange}
          isInDrawer={true}
        />
      </div>
    </div>
  )
}
