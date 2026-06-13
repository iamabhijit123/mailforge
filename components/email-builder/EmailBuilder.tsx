'use client'

import { useState, useCallback } from 'react'
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { EmailBlock, generateEmailHtml } from '@/lib/email-html'
import { BlockPalette } from './BlockPalette'
import { BlockCanvas } from './BlockCanvas'
import { BlockSettings } from './BlockSettings'
import { Tabs } from '@/components/ui'
import { Eye, AlertCircle, RotateCcw } from 'lucide-react'

interface EmailBuilderProps {
  blocks: EmailBlock[]
  initialHtml?: string
  onChange: (blocks: EmailBlock[], html: string) => void
}

export function EmailBuilder({ blocks, initialHtml, onChange }: EmailBuilderProps) {
  const [activeTab, setActiveTab] = useState('Visual')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [htmlSource, setHtmlSource] = useState(() => initialHtml || generateEmailHtml(blocks))
  const [htmlCustomized, setHtmlCustomized] = useState(() => {
    if (!initialHtml) return false
    return initialHtml !== generateEmailHtml(blocks)
  })

  function resetToVisual() {
    const html = generateEmailHtml(blocks)
    setHtmlSource(html)
    setHtmlCustomized(false)
    onChange(blocks, html)
  }

  const update = useCallback((newBlocks: EmailBlock[]) => {
    const html = generateEmailHtml(newBlocks)
    setHtmlSource(html)
    setHtmlCustomized(false)
    onChange(newBlocks, html)
  }, [onChange])

  function handleDragStart(e: DragStartEvent) {
    setDraggingId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const isNewBlock = !blocks.find(b => b.id === active.id)
    if (isNewBlock) {
      const blockType = active.id as string
      const newBlock: EmailBlock = {
        id: crypto.randomUUID(),
        type: blockType as EmailBlock['type'],
        props: getDefaultProps(blockType as EmailBlock['type']),
      }
      const overIndex = blocks.findIndex(b => b.id === over.id)
      const newBlocks = [...blocks]
      newBlocks.splice(overIndex >= 0 ? overIndex + 1 : newBlocks.length, 0, newBlock)
      update(newBlocks)
      setSelectedId(newBlock.id)
    } else {
      const oldIndex = blocks.findIndex(b => b.id === active.id)
      const newIndex = blocks.findIndex(b => b.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) update(arrayMove(blocks, oldIndex, newIndex))
    }
  }

  function addBlock(type: EmailBlock['type']) {
    const newBlock: EmailBlock = { id: crypto.randomUUID(), type, props: getDefaultProps(type) }
    const newBlocks = [...blocks, newBlock]
    update(newBlocks)
    setSelectedId(newBlock.id)
  }

  function updateBlock(id: string, props: Record<string, unknown>) {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, props: { ...b.props, ...props } } : b)
    update(newBlocks)
  }

  function deleteBlock(id: string) {
    const newBlocks = blocks.filter(b => b.id !== id)
    update(newBlocks)
    if (selectedId === id) setSelectedId(null)
  }

  function duplicateBlock(id: string) {
    const block = blocks.find(b => b.id === id)
    if (!block) return
    const copy = { ...block, id: crypto.randomUUID() }
    const idx = blocks.findIndex(b => b.id === id)
    const newBlocks = [...blocks]
    newBlocks.splice(idx + 1, 0, copy)
    update(newBlocks)
    setSelectedId(copy.id)
  }

  const selectedBlock = blocks.find(b => b.id === selectedId) || null

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-2 border-b border-gray-200">
        <Tabs tabs={['Visual', 'HTML']} active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'Visual' ? (
        htmlCustomized ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700 flex-1">Custom HTML mode — showing live preview. Use the HTML tab to edit.</span>
              <button
                onClick={resetToVisual}
                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium border border-amber-300 rounded px-2 py-0.5 hover:bg-amber-100"
              >
                <RotateCcw className="w-3 h-3" /> Reset to Visual Builder
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <iframe
                srcDoc={htmlSource}
                title="Email Preview"
                className="w-full max-w-2xl mx-auto block border-0 bg-white shadow-sm rounded"
                style={{ minHeight: 600 }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-1 overflow-hidden">
              <BlockPalette onAdd={addBlock} />

              <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
                <div className="max-w-2xl mx-auto">
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <BlockCanvas
                      blocks={blocks}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onDelete={deleteBlock}
                      onDuplicate={duplicateBlock}
                    />
                  </SortableContext>
                  {blocks.length === 0 && (
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400">
                      <p className="text-sm">Drag blocks from the left panel or click to add them</p>
                    </div>
                  )}
                </div>
              </div>

              <BlockSettings block={selectedBlock} onChange={(props) => selectedId && updateBlock(selectedId, props)} />
            </div>
            <DragOverlay>{draggingId && <div className="bg-white shadow-lg rounded p-3 text-sm text-gray-600 opacity-80">Moving block…</div>}</DragOverlay>
          </DndContext>
        )
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b text-xs text-gray-500">
            <Eye className="w-3.5 h-3.5" />
            Edit HTML on the left — live preview updates on the right.
          </div>
          <div className="flex-1 flex overflow-hidden">
            <textarea
              className="w-1/2 p-4 font-mono text-xs text-gray-800 bg-white resize-none focus:outline-none border-r border-gray-200"
              value={htmlSource}
              onChange={e => {
                setHtmlSource(e.target.value)
                setHtmlCustomized(true)
                onChange(blocks, e.target.value)
              }}
              spellCheck={false}
            />
            <div className="w-1/2 bg-gray-100 overflow-auto">
              <iframe
                srcDoc={htmlSource}
                title="Email Preview"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getDefaultProps(type: EmailBlock['type']): Record<string, unknown> {
  const defaults: Record<EmailBlock['type'], Record<string, unknown>> = {
    header: { title: 'Your Company', backgroundColor: '#2563eb', color: '#ffffff', align: 'center' },
    text: { content: '<p>Your text here. Click to edit.</p>', padding: '20px 30px', fontSize: '16px', color: '#333333', align: 'left' },
    image: { src: '', alt: '', align: 'center', padding: '20px 30px' },
    button: { text: 'Click Here', url: '#', backgroundColor: '#2563eb', color: '#ffffff', align: 'center', padding: '20px 30px', borderRadius: '4px' },
    divider: { color: '#e5e7eb', padding: '10px 30px', thickness: '1px' },
    spacer: { height: '30px' },
    columns: { leftContent: '<p>Left column content</p>', rightContent: '<p>Right column content</p>', padding: '20px 30px', color: '#333333', fontSize: '16px' },
    social: { links: [], align: 'center', padding: '20px 30px' },
    footer: { text: 'Company Name · 123 Main St, City, ST 12345', unsubscribeText: 'Unsubscribe', backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '12px' },
  }
  return defaults[type] || {}
}
