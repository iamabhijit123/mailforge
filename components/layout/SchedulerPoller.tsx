'use client'

import { useEffect } from 'react'

export function SchedulerPoller() {
  useEffect(() => {
    async function run() {
      try { await fetch('/api/scheduler/run', { method: 'POST' }) } catch {}
    }
    run()
    const interval = setInterval(run, 60_000)
    return () => clearInterval(interval)
  }, [])
  return null
}
