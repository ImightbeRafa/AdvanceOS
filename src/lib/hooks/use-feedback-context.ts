'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import type { FeedbackContext } from '@/types'

const MAX_TRAIL_LENGTH = 8

const navTrail: string[] = []

function getBrowserInfo(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (ua.includes('Firefox/')) return `Firefox ${ua.split('Firefox/')[1]?.split(' ')[0]}`
  if (ua.includes('Edg/')) return `Edge ${ua.split('Edg/')[1]?.split(' ')[0]}`
  if (ua.includes('Chrome/')) return `Chrome ${ua.split('Chrome/')[1]?.split(' ')[0]}`
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return `Safari ${ua.split('Version/')[1]?.split(' ')[0] ?? ''}`
  return ua.substring(0, 80)
}

function getScreenInfo(): string {
  if (typeof window === 'undefined') return 'unknown'
  return `${window.innerWidth}x${window.innerHeight}`
}

export function useFeedbackContext() {
  const pathname = usePathname()
  const lastPathname = useRef(pathname)

  useEffect(() => {
    if (pathname !== lastPathname.current) {
      navTrail.push(lastPathname.current)
      if (navTrail.length > MAX_TRAIL_LENGTH) navTrail.shift()
      lastPathname.current = pathname
    }
  }, [pathname])

  const captureContext = useCallback((): FeedbackContext => {
    return {
      page_url: pathname,
      page_title: typeof document !== 'undefined' ? document.title : '',
      nav_trail: [...navTrail],
      browser: getBrowserInfo(),
      screen: getScreenInfo(),
      timestamp: new Date().toISOString(),
    }
  }, [pathname])

  return { captureContext }
}
