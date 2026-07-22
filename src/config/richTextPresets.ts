/**
 * 富文本工具栏按钮组预设（Tiptap 版）。
 * 借鉴 Vben Admin 等主流中后台范式：组件内置默认精简配置，
 * 开放 buttons prop 让调用方按场景覆盖（如内容管理页需全功能）。
 *
 * 与旧 TinyMCE 版本的区别：TinyMCE 用 toolbar/plugins 字符串，
 * Tiptap（headless）用按钮组数组（RteButton[][]），每个按钮由 Toolbar.vue 渲染。
 * 扩展始终全部注册，preset 仅控制显示哪些按钮。
 */

/** 工具栏按钮标识 */
export type RteButton =
  | 'undo'
  | 'redo'
  | 'paragraph'
  | 'heading'
  | 'fontFamily'
  | 'fontSize'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'color'
  | 'backgroundColor'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'lineHeight'
  | 'bulletList'
  | 'orderedList'
  | 'outdent'
  | 'indent'
  | 'blockquote'
  | 'link'
  | 'image'
  | 'video'
  | 'table'
  | 'codeBlock'
  | 'horizontalRule'
  | 'clearFormat'
  | 'insertDate'
  | 'pageBreak'
  | 'emoticon'
  | 'charmap'
  | 'anchor'
  | 'searchReplace'
  | 'preview'
  | 'fullscreen'
  | 'source'
  | 'help'

/** 默认（精简）工具栏：高频格式/排版/媒体 */
export const RICH_TEXT_DEFAULT_BUTTONS: RteButton[][] = [
  ['undo', 'redo'],
  ['paragraph', 'heading', 'fontFamily', 'fontSize'],
  ['bold', 'italic', 'underline', 'strike'],
  ['color', 'backgroundColor'],
  ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify', 'lineHeight'],
  ['bulletList', 'orderedList', 'outdent', 'indent'],
  ['blockquote'],
  ['link', 'image', 'table'],
  ['clearFormat'],
  ['preview', 'fullscreen', 'source'],
]

/** 全功能工具栏（内容管理等需要完整编辑能力的页面使用） */
export const RICH_TEXT_FULL_BUTTONS: RteButton[][] = [
  ...RICH_TEXT_DEFAULT_BUTTONS,
  ['codeBlock'],
  ['horizontalRule', 'pageBreak'],
  ['insertDate'],
  ['emoticon', 'charmap'],
  ['video', 'anchor'],
  ['searchReplace', 'help'],
]

/**
 * 移动端精简工具栏：只保留高频核心格式/排版/媒体按钮（约 15 个）。
 * 配合 toolbarMode='sliding' 使用——若仍超出屏幕宽度，sliding 模式会把
 * 溢出的按钮自动收进 ⋮ 更多下拉，保证小屏下工具栏不换行、不占满半屏。
 */
export const RICH_TEXT_MOBILE_BUTTONS: RteButton[][] = [
  ['undo', 'redo'],
  ['paragraph', 'heading'],
  ['bold', 'italic', 'underline', 'strike'],
  ['alignLeft', 'alignCenter', 'alignRight'],
  ['bulletList', 'orderedList'],
  ['link', 'image'],
  ['clearFormat'],
]
