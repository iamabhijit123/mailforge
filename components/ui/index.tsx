'use client'

import { cn } from '@/lib/utils'
import React, { forwardRef } from 'react'
import { TIMEZONE_OPTIONS } from '@/lib/timezones'

// ─── Button ────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-sm',
      secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 focus:ring-gray-300',
      ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
      outline: 'border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:ring-blue-500 shadow-sm',
    }
    const sizes = { sm: 'px-3 py-1.5 text-sm gap-1.5', md: 'px-4 py-2.5 text-sm gap-2', lg: 'px-6 py-3 text-base gap-2.5' }
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
        {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ─── Input ─────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all',
            'focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-500/20 bg-red-50',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ─── Textarea ──────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all resize-y',
            'focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ─── Select ────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">{label}</label>}
        <select
          id={inputId}
          ref={ref}
          className={cn(
            'block w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 transition-all',
            'focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
            error && 'border-red-400',
            className
          )}
          {...props}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ─── Badge ─────────────────────────────────────────────────────────────────
interface BadgeProps { variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode; className?: string }
export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}>
      {children}
    </span>
  )
}

// ─── Card ──────────────────────────────────────────────────────────────────
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-white rounded-xl border border-gray-200 shadow-card', className)} {...props}>{children}</div>
}
export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4 border-b border-gray-100', className)} {...props}>{children}</div>
}
export function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props}>{children}</div>
}

// ─── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-2xl w-full', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-lg leading-none">&times;</button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Table ─────────────────────────────────────────────────────────────────
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('min-w-full divide-y divide-gray-100', className)}>{children}</table>
    </div>
  )
}
export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50', className)}>{children}</th>
}
export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-sm text-gray-700', className)}>{children}</td>
}

// ─── Tabs ──────────────────────────────────────────────────────────────────
interface TabsProps { tabs: string[]; active: string; onChange: (tab: string) => void }
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="flex gap-0.5 border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all',
            active === tab
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

// ─── Toast ─────────────────────────────────────────────────────────────────
interface ToastProps { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }
export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const styles = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-gray-900 text-white',
  }
  React.useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={cn(
      'fixed bottom-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-dropdown max-w-sm animate-in slide-in-from-bottom-2',
      styles[type]
    )}>
      <span className="text-sm font-medium leading-snug">{message}</span>
      <button onClick={onClose} className="ml-auto text-xl leading-none opacity-70 hover:opacity-100 flex-shrink-0">&times;</button>
    </div>
  )
}

// ─── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin', className)} />
}

// ─── Empty State ───────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="text-gray-300 mb-5 w-16 h-16">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  )
}

// ─── Schedule Date Time Picker ─────────────────────────────────────────────

function localToUTC(localDatetime: string, ianaTimezone: string): string {
  if (!localDatetime) return ''
  const dtStr = localDatetime.length === 16 ? localDatetime + ':00' : localDatetime
  const guess = new Date(dtStr + 'Z')
  const guessInTz = new Intl.DateTimeFormat('sv-SE', {
    timeZone: ianaTimezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(guess)
  const offset = guess.getTime() - new Date(guessInTz.replace(' ', 'T') + 'Z').getTime()
  return new Date(guess.getTime() + offset).toISOString()
}

function getNowInTz(ianaTimezone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: ianaTimezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date()).replace(' ', 'T')
}

function getDetectedTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'UTC' }
}

interface ScheduleDateTimePickerProps {
  onChange: (utcIso: string) => void
  label?: string
  compact?: boolean
}

export function ScheduleDateTimePicker({ onChange, label, compact = false }: ScheduleDateTimePickerProps) {
  const detectedIana = getDetectedTimezone()
  const [localDt, setLocalDt] = React.useState('')
  const [timezone, setTimezone] = React.useState<string>(() => {
    return TIMEZONE_OPTIONS.find(t => t.iana === detectedIana)?.iana || 'UTC'
  })

  // If detected tz isn't in our list, add it as a custom entry
  const tzOptions = TIMEZONE_OPTIONS.find(t => t.iana === detectedIana)
    ? TIMEZONE_OPTIONS
    : [{ label: `Local – ${detectedIana}`, iana: detectedIana }, ...TIMEZONE_OPTIONS]

  function handleDateChange(val: string) {
    setLocalDt(val)
    onChange(localToUTC(val, timezone))
  }

  function handleTzChange(val: string) {
    setTimezone(val)
    onChange(localToUTC(localDt, val))
  }

  const inputClass = cn(
    'w-full border border-gray-200 rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-900',
    'focus:bg-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  )

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>}
      <input
        type="datetime-local"
        className={inputClass}
        value={localDt}
        min={getNowInTz(timezone)}
        onChange={e => handleDateChange(e.target.value)}
      />
      <select
        className={cn(inputClass, 'cursor-pointer')}
        value={timezone}
        onChange={e => handleTzChange(e.target.value)}
      >
        {tzOptions.map(tz => (
          <option key={tz.iana} value={tz.iana}>{compact ? tz.label.split(' – ')[0] + ' – ' + tz.label.split(' – ')[1]?.split('(')[0].trim() : tz.label}</option>
        ))}
      </select>
      {localDt && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
          Sends {new Date(localToUTC(localDt, timezone)).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC
        </p>
      )}
    </div>
  )
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon, color = 'blue' }: { label: string; value: string | number; sub?: string; icon?: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-card p-5 flex items-start gap-4">
      {icon && <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors[color] || colors.blue)}>{icon}</div>}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}
