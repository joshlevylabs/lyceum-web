import { useEffect, useRef, useCallback, useState } from 'react'

export interface WorkerMessage {
  id: string
  type: 'downsample' | 'aggregate' | 'statistics' | 'optimize' | 'clear_cache'
  data?: any
}

export interface WorkerResponse {
  id: string
  type: string
  success: boolean
  result?: any
  error?: string
}

export interface ChartWorkerState {
  isReady: boolean
  isProcessing: boolean
  error: string | null
  lastProcessingTime: number
}

/**
 * Custom hook for managing chart data processing Web Worker
 * Provides high-performance data processing for manufacturing charts
 */
export function useChartWorker() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRequests = useRef<Map<string, {
    resolve: (result: any) => void
    reject: (error: any) => void
    timestamp: number
  }>>(new Map())
  
  const [state, setState] = useState<ChartWorkerState>({
    isReady: false,
    isProcessing: false,
    error: null,
    lastProcessingTime: 0
  })

  // Initialize Web Worker
  useEffect(() => {
    try {
      // Create worker from public directory
      workerRef.current = new Worker('/workers/chart-processor.js')
      
      // Handle worker messages
      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, success, result, error } = e.data
        const request = pendingRequests.current.get(id)
        
        if (request) {
          const processingTime = Date.now() - request.timestamp
          
          setState(prev => ({
            ...prev,
            isProcessing: pendingRequests.current.size > 1,
            lastProcessingTime: processingTime,
            error: success ? null : error || 'Unknown worker error'
          }))
          
          if (success) {
            request.resolve(result)
          } else {
            request.reject(new Error(error || 'Worker processing failed'))
          }
          
          pendingRequests.current.delete(id)
        }
      }
      
      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('Chart worker error:', error)
        setState(prev => ({
          ...prev,
          error: 'Worker initialization failed',
          isReady: false
        }))
      }
      
      // Mark worker as ready
      setState(prev => ({
        ...prev,
        isReady: true,
        error: null
      }))
      
    } catch (error) {
      console.error('Failed to create chart worker:', error)
      setState(prev => ({
        ...prev,
        error: 'Web Worker not supported or failed to initialize',
        isReady: false
      }))
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      pendingRequests.current.clear()
    }
  }, [])

  // Send message to worker with promise-based response
  const sendMessage = useCallback((type: WorkerMessage['type'], data?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !state.isReady) {
        reject(new Error('Worker not ready'))
        return
      }

      const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Store promise handlers
      pendingRequests.current.set(id, {
        resolve,
        reject,
        timestamp: Date.now()
      })
      
      // Update processing state
      setState(prev => ({
        ...prev,
        isProcessing: true
      }))
      
      // Send message to worker
      workerRef.current.postMessage({ id, type, data })
      
      // Timeout after 30 seconds
      setTimeout(() => {
        const request = pendingRequests.current.get(id)
        if (request) {
          pendingRequests.current.delete(id)
          setState(prev => ({
            ...prev,
            isProcessing: pendingRequests.current.size > 0,
            error: 'Worker request timeout'
          }))
          reject(new Error('Worker request timeout'))
        }
      }, 30000)
    })
  }, [state.isReady])

  // Specific processing functions
  const downsampleCurves = useCallback(async (
    curves: any[], 
    viewport: any, 
    targetPoints: number = 1000
  ) => {
    return sendMessage('downsample', { curves, viewport, targetPoints })
  }, [sendMessage])

  const aggregateData = useCallback(async (
    curves: any[], 
    timeWindow: any, 
    aggregationType: 'average' | 'max' | 'min' = 'average'
  ) => {
    return sendMessage('aggregate', { curves, timeWindow, aggregationType })
  }, [sendMessage])

  const calculateStatistics = useCallback(async (curves: any[]) => {
    return sendMessage('statistics', { curves })
  }, [sendMessage])

  const getOptimizationSuggestions = useCallback(async (
    curves: any[], 
    performance: any
  ) => {
    return sendMessage('optimize', { curves, performance })
  }, [sendMessage])

  const clearCache = useCallback(async () => {
    return sendMessage('clear_cache')
  }, [sendMessage])

  // Batch processing for multiple operations
  const batchProcess = useCallback(async (operations: Array<{
    type: WorkerMessage['type']
    data?: any
  }>) => {
    const results = await Promise.allSettled(
      operations.map(op => sendMessage(op.type, op.data))
    )
    
    return results.map((result, index) => ({
      operation: operations[index],
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? result.reason.message : undefined
    }))
  }, [sendMessage])

  // Performance monitoring
  const getWorkerStats = useCallback(() => {
    return {
      isReady: state.isReady,
      isProcessing: state.isProcessing,
      pendingRequests: pendingRequests.current.size,
      lastProcessingTime: state.lastProcessingTime,
      error: state.error
    }
  }, [state])

  // Memory management
  const cleanup = useCallback(async () => {
    try {
      await clearCache()
      pendingRequests.current.clear()
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: null
      }))
    } catch (error) {
      console.warn('Worker cleanup failed:', error)
    }
  }, [clearCache])

  return {
    // State
    isReady: state.isReady,
    isProcessing: state.isProcessing,
    error: state.error,
    
    // Processing functions
    downsampleCurves,
    aggregateData,
    calculateStatistics,
    getOptimizationSuggestions,
    
    // Utilities
    batchProcess,
    clearCache,
    cleanup,
    getWorkerStats,
    
    // Raw message sender for custom operations
    sendMessage
  }
}
