/**
 * Tiptap 扩展注册表（替换原 TinyMCE 的 plugins/toolbar 字符串）。
 * 设计：所有扩展始终注册（FULL 预设只是 Toolbar 多显示几个按钮，并非多注册扩展），
 * 这样调用方无需关心扩展启停，组件更简洁。
 *
 * 注意：StarterKit v3 已内置 underline / link / horizontalRule / codeBlock 等，
 * 因此不单独引入 @tiptap/extension-underline、@tiptap/extension-link，避免重复扩展报错；
 * codeBlock 在 StarterKit 中关闭，改用 CodeBlockLowlight 以支持语法高亮。
 */
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import CharacterCount from '@tiptap/extension-character-count'
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import { createLowlight } from 'lowlight'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import markdown from 'highlight.js/lib/languages/markdown'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import sql from 'highlight.js/lib/languages/sql'
import { Extension, Node, Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const lowlight = createLowlight({
  javascript,
  typescript,
  xml,
  css,
  json,
  bash,
  markdown,
  python,
  java,
  sql,
})

/* ----------------------------- 命令类型增强 ----------------------------- */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
    lineHeight: {
      setLineHeight: (value: string) => ReturnType
      unsetLineHeight: () => ReturnType
    }
    backgroundColor: {
      setBackgroundColor: (color: string) => ReturnType
      unsetBackgroundColor: () => ReturnType
    }
    anchor: {
      setAnchor: (id: string) => ReturnType
      unsetAnchor: () => ReturnType
    }
    video: {
      setVideo: (src: string) => ReturnType
    }
    pageBreak: {
      setPageBreak: () => ReturnType
    }
    searchReplace: {
      setSearchTerm: (term: string) => ReturnType
      replaceNext: (replacement: string) => ReturnType
      replaceAll: (replacement: string) => ReturnType
    }
  }
}

/* ----------------------------- 字号（基于 TextStyle） ----------------------------- */
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

/* ----------------------------- 行高（块级属性） ----------------------------- */
const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return { types: ['paragraph', 'heading'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight:
        (value) =>
        ({ editor, chain }) => {
          const type = editor.state.selection.$from.parent.type.name
          return chain().updateAttributes(type, { lineHeight: value }).run()
        },
      unsetLineHeight:
        () =>
        ({ editor, chain }) => {
          const type = editor.state.selection.$from.parent.type.name
          return chain().updateAttributes(type, { lineHeight: null }).run()
        },
    }
  },
})

/* ----------------------------- 背景色（基于 TextStyle） ----------------------------- */
const BackgroundColor = Extension.create({
  name: 'backgroundColor',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (el) => el.style.backgroundColor || null,
            renderHTML: (attrs) =>
              attrs.backgroundColor
                ? { style: `background-color: ${attrs.backgroundColor}` }
                : {},
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setBackgroundColor:
        (color) =>
        ({ chain }) =>
          chain().setMark('textStyle', { backgroundColor: color }).run(),
      unsetBackgroundColor:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { backgroundColor: null }).removeEmptyTextStyle().run(),
    }
  },
})

/* ----------------------------- 锚点（mark -> <a id>） ----------------------------- */
const Anchor = Mark.create({
  name: 'anchor',
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('id'),
        renderHTML: (attrs) => (attrs.id ? { id: attrs.id } : {}),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'a[id]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes), 0]
  },
  addCommands() {
    return {
      setAnchor:
        (id) =>
        ({ commands }) =>
          commands.setMark('anchor', { id }),
      unsetAnchor:
        () =>
        ({ commands }) =>
          commands.unsetMark('anchor'),
    }
  },
})

/* ----------------------------- 视频（block node -> <video>） ----------------------------- */
const MediaVideo = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      width: { default: '100%' },
    }
  },
  parseHTML() {
    return [{ tag: 'video' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, { controls: 'true' })]
  },
  addCommands() {
    return {
      setVideo:
        (src) =>
        ({ commands }) =>
          commands.insertContent({ type: 'video', attrs: { src } }),
    }
  },
})

/* ----------------------------- 分页符（block node -> <hr data-page-break>） ----------------------------- */
const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: false,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }, { tag: 'hr[data-page-break]' }]
  },
  renderHTML() {
    return ['hr', { 'data-page-break': '', class: 'rte-page-break' }]
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: 'pageBreak' }),
    }
  },
})

/* ----------------------------- 保真节点：通用 div / span（保留任意内联 style） -----------------------------
 * 解决 Tiptap/ProseMirror 默认丢弃 div 结构与 span 内联样式的问题，
 * 使 TinyMCE 时期存储的富文本（flex 时间轴、绝对定位连接器等）能在编辑器中完整回显。
 * 注：htmlSpan 以高优先级拦截所有 <span>，故从 HTML 解析回来的“文字颜色/背景色”会表现为 htmlSpan 节点
 *     （颜色仍在，因为 style 字符串被完整保留）；工具栏 setColor/setBackgroundColor 在当次编辑会话内仍走 textStyle mark。 */
const HtmlDiv = Node.create({
  name: 'htmlDiv',
  group: 'block',
  content: 'block+',
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('style') || null,
        renderHTML: (attrs) => (attrs.style ? { style: attrs.style as string } : {}),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div', priority: 10 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },
})

const HtmlSpan = Node.create({
  name: 'htmlSpan',
  group: 'inline',
  inline: true,
  content: 'inline*',
  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('style') || null,
        renderHTML: (attrs) => (attrs.style ? { style: attrs.style as string } : {}),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'span', priority: 100 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})

/* ----------------------------- 查找替换（ProseMirror 装饰 + 命令） ----------------------------- */
const SearchReplace = Extension.create({
  name: 'searchReplace',
  addStorage() {
    return { searchTerm: '', results: [] as { from: number; to: number }[] }
  },
  addCommands() {
    return {
      setSearchTerm:
        (term) =>
        ({ editor }) => {
          ;(editor.storage as any).searchReplace.searchTerm = term
          return true
        },
      replaceNext:
        (replacement) =>
        ({ editor, state, dispatch }) => {
          const results = (editor.storage as any).searchReplace.results as { from: number; to: number }[]
          if (!results.length) return false
          const { from, to } = results[0]
          if (dispatch) dispatch(state.tr.insertText(replacement, from, to))
          return true
        },
      replaceAll:
        (replacement) =>
        ({ editor, state, dispatch }) => {
          const results = (editor.storage as any).searchReplace.results as { from: number; to: number }[]
          if (!results.length) return false
          if (dispatch) {
            let tr = state.tr
            for (let i = results.length - 1; i >= 0; i--) {
              tr = tr.insertText(replacement, results[i].from, results[i].to)
            }
            dispatch(tr)
          }
          return true
        },
    }
  },
  addProseMirrorPlugins() {
    const ext = this
    return [
      new Plugin({
        key: new PluginKey('searchReplace'),
        state: {
          init: () => DecorationSet.empty,
          apply: (tr) => {
            // 在扩展内部 this.storage 即 editor.storage.searchReplace 本身（已是 { searchTerm, results }），无需再 .searchReplace 嵌套
            const term = ext.storage.searchTerm as string
            if (!term) {
              ext.storage.results = []
              return DecorationSet.empty
            }
            const results: { from: number; to: number }[] = []
            const decorations: Decoration[] = []
            tr.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              const text = node.text
              let idx = text.indexOf(term)
              while (idx !== -1) {
                const from = pos + idx
                const to = from + term.length
                results.push({ from, to })
                decorations.push(Decoration.inline(from, to, { class: 'rte-search-hit' }))
                idx = text.indexOf(term, idx + term.length)
              }
            })
            ext.storage.results = results
            return DecorationSet.create(tr.doc, decorations)
          },
        },
      }),
    ]
  },
})

/* ----------------------------- 组装扩展列表 ----------------------------- */
export function createExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      // 关闭内置 codeBlock，改用 CodeBlockLowlight（语法高亮）
      codeBlock: false,
      // StarterKit v3 内置 link，这里统一配置
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      },
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
    TextStyle,
    FontSize,
    LineHeight,
    Color,
    BackgroundColor,
    FontFamily,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({ inline: false, allowBase64: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    CodeBlockLowlight.configure({ lowlight }),
    Placeholder.configure({ placeholder }),
    CharacterCount,
    Anchor,
    MediaVideo,
    PageBreak,
    SearchReplace,
    HtmlDiv,
    HtmlSpan,
    // 块级全局拖拽手柄：paragraph/heading/codeBlock/blockquote/listItem 等块级节点出现可拖拽手柄
    // （仅引入轻量第三方扩展，视觉样式由 editor-content.scss 的 .drag-handle 提供）
    GlobalDragHandle.configure({
      dragHandleWidth: 20,
      scrollTreshold: 100,
      excludedTags: ['TABLE'],
      customNodes: [],
    }),
  ]
}

export const RTE_EXTENSION_NAMES = [
  'fontSize',
  'lineHeight',
  'backgroundColor',
  'anchor',
  'video',
  'pageBreak',
  'searchReplace',
]
