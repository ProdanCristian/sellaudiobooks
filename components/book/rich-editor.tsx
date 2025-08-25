"use client"

import { useEffect, useMemo, useRef, useState, useCallback, type MouseEvent } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Mark } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { HardBreak } from '@tiptap/extension-hard-break'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Undo, Redo, Heading1, Heading2 } from 'lucide-react'


interface RichEditorProps {
    value: string
    onChange: (html: string) => void
    onSave?: () => void
    isSaving?: boolean
    className?: string
    autoSave?: boolean // Enable auto-save on blur
}

// Minimal Markdown -> HTML conversion for headings, bold/italic, hr, lists, blockquote, inline code, links and paragraphs
function markdownToHtmlBasic(md: string): string {
    if (!md) return ''
    let text = md.replace(/\r\n/g, '\n')

    // Code blocks (fenced)
    const codeBlocks: string[] = []
    text = text.replace(/```([\s\S]*?)```/g, (_m, code) => {
        const idx = codeBlocks.push(`<pre><code>${escapeHtml(code)}</code></pre>`) - 1
        return `{{CODE_BLOCK_${idx}}}`
    })

    // Horizontal rule --- on its own line
    text = text.replace(/^\s*---\s*$/gm, '<hr />')

    // Blockquotes
    text = text.replace(/^(>\s?.+)$/gm, (_m, line) => `<blockquote><p>${line.replace(/^>\s?/, '')}</p></blockquote>`)

    // Ordered lists
    text = text.replace(/(?:^|\n)(\d+\.\s+.*(?:\n\d+\.\s+.*)*)/g, (_m, block) => {
        const items = block
            .split('\n')
            .map((l: string) => l.trim())
            .filter(Boolean)
            .map((l: string) => l.replace(/^\d+\.\s+/, ''))
            .map((i: string) => `<li>${i}</li>`)
            .join('')
        return `\n<ol>${items}</ol>`
    })

    // Unordered lists
    text = text.replace(/(?:^|\n)([-*]\s+.*(?:\n[-*]\s+.*)*)/g, (_m, block) => {
        const items = block
            .split('\n')
            .map((l: string) => l.trim())
            .filter(Boolean)
            .map((l: string) => l.replace(/^[-*]\s+/, ''))
            .map((i: string) => `<li>${i}</li>`)
            .join('')
        return `\n<ul>${items}</ul>`
    })

    // Bold/Italic
    text = text.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>')
    text = text.replace(/(^|[^*_])(\*|_)([^*_].*?)\2/g, '$1<em>$3</em>')

    // Inline code
    text = text.replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`)

    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

    // Paragraphs
    const blocks = text.split(/\n{2,}/)
    const html = blocks
        .map(block => {
            const trimmed = block.trim()
            if (!trimmed) return ''
            if (/^<ul>/.test(trimmed) || /^<ol>/.test(trimmed) || /^<pre>/.test(trimmed) || /^<blockquote>/.test(trimmed) || /^<hr\s*\/>$/.test(trimmed)) {
                return trimmed
            }
            return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`
        })
        .join('')

    // Restore code blocks
    return html.replace(/\{\{CODE_BLOCK_(\d+)\}\}/g, (_m, idx) => codeBlocks[Number(idx)])
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function looksLikeMarkdown(value: string): boolean {
    if (!value) return false
    if (/<\w+[\s\S]*>/.test(value)) return false // already HTML
    return /\*\*|\*[^*].*\*|^[-*]\s|^\d+\.\s|^>\s|```|---/m.test(value)
}

export default function RichEditor({ value, onChange, onSave, isSaving, className, autoSave = false }: RichEditorProps) {
    type TransformAction = 'expand' | 'shorten' | 'fix_grammar' | 'simplify' | 'formal' | 'casual' | 'creative' | 'persuasive' | 'concise' | 'dramatic' | 'technical' | 'friendly'
    const [isTransforming, setIsTransforming] = useState(false)
    const [showSelectMenu, setShowSelectMenu] = useState(false)
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 })
    const [editorState, setEditorState] = useState(0) // Force re-render when buttons are clicked
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const lastSavedContentRef = useRef<string>(value)

    // Pulse mark extension to animate selected text
    const PulseMark = useMemo(() => Mark.create({
        name: 'pulse',
        parseHTML() {
            return [
                { tag: 'span.pulse-effect' },
            ]
        },
        renderHTML() {
            return ['span', { class: 'pulse-effect animate-pulse' }, 0]
        },
    }), [])

    const initialContent = useMemo(() => {
        if (looksLikeMarkdown(value)) return markdownToHtmlBasic(value)
        return value || ''
    }, [value])

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                paragraph: {
                    HTMLAttributes: {}
                },
                heading: {
                    levels: [1, 2],
                    HTMLAttributes: {
                        class: 'editor-heading',
                    }
                },
                hardBreak: false, // Disable default hard break to use custom one
            }),
            HardBreak.configure({
                HTMLAttributes: {
                    style: 'display: block; margin: 0.25rem 0;'
                }
            }),
            PulseMark
        ],
        content: initialContent,
        autofocus: false,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML()
            onChange(newContent)

            // Track unsaved changes
            if (autoSave && newContent !== lastSavedContentRef.current) {
                setHasUnsavedChanges(true)
            }
        },
        onBlur: ({ editor }) => {
            // Auto-save when editor loses focus if there are unsaved changes
            if (autoSave && hasUnsavedChanges && onSave && !isSaving) {
                onSave()
                setHasUnsavedChanges(false)
                lastSavedContentRef.current = editor.getHTML()
            }
        },
        onSelectionUpdate: () => {
            // Force re-render when selection changes to update button states
            // Use a small delay to ensure the editor state is fully updated
            setTimeout(() => setEditorState(prev => prev + 1), 0)
        },
        editorProps: {
            handleKeyDown: (view, event) => {
                // Handle Enter key to create proper paragraph breaks
                if (event.key === 'Enter' && !event.shiftKey) {
                    // Let TipTap handle normal paragraph creation
                    return false
                }
                // Shift+Enter creates a line break
                if (event.key === 'Enter' && event.shiftKey) {
                    event.preventDefault()
                    view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.hardBreak.create()))
                    return true
                }
                return false
            }
        }
    })

    const getSelectedText = useCallback((): string => {
        if (!editor) return ''
        const { from, to } = editor.state.selection
        const text = editor.state.doc.textBetween(from, to, '\n')
        return text.trim()
    }, [editor])

    // Get current button states - this will re-calculate on every render when editorState changes
    const getButtonStates = useCallback(() => {
        if (!editor) return { bold: false, italic: false, h1: false, h2: false }
        return {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            h1: editor.isActive('heading', { level: 1 }),
            h2: editor.isActive('heading', { level: 2 })
        }
    }, [editor, editorState]) // Include editorState to force recalculation

    const buttonStates = getButtonStates()

    // Track selection and position toolbar
    useEffect(() => {
        if (!editor) return

        const updateMenu = () => {
            const selection = window.getSelection?.()
            const hasSelection = selection && selection.rangeCount > 0 && !selection.isCollapsed
            if (!editor.isFocused || !hasSelection || !wrapperRef.current) {
                setShowSelectMenu(false)
                return
            }

            const range = selection!.getRangeAt(0)
            const rect = range.getBoundingClientRect()
            const containerRect = wrapperRef.current.getBoundingClientRect()
            // Position menu below the selection instead of above
            const top = rect.bottom - containerRect.top
            const left = rect.left - containerRect.left + rect.width / 2
            setMenuPosition({ top, left })
            setShowSelectMenu(getSelectedText().length > 0)
        }

        const handleSelectionChange = () => updateMenu()
        const handleScroll = () => updateMenu()
        const handleResize = () => updateMenu()
        const handleBlur = () => setShowSelectMenu(false)

        document.addEventListener('selectionchange', handleSelectionChange)
        window.addEventListener('scroll', handleScroll, true)
        window.addEventListener('resize', handleResize)

        // Also react to editor events
        editor.on('selectionUpdate', updateMenu)
        editor.on('focus', updateMenu)
        editor.on('blur', handleBlur)

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange)
            window.removeEventListener('scroll', handleScroll, true)
            window.removeEventListener('resize', handleResize)
            editor.off('selectionUpdate', updateMenu)
            editor.off('focus', updateMenu)
            editor.off('blur', handleBlur)
        }
    }, [editor, getSelectedText])

    const applyTransform = async (action: TransformAction) => {
        if (!editor || isTransforming) return
        const selected = getSelectedText()
        if (!selected) return

        setIsTransforming(true)
        try {
            // Apply pulsing mark to the current selection so the text itself pulses
            editor.chain().focus().setMark('pulse').run()

            const response = await fetch('/api/chat/writing-assistant/transform', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, text: selected })
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                console.error('Transform API error:', { status: response.status, error: err })
                throw new Error(err.error || `Transform failed with status ${response.status}`)
            }

            const data = await response.json() as { html: string }
            let html = (data.html || '').trim()
            if (!html) return

            // Clean up any extra spaces that might be added during transformation
            html = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()

            // Replace the selection with transformed HTML (this also removes the pulse mark since the content changes)
            editor.chain().focus().deleteSelection().insertContent(html).run()
        } catch (error) {
            console.error('Transform failed:', error)
            alert('Could not apply the transformation. Please try again.')
        } finally {
            setIsTransforming(false)
            // Remove the pulse mark in case content wasn't replaced
            editor?.chain().focus().unsetMark('pulse').run()
        }
    }

    // Sync external value changes into the editor (when loading book)
    useEffect(() => {
        if (!editor) return
        const current = editor.getHTML()
        const desired = looksLikeMarkdown(value) ? markdownToHtmlBasic(value) : (value || '')
        if (desired !== current) {
            editor.commands.setContent(desired)
            // Update saved content reference when external value changes
            lastSavedContentRef.current = desired
            setHasUnsavedChanges(false)
        }
    }, [value, editor])

    // Reset unsaved changes when save operation completes
    useEffect(() => {
        if (!isSaving && editor && autoSave) {
            lastSavedContentRef.current = editor.getHTML()
            setHasUnsavedChanges(false)
        }
    }, [isSaving, editor, autoSave])

    // (removed unused triggerAutoSave)

    const handleWrapperMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (!editor) return
        const proseMirrorEl = wrapperRef.current?.querySelector('.ProseMirror') as HTMLElement | null
        if (proseMirrorEl && proseMirrorEl.contains(e.target as Node)) {
            // Let ProseMirror handle clicks inside the editor content
            return
        }
        // Prevent losing focus to the wrapper and move caret to the end to start typing immediately
        e.preventDefault()
        editor.chain().focus().setTextSelection(editor.state.doc.content.size).run()
    }

    if (!editor) return null

    return (
        <div className={className}>
            <div className="flex flex-wrap gap-1 mb-2">
                <Button type="button" variant={buttonStates.bold ? 'default' : 'outline'} size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                    editor.chain().focus().toggleBold().run()
                    setEditorState(prev => prev + 1) // Force immediate re-render
                }} disabled={!editor.can().chain().focus().toggleBold().run()}>
                    <Bold className="h-4 w-4" />
                </Button>
                <Button type="button" variant={buttonStates.italic ? 'default' : 'outline'} size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                    editor.chain().focus().toggleItalic().run()
                    setEditorState(prev => prev + 1) // Force immediate re-render
                }} disabled={!editor.can().chain().focus().toggleItalic().run()}>
                    <Italic className="h-4 w-4" />
                </Button>
                <Button type="button" variant={buttonStates.h1 ? 'default' : 'outline'} size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                    const { from, to } = editor.state.selection
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                    // Restore cursor position to avoid unexpected jumps
                    editor.chain().focus().setTextSelection({ from, to }).run()
                    setEditorState(prev => prev + 1) // Force immediate re-render
                }} disabled={!editor.can().chain().focus().toggleHeading({ level: 1 }).run()}>
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button type="button" variant={buttonStates.h2 ? 'default' : 'outline'} size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => {
                    const { from, to } = editor.state.selection
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                    // Restore cursor position to avoid unexpected jumps
                    editor.chain().focus().setTextSelection({ from, to }).run()
                    setEditorState(prev => prev + 1) // Force immediate re-render
                }} disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}>
                    <Heading2 className="h-4 w-4" />
                </Button>
                <div className="ml-auto flex gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()}>
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()}>
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div ref={wrapperRef} className="rounded-lg bg-muted hover:bg-muted/80 transition-colors cursor-text group relative" onMouseDown={handleWrapperMouseDown}>
                {showSelectMenu && (
                    <div
                        className="absolute z-20 backdrop-blur-sm border border-border bg-popover text-popover-foreground rounded-md shadow-md p-2 flex flex-col gap-2"
                        style={{ top: menuPosition.top + 12, left: menuPosition.left, transform: 'translate(-50%, 0)' }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {/* Primary transform buttons */}
                        <div className="flex items-center gap-1">
                            <Button type="button" size="sm" variant="ghost" disabled={isTransforming} onClick={() => applyTransform('expand')}>
                                Expand
                            </Button>
                            <Button type="button" size="sm" variant="ghost" disabled={isTransforming} onClick={() => applyTransform('shorten')}>
                                Shorten
                            </Button>
                            <Button type="button" size="sm" variant="ghost" disabled={isTransforming} onClick={() => applyTransform('fix_grammar')}>
                                Fix grammar
                            </Button>
                        </div>

                        {/* Secondary transform buttons */}
                        <div className="flex flex-col gap-1 border-t pt-2">
                            <div className="flex items-center gap-1">
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('simplify')}>
                                    Simplify
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('formal')}>
                                    Formal
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('casual')}>
                                    Casual
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('creative')}>
                                    Creative
                                </Button>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('persuasive')}>
                                    Persuasive
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('concise')}>
                                    Concise
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('dramatic')}>
                                    Dramatic
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('technical')}>
                                    Technical
                                </Button>
                                <Button type="button" size="sm" variant="secondary" disabled={isTransforming} onClick={() => applyTransform('friendly')}>
                                    Friendly
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                <EditorContent
                    editor={editor}
                    className="min-h-[360px] p-4 prose prose-sm max-w-none focus:outline-none [&_.ProseMirror]:min-h-[360px] [&_.ProseMirror]:border-none [&_.ProseMirror]:outline-none [&_.ProseMirror:focus]:border-none [&_.ProseMirror:focus]:outline-none [&_.ProseMirror:focus]:ring-0 [&_.ProseMirror]:cursor-text [&_.ProseMirror]:caret-primary [&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_br]:my-1 [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:mt-6 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:mt-5"
                />
                {(!editor || editor.isEmpty) && (
                    <div className="absolute inset-0 flex items-start justify-start p-4 pointer-events-none">
                        <span className="text-muted-foreground/60 text-sm italic group-hover:text-muted-foreground/80 transition-colors">
                            Click here to start writing...
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
