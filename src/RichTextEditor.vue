<template>
  <div
    ref="wrapperRef"
    class="rich-text-editor"
    :class="{ 'is-disabled': disabled, 'is-flex-height': needsBodyHeightCalc || isAutoHeight, 'is-fullscreen': isFullscreen, 'is-auto-height': isAutoHeight }"
    :style="isAutoHeight ? undefined : { height: props.height }"
  >
    <div ref="toolbarWrapRef" class="rte-toolbar-wrap"><Toolbar
      v-if="editor"
      :editor="editor"
      :buttons="effectiveButtons"
      :toolbar-mode="effectiveToolbarMode"
      :upload-image="handleUpload"
      :is-fullscreen="isFullscreen"
      @fullscreen="toggleFullscreen"
      @preview="handlePreview"
      @source="handleSource"
      @help="handleHelp"
    /></div>
    <div class="rte-body" :style="bodyStyle">
      <EditorContent :editor="editor" class="rte-prose-host" />
    </div>

    <!-- 选区浮动工具条：选中文本时浮现紧凑胶囊形工具条；空光标 / 选中图片等原子节点时不显示（由 shouldShow 过滤） -->
    <BubbleMenu
      v-if="editor"
      :editor="editor"
      :should-show="bubbleShouldShow"
      class="rte-bubble"
    >
      <div class="rte-bubble-bar">
        <button type="button" class="rte-bubble-btn" :class="{ 'is-active': bubbleActive.bold }" title="加粗" @mousedown.prevent="toggleBold"><BoldOutlined /></button>
        <button type="button" class="rte-bubble-btn" :class="{ 'is-active': bubbleActive.italic }" title="斜体" @mousedown.prevent="toggleItalic"><ItalicOutlined /></button>
        <button type="button" class="rte-bubble-btn" :class="{ 'is-active': bubbleActive.underline }" title="下划线" @mousedown.prevent="toggleUnderline"><UnderlineOutlined /></button>
        <button type="button" class="rte-bubble-btn" :class="{ 'is-active': bubbleActive.strike }" title="删除线" @mousedown.prevent="toggleStrike"><StrikethroughOutlined /></button>

        <span class="rte-bubble-sep" />

        <div class="rte-bubble-color">
          <button type="button" class="rte-bubble-btn" :class="{ 'is-active': bubblePaletteOpen }" title="文字颜色" @mousedown.prevent="bubblePaletteOpen = !bubblePaletteOpen"><FontColorsOutlined /></button>
          <div v-if="bubblePaletteOpen" class="rte-bubble-palette" @mousedown.prevent>
            <button
              v-for="c in TEXT_COLORS"
              :key="c"
              type="button"
              class="rte-bubble-swatch"
              :style="{ backgroundColor: c }"
              :title="c"
              @click="applyColor(c)"
            />
            <button type="button" class="rte-bubble-swatch-clear" title="清除颜色" @click="clearColor">清除</button>
          </div>
        </div>

        <span class="rte-bubble-sep" />

        <button type="button" class="rte-bubble-btn" :class="{ 'is-active': bubbleActive.link }" title="链接" @mousedown.prevent="onLink"><LinkOutlined /></button>
      </div>
    </BubbleMenu>

    <div v-if="imageSizeHint" class="rte-img-tip">{{ imageSizeHint }}</div>

    <a-modal
      v-model:open="sourceOpen"
      title="查看 / 编辑源码（HTML）"
      width="720px"
      @ok="applySource"
    >
      <textarea v-model="sourceHtml" class="rte-source-textarea" spellcheck="false" />
    </a-modal>

    <a-modal
      v-model:open="previewOpen"
      title="预览内容"
      width="800px"
      :footer="null"
    >
      <div class="rte-preview-body rte-prose" v-html="previewHtml" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import type { Editor, Extensions } from '@tiptap/core'
import { message } from 'ant-design-vue'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  LinkOutlined,
  FontColorsOutlined,
} from '@ant-design/icons-vue'
import { createExtensions } from './components/rich-text/extensions'
import Toolbar from './components/rich-text/Toolbar.vue'
import {
  RICH_TEXT_DEFAULT_BUTTONS,
  RICH_TEXT_MOBILE_BUTTONS,
  type RteButton,
} from './config/richTextPresets'

interface Props {
  /** HTML 内容（v-model 双向绑定） */
  modelValue: string
  /** 占位文本 */
  placeholder?: string
  /** 编辑区高度（像素值如 '500px'，或百分比如 '100%' 由 CSS 撑满） */
  height?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 工具栏按钮组（可选，不传则使用内置默认精简工具栏） */
  buttons?: RteButton[][]
  /** 工具栏溢出模式：'wrap'(默认,自动换行多行) | 'sliding'(宽度不够折叠为⋯下拉) | 'floating' */
  toolbarMode?: 'sliding' | 'wrap' | 'floating'
  /** 是否启用移动端自适应（默认 true）。false 时完全由调用方通过 buttons/toolbarMode 控制 */
  responsive?: boolean
  /** 自定义移动端按钮组（不传则用 RICH_TEXT_MOBILE_BUTTONS） */
  mobileButtons?: RteButton[][]
  /** 编辑器下方常驻显示的图片上传提示文案（如推荐尺寸/大小限制）；不传则不显示 */
  imageSizeHint?: string
  /** 单张插图大小上限（MB），handleUpload 据此校验；默认 5 */
  imageMaxSizeMB?: number
  /** 图片上传处理函数：接收 File，返回可访问的图片 URL（Promise）。
   *  不传则工具栏“服务器上传”入口不可用（仍可用链接 / 本地 Base64）。 */
  uploadImage?: (file: File) => Promise<string>
  /** 额外 TipTap 扩展（用于 Pro 套餐零侵入注入，如 AI / 协同 / 导出等） */
  extraExtensions?: Extensions
  /** 是否开启字符计数（CharacterCount 扩展），默认 false */
  enableCharCount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入内容...',
  height: '500px',
  disabled: false,
  toolbarMode: 'wrap',
  responsive: true,
  imageMaxSizeMB: 5,
  enableCharCount: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

/**
 * 移动端自适应：responsive=true 且处于移动端（max-width:767px）时，
 * 自动切换到精简按钮组（mobileButtons 覆盖 > MOBILE 预设），
 * 否则沿用调用方传入的 buttons 或内置默认精简组。
 */
const isMobile = ref(false)

const effectiveButtons = computed<RteButton[][]>(() => {
  if (props.responsive && isMobile.value) {
    return props.mobileButtons ?? RICH_TEXT_MOBILE_BUTTONS
  }
  return props.buttons ?? RICH_TEXT_DEFAULT_BUTTONS
})

/**
 * 移动端工具栏溢出模式：响应式且处于移动端时强制 'sliding'，
 * 让超出容器宽度的按钮自动折叠进 ⋮ 更多下拉；其余场景沿用调用方设置（默认 'wrap'）。
 */
const effectiveToolbarMode = computed<'sliding' | 'wrap' | 'floating'>(() => {
  if (props.responsive && isMobile.value) return 'sliding'
  return props.toolbarMode
})

const isAutoHeight = computed(
  () => props.height === 'auto',
)
/** 是否需要 JS 测量编辑区 px 高度（固定像素 / 百分比都需要；只有 auto 不需要） */
const needsBodyHeightCalc = computed(() => !isAutoHeight.value)

const wrapperRef = ref<HTMLElement | null>(null)
const toolbarWrapRef = ref<HTMLElement | null>(null)
const bodyHeight = ref<number | null>(null)

/**
 * 编辑区内联高度样式（核心：ProseMirror contenteditable 必须有确定 px 高度才能可靠触发 overflow 滚动）。
 * - 固定像素 / 百分比模式：JS 测量可用高度 − 工具栏高度，写入确定 px
 * - 自动高度模式：不限制高度，编辑区随内容增长、由外层滚动
 */
const bodyStyle = computed(() => {
  if (isAutoHeight.value) return { height: 'auto', overflow: 'visible', flex: 'none' }
  // 全屏模式：由 CSS flex:1 撑满，不设置固定高度
  if (isFullscreen.value) return {}
  // 已测量到确定 px：flex: none 禁用 CSS flex:1 的 flex-grow + flex-basis 干扰，让 height 直接生效
  // 未测量时返回空对象，让 CSS flex:1 兜底（初始渲染瞬间，下一帧 JS 测量到位后覆盖）
  return bodyHeight.value != null
    ? { height: `${bodyHeight.value}px`, flex: 'none' }
    : {}
})

function updateBodyHeight() {
  if (!needsBodyHeightCalc.value) return
  const wrap = wrapperRef.value
  const bar = toolbarWrapRef.value
  if (!wrap) return

  const barH = bar ? bar.offsetHeight : 0
  const wrapCS = getComputedStyle(wrap)
  const borderTop = parseInt(wrapCS.borderTopWidth) || 0
  const borderBottom = parseInt(wrapCS.borderBottomWidth) || 0

  const isPercent = typeof props.height === 'string' && props.height.includes('%')

  let targetH = 0

  if (isPercent) {
    // height:100% → 视口可用高度 - wrapper 在视口中的位置 - 边框
    // wrapRect.top 已包含 header/tabs 等 fixed 元素占据的空间
    const wrapRect = wrap.getBoundingClientRect()
    targetH = Math.max(0, window.innerHeight - wrapRect.top - borderTop - borderBottom)
  } else {
    // 固定像素模式：直接从 prop 解析，不依赖 DOM 测量
    targetH = parseInt(props.height) || 0
  }

  // bodyHeight = wrapper 内容区高度 - 工具栏高度
  const h = targetH - barH

  // 防抖：只有高度变化超过 2px 才更新，避免 ResizeObserver 振荡
  if (h > 0 && Math.abs(h - (bodyHeight.value || 0)) > 2) {
    bodyHeight.value = h
  }
}

let resizeObserver: ResizeObserver | null = null
let mobileMedia: MediaQueryList | null = null

/** matchMedia 变化回调：同步移动端状态，触发 effectiveButtons / effectiveToolbarMode 重算 */
function handleMobileMediaChange(e: MediaQueryList | MediaQueryListEvent) {
  isMobile.value = e.matches
}

/* ----------------------------- 全屏 ----------------------------- */
const isFullscreen = ref(false)
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

// ESC 退出全屏
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

onMounted(() => {
  // 移动端响应式：监听视口宽度，初始即记录当前状态
  mobileMedia = window.matchMedia('(max-width: 767px)')
  isMobile.value = mobileMedia.matches
  mobileMedia.addEventListener('change', handleMobileMediaChange)

  // ESC 退出全屏
  document.addEventListener('keydown', handleKeydown)

  if (!needsBodyHeightCalc.value) return
  nextTick(() => requestAnimationFrame(updateBodyHeight))
  // ResizeObserver：监听 wrapper/工具栏尺寸变化，自动重算
  resizeObserver = new ResizeObserver(() => updateBodyHeight())
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value)
  if (toolbarWrapRef.value) resizeObserver.observe(toolbarWrapRef.value)
})

watch([needsBodyHeightCalc, () => props.height], () => {
  if (needsBodyHeightCalc.value) {
    nextTick(() => requestAnimationFrame(updateBodyHeight))
  } else {
    bodyHeight.value = null
  }
})

/** 图片上传：优先调用调用方注入的 uploadImage（自行处理 axios/token/baseURL/域名拼接）。
 *  未注入时抛出明确错误，由 Toolbar 捕获并提示，链接 / 本地 Base64 通道不受影响。 */
async function handleUpload(file: File): Promise<string> {
  const isImage = file.type.startsWith('image/')
  if (!isImage) throw new Error('只能上传图片文件！')
  const isLtMax = file.size / 1024 / 1024 < props.imageMaxSizeMB
  if (!isLtMax) throw new Error(`图片大小不能超过 ${props.imageMaxSizeMB}MB！`)
  if (!props.uploadImage) {
    throw new Error('未配置图片上传服务（uploadImage prop），请使用链接或本地上传。')
  }
  const url = await props.uploadImage(file)
  if (!url) throw new Error('upload failed')
  return url
}

const editor = useEditor({
  extensions: [
    ...createExtensions(props.placeholder),
    ...(props.extraExtensions ?? []),
  ],
  content: props.modelValue,
  editable: !props.disabled,
  editorProps: {
    attributes: { class: 'rte-prose' },
  },
})

// v-model：编辑器变化时向上 emit；外部值变化时同步（避免回环）
watch(
  editor,
  (ed) => {
    if (!ed) return
    ed.on('update', () => emit('update:modelValue', ed.getHTML()))
  },
  { immediate: true },
)

watch(
  () => props.modelValue,
  (val) => {
    const ed = editor.value
    if (ed && val !== ed.getHTML()) ed.commands.setContent(val, { emitUpdate: false })
  },
)

watch(
  () => props.disabled,
  (d) => editor.value?.setEditable(!d),
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  mobileMedia?.removeEventListener('change', handleMobileMediaChange)
  mobileMedia = null
  document.removeEventListener('keydown', handleKeydown)
  editor.value?.destroy()
})

/* ----------------------------- 预览（内嵌弹窗，不再打开新页面） ----------------------------- */
const previewOpen = ref(false)
const previewHtml = ref('')
function handlePreview() {
  previewHtml.value = editor.value?.getHTML() ?? ''
  previewOpen.value = true
}

/* ----------------------------- 源码 ----------------------------- */
const sourceOpen = ref(false)
const sourceHtml = ref('')
function handleSource() {
  sourceHtml.value = editor.value?.getHTML() ?? ''
  sourceOpen.value = true
}
function applySource() {
  editor.value?.commands.setContent(sourceHtml.value, { emitUpdate: false })
  sourceOpen.value = false
}

/* ----------------------------- 帮助 ----------------------------- */
function handleHelp() {
  message.info('选中文字后使用工具栏格式化；表格/图片/视频等通过工具栏插入；支持全屏与源码编辑。')
}

/* ----------------------------- 选区浮动工具条（BubbleMenu） -----------------------------
 * 选中文本时浮现紧凑胶囊形工具条，提供快捷格式按钮，交互对齐 tiptap-editor-vue3。
 * 通过 editor 的 transaction 事件递增 revision，强制按钮高亮状态随选区/格式变化重算
 * （与 Toolbar 的响应式方案一致）。 */
const revision = ref(0)
// 颜色面板展开状态；每次编辑器事务（选区变化 / 内容变更）即收起，避免浮层残留
const bubblePaletteOpen = ref(false)
/** 预设文字颜色（与 Toolbar 调色板风格一致） */
const TEXT_COLORS = [
  '#e11d48', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#111827',
]

watch(
  editor,
  (ed) => {
    if (!ed) return
    ed.on('transaction', () => { revision.value++ })
  },
  { immediate: true },
)

watch(revision, () => {
  bubblePaletteOpen.value = false
})

/**
 * 浮动工具条显示条件：仅当存在非空文本选区，且当前未选中图片/视频/分页符等原子块节点时显示。
 * 空光标（from === to）或选中块级节点时不浮现，避免对无意义目标弹出文字格式工具条。
 */
function bubbleShouldShow({ editor: ed, from, to }: { editor: Editor; from: number; to: number }): boolean {
  if (from === to) return false
  if (ed.isActive('image') || ed.isActive('video') || ed.isActive('pageBreak')) return false
  return true
}

/** 按钮高亮态（响应式依赖 revision，选区/格式变化即重算） */
const bubbleActive = computed(() => {
  void revision.value // 建立响应式依赖
  const ed = editor.value
  if (!ed) return { bold: false, italic: false, underline: false, strike: false, link: false }
  return {
    bold: ed.isActive('bold'),
    italic: ed.isActive('italic'),
    underline: ed.isActive('underline'),
    strike: ed.isActive('strike'),
    link: ed.isActive('link'),
  }
})

function toggleBold() { editor.value?.chain().focus().toggleBold().run() }
function toggleItalic() { editor.value?.chain().focus().toggleItalic().run() }
function toggleUnderline() { editor.value?.chain().focus().toggleUnderline().run() }
function toggleStrike() { editor.value?.chain().focus().toggleStrike().run() }

/** 链接：用 window.prompt 取 URL；留空则取消链接 */
function onLink() {
  const ed = editor.value
  if (!ed) return
  const previousUrl = (ed.getAttributes('link').href as string) || ''
  const url = window.prompt('请输入链接地址（留空则取消链接）', previousUrl || 'https://')
  if (url === null) return // 用户取消
  const trimmed = url.trim()
  if (!trimmed) {
    ed.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  ed.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
}

/** 文字颜色：编辑器 setColor 命令 */
function applyColor(color: string) {
  editor.value?.chain().focus().setColor(color).run()
  bubblePaletteOpen.value = false
}

/** 清除文字颜色：unsetColor 命令 */
function clearColor() {
  editor.value?.chain().focus().unsetColor().run()
  bubblePaletteOpen.value = false
}
</script>

<style lang="scss" scoped>
.rich-text-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  overflow: hidden;
  background: hsl(var(--background));
  transition: border-color 0.3s;

  .rte-img-tip {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.4;
    color: hsl(var(--muted-foreground));
  }

  &:hover {
    border-color: hsl(var(--primary) / 0.5);
  }
  &.is-disabled {
    background-color: hsl(var(--muted));
    cursor: not-allowed;
  }

  &.is-flex-height {
    display: flex;
    flex-direction: column;
    min-height: 240px; /* 兜底：父链未正确约束高度时仍保有一个可滚动的最小高度，避免塌缩为 0 或撑爆整页 */
  }

  &.is-auto-height {
    height: auto;
    min-height: 240px;
    display: flex;
    flex-direction: column;
  }

  &.is-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    border-radius: 0;
    border: none;
    /* 自洽铺满视口：显式 flex 列布局，覆盖调用方可能传入的内联 height（如 height="100%"） */
    display: flex;
    flex-direction: column;
    width: 100% !important;
    height: 100% !important;
    max-height: none !important;
    overflow: hidden;

    .rte-body {
      /* 全屏时编辑区填满视口（减工具栏固定高度），内部滚动，不受非全屏 70vh 兜底影响 */
      flex: 1 1 auto;
      min-height: 0;
      max-height: none;
    }
  }
}

.rte-toolbar-wrap {
  flex-shrink: 0; /* 工具栏固定高度，不被压缩；编辑区独占剩余空间 */
}

.rte-body {
  flex: 1; /* 填充 wrapper 剩余空间（wrapper 已有确定高度：固定值或 100%） */
  min-height: 0; /* 滚动关键：允许收缩才会触发 overflow 滚动而非被内容撑开 */
  overflow-y: auto;
  overflow-x: hidden; /* 内容区不出现横向滚动条（长文本已通过 word-break 自动换行） */
  overscroll-behavior: contain; /* 滚动到底不向外层容器冒泡 */
  background: hsl(var(--background));

  :deep(.rte-prose-host) {
    min-height: 100%;
  }
  :deep(.ProseMirror) {
    min-height: 100%;
  }
}

.rte-source-textarea {
  width: 100%;
  height: 420px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  outline: none;
  resize: none;
  &:focus {
    border-color: hsl(var(--primary));
  }
}
.rte-preview-body {
  max-height: 68vh;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 4px;
  background: hsl(var(--background));
  /* 复用全局 .rte-prose 的排版与表格样式，保证预览与编辑器渲染完全一致 */
}

/* 高度兜底：仅在「非自动高度、非全屏」模式下限制编辑区最大高度。
   当调用方传 height="100%" 且父链未正确约束高度时，.rte-body 的 flex:1 会把编辑器
   撑满整页（撑爆视口）；此处用 max-height 兜底，编辑区超界即内部滚动。
   自动高度（auto）模式编辑区随内容增长由外层滚动，全屏模式有独立高度处理，均不受影响。 */
.rich-text-editor:not(.is-auto-height):not(.is-fullscreen) .rte-body {
  max-height: 70vh;
}

/* ----------------------------- 选区浮动工具条（BubbleMenu） ----------------------------- */
.rte-bubble {
  z-index: 20;
}
.rte-bubble-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  border-radius: 999px; /* 胶囊形 */
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  box-shadow:
    0 6px 20px hsl(var(--foreground) / 0.12),
    0 2px 6px hsl(var(--foreground) / 0.08);
}
.rte-bubble-btn {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: hsl(var(--foreground));
  cursor: pointer;
  font-size: 15px;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: hsl(var(--muted) / 0.8);
  }
  &.is-active {
    background: hsl(var(--primary) / 0.16);
    color: hsl(var(--primary));
  }
}
.rte-bubble-sep {
  width: 1px;
  height: 18px;
  margin: 0 2px;
  background: hsl(var(--border));
}
.rte-bubble-color {
  position: relative;
}
.rte-bubble-palette {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 8px;
  border-radius: 10px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  box-shadow: 0 6px 20px hsl(var(--foreground) / 0.12);
  z-index: 30;
}
.rte-bubble-swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid hsl(var(--border));
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.12);
  }
}
.rte-bubble-swatch-clear {
  grid-column: 1 / -1;
  height: 26px;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  background: hsl(var(--muted) / 0.5);
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  font-size: 12px;

  &:hover {
    background: hsl(var(--muted) / 0.9);
  }
}
</style>

<style lang="scss">
@use './components/rich-text/editor-content.scss';
</style>
