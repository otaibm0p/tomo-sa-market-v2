import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageLightboxProps {
  images: Array<{ id?: number | null; url: string; is_primary?: boolean }>
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export const ImageLightbox = ({ images, initialIndex = 0, isOpen, onClose }: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }, [initialIndex, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom((prev) => Math.max(0.5, Math.min(3, prev + delta)))
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (zoom > 1) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left - rect.width / 2) * (zoom - 1)
      const y = (e.clientY - rect.top - rect.height / 2) * (zoom - 1)
      setPosition({ x, y })
    }
  }

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentIndex]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2 transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePrev()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-3 transition-colors"
              aria-label="Previous"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-3 transition-colors"
              aria-label="Next"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white bg-black/50 rounded-full px-4 py-2 text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-full px-4 py-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setZoom((prev) => Math.max(0.5, prev - 0.25))
            }}
            className="text-white hover:text-gray-300"
            aria-label="Zoom out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <span className="text-white text-sm min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setZoom((prev) => Math.min(3, prev + 0.25))
            }}
            className="text-white hover:text-gray-300"
            aria-label="Zoom in"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
        </div>

        {/* Image container */}
        <div
          className="relative max-w-[90vw] max-h-[90vh] overflow-hidden cursor-move"
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
        >
          <motion.img
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            src={currentImage.url}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transition: zoom === 1 ? 'transform 0.3s' : 'none',
            }}
            draggable={false}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = 'https://placehold.co/800x800/f3f4f6/9ca3af?text=No+Image'
            }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

