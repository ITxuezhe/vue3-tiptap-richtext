<template>
  <div class="rte-toolbar">
    <!-- 工具栏按钮组 -->
    <template v-for="(group, gi) in buttons" :key="gi">
      <a-divider v-if="gi > 0" type="vertical" />
      <a-space :size="2">
        <template v-for="key in group" :key="key">
          <component :is="renderControl(key)" />
        </template>
      </a-space>
    </template>
  </div>

  <!-- 图片插入模态框：放模板中稳定渲染，避免 render function 每次重建导致 Tabs 内容丢失 -->
  <Teleport to="body">
    <a-modal
      v-model:open="imageModalOpen"
      title="插入图片"
      :width="520"
      ok-text="插入"
      cancel-text="取消"
      :confirm-loading="imageUploading"
      @ok="insertImageViaModal"
      @cancel="closeImageModal"
    >
      <a-tabs v-model:activeKey="imageActiveTab">
        <!-- Tab 1: 链接 URL -->
        <a-tab-pane key="url" tab="链接 URL">
          <div class="rte-img-tab">
            <a-input
              v-model:value="imageUrl"
              placeholder="请输入图片地址（http(s)://...）"
            />
          </div>
        </a-tab-pane>

        <!-- Tab 2: 本地 Base64 -->
        <a-tab-pane key="base64" tab="本地上传">
          <div class="rte-img-tab">
            <a-upload-dragger
              class="rte-img-dragger"
              :before-upload="() => false"
              :show-upload-list="false"
              accept="image/*"
              @change="onBase64Change"
            >
              <p class="ant-upload-drag-icon">
                <inbox-outlined />
              </p>
              <p class="ant-upload-text">点击或拖拽图片到此处</p>
              <p class="ant-upload-hint">支持 jpg / png / gif 等图片格式（不依赖服务器）</p>
            </a-upload-dragger>
            <span class="rte-img-filename">{{ imageBase64Name || '未选择文件' }}</span>
            <img
              v-if="imageBase64Preview"
              class="rte-img-preview"
              :src="imageBase64Preview"
              alt="preview"
            />
          </div>
        </a-tab-pane>

        <!-- Tab 3: 服务器上传 -->
        <a-tab-pane key="server" tab="服务器上传">
          <div class="rte-img-tab">
            <a-upload-dragger
              class="rte-img-dragger"
              :custom-request="onServerUpload"
              :show-upload-list="false"
              accept="image/*"
            >
              <p class="ant-upload-drag-icon">
                <inbox-outlined />
              </p>
              <p class="ant-upload-text">点击或拖拽图片上传</p>
              <p class="ant-upload-hint">上传到服务器后插入（需调用方配置 uploadImage）</p>
            </a-upload-dragger>
            <a-progress v-if="imageUploading" :percent="0" status="active" size="small" />
            <span class="rte-img-filename">
              {{ imageServerName || (imageUploading ? '上传中...' : '未选择文件') }}
            </span>
            <img
              v-if="imageServerUrl"
              class="rte-img-preview"
              :src="imageServerUrl"
              alt="preview"
            />
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-modal>
  </Teleport>
</template>

<script setup lang="ts">
import { h, ref, onMounted, onBeforeUnmount, type VNode } from 'vue'
import {
  Button,
  Tooltip,
  Popover,
  Select,
  Input,
  Modal,
  Tabs,
  message,
} from 'ant-design-vue'
import {
  UndoOutlined,
  RedoOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  FontColorsOutlined,
  BgColorsOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
  PictureOutlined,
  TableOutlined,
  CodeOutlined,
  MinusOutlined,
  ClearOutlined,
  CalendarOutlined,
  SmileOutlined,
  SearchOutlined,
  EyeOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CodeSandboxOutlined,
  QuestionCircleOutlined,
  VideoCameraOutlined,
  AppstoreOutlined,
  BlockOutlined,
  CaretDownOutlined,
  InboxOutlined,
} from '@ant-design/icons-vue'
import type { Editor } from '@tiptap/vue-3'
import type { RteButton } from '../../config/richTextPresets'

interface Props {
  editor: Editor
  buttons: RteButton[][]
  uploadImage: (file: File) => Promise<string>
  isFullscreen?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'fullscreen'): void
  (e: 'preview'): void
  (e: 'source'): void
  (e: 'help'): void
}>()

// 编辑器事务触发重渲染
const revision = ref(0)
let txHandler: (() => void) | null = null

onMounted(() => {
  if (props.editor) {
    txHandler = () => { revision.value++ }
    props.editor.on('transaction', txHandler)
  }
})

onBeforeUnmount(() => {
  if (txHandler && props.editor) {
    props.editor.off('transaction', txHandler)
  }
})

// 常量
const FONT_FAMILIES = [
  { label: '字体', value: '' },
  { label: '微软雅黑', value: "'Microsoft YaHei','PingFang SC',sans-serif" },
  { label: '宋体', value: "'SimSun',serif" },
  { label: '黑体', value: "'SimHei',sans-serif" },
  { label: '楷体', value: "'KaiTi',serif" },
  { label: '苹方', value: "'PingFang SC',sans-serif" },
  { label: 'Arial', value: 'Arial,sans-serif' },
]
const FONT_SIZES = [
  { label: '字号', value: '' },
  ...['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'].map(s => ({ label: s, value: s })),
]
const LINE_HEIGHTS = [
  { label: '行高', value: '' },
  ...['1', '1.2', '1.4', '1.6', '1.8', '2', '2.4', '3'].map(s => ({ label: s, value: s })),
]
const HEADING_OPTIONS = [
  { label: '正文', value: 'paragraph', size: '' },
  { label: '标题 1', value: 'h1', size: '22px' },
  { label: '标题 2', value: 'h2', size: '18px' },
  { label: '标题 3', value: 'h3', size: '16px' },
  { label: '标题 4', value: 'h4', size: '15px' },
  { label: '标题 5', value: 'h5', size: '14px' },
  { label: '标题 6', value: 'h6', size: '12px' },
]
const COLOR_PALETTE = [
  '#1f2329', '#4e5969', '#d4380d', '#cf1322', '#d46b08', '#d48806',
  '#389e0d', '#08979c', '#1677ff', '#531dab', '#c41d7f', '#ffffff',
  '#f5f7fa', '#fff1f0', '#fff7e6', '#f6ffed', '#e6f4ff', '#f9f0ff',
]
const EMOJIS = ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '🤔', '😎', '😭', '👍', '👎', '👏', '🙏', '💪', '🎉', '❤️', '🔥', '⭐', '✅', '❌', '⚡', '🌟', '💡']
const CHARS = ['\u00A9', '\u00AE', '\u2122', '\u00A7', '\u00B6', '\u2022', '\u2014', '\u2013', '\u2026', '\u201C', '\u201D', '\u2018', '\u2019', '\u00AB', '\u00BB', '\u00B1', '\u00D7', '\u00F7', '\u2260', '\u2264', '\u2265', '\u20AC', '\u00A3', '\u00A5', '\u00B0', '\u00B2', '\u00B3', '\u00BD', '\u00BC', '\u00BE']

/* ----------------------------- 图片插入模态框（Tab：链接 / 本地 Base64 / 服务器） ----------------------------- */
/** 借鉴 tiptap-ant-design-vue 的统一图片插入交互：点击图片按钮弹出 Tab 式对话框，
 *  支持「图片链接 / 本地上传(Base64) / 上传到服务器」三种插入方式。 */
type ImageTabKey = 'url' | 'base64' | 'server'

const imageModalOpen = ref(false)
const imageActiveTab = ref<ImageTabKey>('url')
const imageUrl = ref('') // 链接 URL
const imageBase64Preview = ref('') // 本地文件读出的 base64 dataURL
const imageBase64Name = ref('') // 本地文件名
const imageServerUrl = ref('') // 服务器上传后返回的 url
const imageServerName = ref('') // 服务器文件名
const imageUploading = ref(false) // 服务器上传中

/** 打开模态框并清空历史输入 */
function openImageModal() {
  imageUrl.value = ''
  imageActiveTab.value = 'url'
  imageBase64Preview.value = ''
  imageBase64Name.value = ''
  imageServerUrl.value = ''
  imageServerName.value = ''
  imageUploading.value = false
  imageModalOpen.value = true
}

/** 关闭模态框并清空输入 */
function closeImageModal() {
  imageModalOpen.value = false
  imageUrl.value = ''
  imageActiveTab.value = 'url'
  imageBase64Preview.value = ''
  imageBase64Name.value = ''
  imageServerUrl.value = ''
  imageServerName.value = ''
}

/** 本地文件 -> FileReader -> base64 dataURL（不走服务器，离线可用）。
 *  由 a-upload-dragger 的 @change 触发：beforeUpload 返回 false 阻止自动上传，
 *  antd 仍会触发 change 且 info.file 即为原始 File（此时 originFileObj 为空，
 *  故用 file.originFileObj || file 兜底取真实文件对象）。 */
function onBase64Change(info: any) {
  const file = (info?.file?.originFileObj as File | undefined) || (info?.file as File | undefined)
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    imageBase64Preview.value = reader.result as string
    imageBase64Name.value = file.name
  }
  reader.onerror = () => message.error('图片读取失败')
  reader.readAsDataURL(file)
}

/** 服务器上传：通过 a-upload-dragger 的 customRequest 复用现有 props.uploadImage
 *  （由 RichTextEditor 注入，调用方自行实现 token/baseURL/域名拼接）。
 *  上传行为与旧 file input 入口完全一致，只是 UI 换成更现代的拖拽上传。 */
async function onServerUpload(options: any) {
  const file: File = options.file as File
  if (!file) return
  imageUploading.value = true
  imageServerUrl.value = ''
  try {
    const url = await props.uploadImage(file)
    imageServerUrl.value = url
    imageServerName.value = file.name
    options.onSuccess?.(url, file)
  } catch (e: any) {
    message.error(e?.message || '图片上传失败')
    options.onError?.(e)
  } finally {
    imageUploading.value = false
  }
}

/** 根据当前 Tab 把图片插入编辑器；返回 false 阻止 antd Modal 在校验失败时自动关闭 */
function insertImageViaModal(): boolean {
  const ed = props.editor
  try {
    if (imageActiveTab.value === 'url') {
      const url = imageUrl.value.trim()
      if (!url) {
        message.warning('请输入图片链接')
        return false
      }
      ed.chain().focus().setImage({ src: url }).run()
    } else if (imageActiveTab.value === 'base64') {
      if (!imageBase64Preview.value) {
        message.warning('请选择本地图片')
        return false
      }
      ed.chain().focus().setImage({ src: imageBase64Preview.value }).run()
    } else {
      if (!imageServerUrl.value) {
        message.warning('请先上传图片')
        return false
      }
      ed.chain().focus().setImage({ src: imageServerUrl.value }).run()
    }
    closeImageModal()
    return true
  } catch (e: any) {
    message.error(e?.message || '图片插入失败')
    return false
  }
}


// 工具函数：创建按钮
function createBtn(
  icon: any,
  onClick: () => void,
  opts: { active?: boolean; disabled?: boolean; title?: string } = {}
): VNode {
  return h(
    Tooltip,
    { title: opts.title, placement: 'top', mouseEnterDelay: 0 },
    {
      default: () =>
        h(
          Button,
          {
            type: 'text',
            size: 'small',
            class: ['rte-btn', { 'is-active': opts.active }],
            disabled: opts.disabled,
            onClick,
          },
          { default: () => h(icon) }
        ),
    }
  )
}

// 渲染控制函数
function renderControl(key: RteButton): VNode {
  const ed = props.editor
  // 读取 revision 建立响应式依赖
  void revision.value

  switch (key) {
    case 'undo':
      return createBtn(UndoOutlined, () => ed.chain().focus().undo().run(), {
        disabled: !ed.can().undo(),
        title: '撤销',
      })
    case 'redo':
      return createBtn(RedoOutlined, () => ed.chain().focus().redo().run(), {
        disabled: !ed.can().redo(),
        title: '重做',
      })
    case 'bold':
      return createBtn(BoldOutlined, () => ed.chain().focus().toggleBold().run(), {
        active: ed.isActive('bold'),
        title: '加粗',
      })
    case 'italic':
      return createBtn(ItalicOutlined, () => ed.chain().focus().toggleItalic().run(), {
        active: ed.isActive('italic'),
        title: '斜体',
      })
    case 'underline':
      return createBtn(UnderlineOutlined, () => ed.chain().focus().toggleUnderline().run(), {
        active: ed.isActive('underline'),
        title: '下划线',
      })
    case 'strike':
      return createBtn(StrikethroughOutlined, () => ed.chain().focus().toggleStrike().run(), {
        active: ed.isActive('strike'),
        title: '删除线',
      })
    case 'blockquote':
      return createBtn(BlockOutlined, () => ed.chain().focus().toggleBlockquote().run(), {
        active: ed.isActive('blockquote'),
        title: '引用',
      })
    case 'bulletList':
      return createBtn(UnorderedListOutlined, () => ed.chain().focus().toggleBulletList().run(), {
        active: ed.isActive('bulletList'),
        title: '无序列表',
      })
    case 'orderedList':
      return createBtn(OrderedListOutlined, () => ed.chain().focus().toggleOrderedList().run(), {
        active: ed.isActive('orderedList'),
        title: '有序列表',
      })
    case 'codeBlock':
      return createBtn(CodeOutlined, () => ed.chain().focus().toggleCodeBlock().run(), {
        active: ed.isActive('codeBlock'),
        title: '代码块',
      })
    case 'horizontalRule':
      return createBtn(MinusOutlined, () => ed.chain().focus().setHorizontalRule().run(), {
        title: '分割线',
      })
    case 'clearFormat':
      return createBtn(ClearOutlined, () => ed.chain().focus().unsetAllMarks().clearNodes().run(), {
        title: '清除格式',
      })
    case 'insertDate':
      return createBtn(CalendarOutlined, () => {
        const d = new Date()
        const txt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        ed.chain().focus().insertContent(txt).run()
      }, { title: '插入日期' })
    case 'alignLeft':
      return createBtn(AlignLeftOutlined, () => ed.chain().focus().setTextAlign('left').run(), {
        active: ed.isActive({ textAlign: 'left' }),
        title: '左对齐',
      })
    case 'alignCenter':
      return createBtn(AlignCenterOutlined, () => ed.chain().focus().setTextAlign('center').run(), {
        active: ed.isActive({ textAlign: 'center' }),
        title: '居中',
      })
    case 'alignRight':
      return createBtn(AlignRightOutlined, () => ed.chain().focus().setTextAlign('right').run(), {
        active: ed.isActive({ textAlign: 'right' }),
        title: '右对齐',
      })
    case 'alignJustify':
      return createBtn(AlignLeftOutlined, () => ed.chain().focus().setTextAlign('justify').run(), {
        active: ed.isActive({ textAlign: 'justify' }),
        title: '两端对齐',
      })
    case 'heading':
      return renderHeadingControl()
    case 'color':
      return renderColorControl('color')
    case 'backgroundColor':
      return renderColorControl('backgroundColor')
    case 'fontFamily':
      return renderSelectControl('字体', FONT_FAMILIES, ed.getAttributes('textStyle').fontFamily || '', (v) => {
        if (!v) ed.chain().focus().unsetFontFamily().run()
        else ed.chain().focus().setFontFamily(v).run()
      })
    case 'fontSize':
      return renderSelectControl('字号', FONT_SIZES, ed.getAttributes('textStyle').fontSize || '', (v) => {
        if (!v) ed.chain().focus().unsetFontSize().run()
        else ed.chain().focus().setFontSize(v).run()
      })
    case 'lineHeight':
      return renderSelectControl('行高', LINE_HEIGHTS, ed.getAttributes('paragraph').lineHeight || ed.getAttributes('heading').lineHeight || '', (v) => {
        if (!v) {
          if (ed.getAttributes('paragraph').lineHeight) ed.chain().focus().setParagraph().unsetLineHeight().run()
          else if (ed.getAttributes('heading').lineHeight) ed.chain().focus().unsetLineHeight().run()
        } else ed.chain().focus().setLineHeight(v).run()
      })
    case 'link':
      return renderLinkControl()
    case 'image':
      return renderImageControl()
    case 'video':
      return renderVideoControl()
    case 'table':
      return renderTableControl()
    case 'emoticon':
      return renderEmojiControl()
    case 'charmap':
      return renderCharMapControl()
    case 'searchReplace':
      return renderSearchControl()
    case 'preview':
      return createBtn(EyeOutlined, () => emit('preview'), { title: '预览' })
    case 'fullscreen':
      return createBtn(
        props.isFullscreen ? FullscreenExitOutlined : FullscreenOutlined,
        () => emit('fullscreen'),
        { title: props.isFullscreen ? '退出全屏' : '全屏' }
      )
    case 'source':
      return createBtn(CodeSandboxOutlined, () => emit('source'), { title: '查看源码' })
    case 'help':
      return createBtn(QuestionCircleOutlined, () => emit('help'), { title: '帮助' })
    default:
      return h('span')
  }
}

// 标题下拉
function renderHeadingControl(): VNode {
  const ed = props.editor
  const active = ed.isActive('heading') ? `h${ed.getAttributes('heading').level}` : 'paragraph'
  return h(
    Select as any,
    {
      value: active,
      size: 'small',
      style: 'width: 100px',
      options: HEADING_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
      onChange: (v: string) => {
        if (v === 'paragraph') {
          ed.chain().focus().setParagraph().run()
        } else {
          ed.chain().focus().toggleHeading({ level: Number(v.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
        }
      },
    },
    {
      suffixIcon: () => h(CaretDownOutlined),
    }
  )
}

// 下拉选择
function renderSelectControl(
  label: string,
  options: { label: string; value: string }[],
  value: string,
  onChange: (v: string) => void
): VNode {
  return h(
    Select as any,
    {
      value,
      size: 'small',
      style: 'width: 90px',
      placeholder: label,
      options,
      onChange,
    },
    {
      suffixIcon: () => h(CaretDownOutlined),
    }
  )
}

// 颜色控制
function renderColorControl(kind: 'color' | 'backgroundColor'): VNode {
  const ed = props.editor
  const cur = (ed.getAttributes('textStyle')[kind] as string) || ''
  const set = (c: string) =>
    kind === 'color'
      ? ed.chain().focus().setColor(c).run()
      : ed.chain().focus().setBackgroundColor(c).run()
  const unset = () =>
    kind === 'color' ? ed.chain().focus().unsetColor().run() : ed.chain().focus().unsetBackgroundColor().run()

  const icon = kind === 'color' ? FontColorsOutlined : BgColorsOutlined
  const title = kind === 'color' ? '文字颜色' : '背景颜色'

  const content = () =>
    h('div', { class: 'rte-color-panel' }, [
      h('div', { class: 'rte-color-grid' },
        COLOR_PALETTE.map((c) =>
          h('span', {
            class: ['rte-color-dot', { 'is-active': c === cur }],
            style: { background: c },
            onClick: () => set(c),
          })
        )
      ),
      h('div', { class: 'rte-color-row' }, [
        h('input', {
          type: 'color',
          value: cur || '#000000',
          onInput: (ev: Event) => set((ev.target as HTMLInputElement).value),
        }),
        h(
          Button,
          { size: 'small', type: 'link', danger: true, onClick: unset },
          { default: () => '清除' }
        ),
      ]),
    ])

  return h(
    Popover,
    {
      trigger: 'click',
      placement: 'bottom',
      overlayClassName: 'rte-color-popover',
    },
    {
      content: content,
      default: () =>
        h(
          Tooltip,
          { title, placement: 'top', mouseEnterDelay: 0 },
          {
            default: () =>
              h(
                Button,
                {
                  type: 'text',
                  size: 'small',
                  class: 'rte-btn',
                  style: { borderBottom: `2px solid ${cur || 'transparent'}` },
                },
                { default: () => h(icon) }
              ),
          }
        ),
    }
  )
}

// 链接控制
function renderLinkControl(): VNode {
  const ed = props.editor
  const url = ref((ed.getAttributes('link').href as string) || '')

  const content = () =>
    h('div', { class: 'rte-link-panel' }, [
      h(Input, {
        value: url.value,
        placeholder: '请输入链接地址',
        'onUpdate:value': (v: string) => { url.value = v },
      }),
      h('div', { class: 'rte-link-actions' }, [
        h(
          Button,
          {
            type: 'primary',
            size: 'small',
            onClick: () => {
              if (url.value) {
                ed.chain().focus().extendMarkRange('link').setLink({ href: url.value }).run()
              } else {
                ed.chain().focus().extendMarkRange('link').unsetLink().run()
              }
            },
          },
          { default: () => '确定' }
        ),
        h(
          Button,
          { size: 'small', onClick: () => ed.chain().focus().extendMarkRange('link').unsetLink().run() },
          { default: () => '移除' }
        ),
      ]),
    ])

  return h(
    Popover,
    { trigger: 'click', placement: 'bottom'},
    {
      content: content,
      default: () =>
        h(
          Tooltip,
          { title: '链接', placement: 'top', mouseEnterDelay: 0 },
          {
            default: () =>
              h(
                Button,
                {
                  type: 'text',
                  size: 'small',
                  class: ['rte-btn', { 'is-active': ed.isActive('link') }],
                },
                { default: () => h(LinkOutlined) }
              ),
          }
        ),
    }
  )
}

// 图片控制：点击按钮打开统一图片插入模态框（链接 / 本地 Base64 / 服务器）
function renderImageControl(): VNode {
  return h(
    Tooltip,
    { title: '图片', placement: 'top', mouseEnterDelay: 0 },
    {
      default: () =>
        h(
          Button,
          {
            type: 'text',
            size: 'small',
            class: 'rte-btn',
            onClick: openImageModal,
          },
          { default: () => h(PictureOutlined) }
        ),
    }
  )
}

// 视频控制
function renderVideoControl(): VNode {
  const ed = props.editor
  const src = ref('')

  const content = () =>
    h('div', { class: 'rte-link-panel' }, [
      h(Input, {
        value: src.value,
        placeholder: '视频地址 URL',
        'onUpdate:value': (v: string) => { src.value = v },
      }),
      h('div', { class: 'rte-link-actions' }, [
        h(
          Button,
          {
            type: 'primary',
            size: 'small',
            onClick: () => {
              if (src.value) {
                ed.chain().focus().setVideo(src.value).run()
                src.value = ''
              }
            },
          },
          { default: () => '插入视频' }
        ),
      ]),
    ])

  return h(
    Popover,
    { trigger: 'click', placement: 'bottom'},
    {
      content: content,
      default: () =>
        h(
          Tooltip,
          { title: '视频', placement: 'top', mouseEnterDelay: 0 },
          {
            default: () =>
              h(Button, { type: 'text', size: 'small', class: 'rte-btn' }, { default: () => h(VideoCameraOutlined) }),
          }
        ),
    }
  )
}

// 表格控制
function renderTableControl(): VNode {
  const ed = props.editor
  const hoverRow = ref(-1)
  const hoverCol = ref(-1)

  const content = () =>
    h('div', { class: 'rte-table-picker' }, [
      h(
        'div',
        { class: 'rte-table-grid' },
        Array.from({ length: 64 }, (_, i) => {
          const r = Math.floor(i / 8)
          const c = i % 8
          return h('span', {
            class: ['rte-grid-cell', { 'is-active': r <= hoverRow.value && c <= hoverCol.value }],
            onMouseenter: () => {
              hoverRow.value = r
              hoverCol.value = c
            },
            onClick: () => {
              ed.chain().focus().insertTable({ rows: r + 1, cols: c + 1, withHeaderRow: true }).run()
            },
          })
        })
      ),
      h(
        'div',
        { class: 'rte-table-hint' },
        hoverRow.value >= 0 && hoverCol.value >= 0
          ? `${hoverRow.value + 1} × ${hoverCol.value + 1} 表格`
          : '选择表格大小'
      ),
    ])

  return h(
    Popover,
    { trigger: 'click', placement: 'bottom',  overlayClassName: 'rte-table-popover' },
    {
      content: content,
      default: () =>
        h(
          Tooltip,
          { title: '表格', placement: 'top', mouseEnterDelay: 0 },
          {
            default: () =>
              h(Button, { type: 'text', size: 'small', class: 'rte-btn' }, { default: () => h(TableOutlined) }),
          }
        ),
    }
  )
}

// 表情控制
function renderEmojiControl(): VNode {
  const ed = props.editor

  const content = () =>
    h(
      'div',
      { class: 'rte-emoji-grid' },
      EMOJIS.map((em) =>
        h('span', {
          class: 'rte-emoji',
          onClick: () => ed.chain().focus().insertContent(em).run(),
        }, em)
      )
    )

  return h(
    Popover,
    { trigger: 'click', placement: 'bottom'},
    {
      content: content,
      default: () =>
        h(
          Tooltip,
          { title: '表情', placement: 'top', mouseEnterDelay: 0 },
          {
            default: () =>
              h(Button, { type: 'text', size: 'small', class: 'rte-btn' }, { default: () => h(SmileOutlined) }),
          }
        ),
    }
  )
}

// 特殊字符控制
function renderCharMapControl(): VNode {
  const ed = props.editor

  const content = () =>
    h(
      'div',
      { class: 'rte-emoji-grid' },
      CHARS.map((c) =>
        h('span', {
          class: 'rte-emoji',
          onClick: () => ed.chain().focus().insertContent(c).run(),
        }, c)
      )
    )

  return h(
    Popover,
    { trigger: 'click', placement: 'bottom'},
    {
      content: content,
      default: () =>
        h(
          Tooltip,
          { title: '特殊字符', placement: 'top', mouseEnterDelay: 0 },
          {
            default: () =>
              h(Button, { type: 'text', size: 'small', class: 'rte-btn' }, { default: () => h(AppstoreOutlined) }),
          }
        ),
    }
  )
}

// 查找替换控制
function renderSearchControl(): VNode {
  const ed = props.editor
  const term = ref('')
  const repl = ref('')

  const content = () =>
    h('div', { class: 'rte-search-panel' }, [
      h(Input, {
        value: term.value,
        placeholder: '查找',
        'onUpdate:value': (v: string) => {
          term.value = v
          ed.commands.setSearchTerm(v)
        },
      }),
      h(Input, {
        value: repl.value,
        placeholder: '替换为',
        'onUpdate:value': (v: string) => { repl.value = v },
      }),
      h('div', { class: 'rte-link-actions' }, [
        h(
          Button,
          { size: 'small', onClick: () => ed.commands.replaceNext(repl.value) },
          { default: () => '替换下一处' }
        ),
        h(
          Button,
          { size: 'small', onClick: () => ed.commands.replaceAll(repl.value) },
          { default: () => '全部替换' }
        ),
      ]),
    ])

  return h(
    Popover,
    { trigger: 'click', placement: 'bottom'},
    {
      content: content,
      default: () =>
        h(
          Tooltip,
          { title: '查找替换', placement: 'top', mouseEnterDelay: 0 },
          {
            default: () =>
              h(Button, { type: 'text', size: 'small', class: 'rte-btn' }, { default: () => h(SearchOutlined) }),
          }
        ),
    }
  )
}
</script>

<style lang="scss">
.rte-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid hsl(var(--border) / 0.6);
  background: hsl(var(--muted) / 0.25);
}

.rte-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &.is-active {
    background: hsl(var(--primary) / 0.14);
    color: hsl(var(--primary));
  }
}

// 颜色面板
.rte-color-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;
}

.rte-color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
}

.rte-color-dot {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid hsl(var(--border));
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.1);
  }

  &.is-active {
    outline: 2px solid hsl(var(--primary));
    outline-offset: 1px;
  }
}

.rte-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  input[type='color'] {
    width: 28px;
    height: 24px;
    border: none;
    background: none;
    cursor: pointer;
  }
}

// 链接/视频面板
.rte-link-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
}

.rte-link-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

// 表格选择器
.rte-table-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rte-table-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.rte-grid-cell {
  width: 18px;
  height: 18px;
  border: 1px solid hsl(var(--border));
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: hsl(var(--primary) / 0.2);
  }

  &.is-active {
    background: hsl(var(--primary) / 0.5);
    border-color: hsl(var(--primary));
  }
}

.rte-table-hint {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

// 表情/特殊字符
.rte-emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  max-width: 200px;
}

.rte-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.15s;

  &:hover {
    background: hsl(var(--muted) / 0.7);
  }
}

// 查找替换
.rte-search-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
}

// 图片插入模态框（antd Modal teleport 到 body，故此处用全局选择器）
.rte-img-tab {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.rte-img-filename {
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  word-break: break-all;
}

.rte-img-preview {
  max-width: 100%;
  max-height: 180px;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  object-fit: contain;
  background: hsl(var(--muted) / 0.4);
}

// 拖拽上传区：紧凑、与模态框风格一致
.rte-img-dragger.ant-upload-dragger {
  margin: 0;
  padding: 14px 8px;

  .ant-upload-drag-icon {
    margin-bottom: 4px;
    font-size: 28px;
  }

  .ant-upload-text {
    font-size: 13px;
    margin: 0;
  }

  .ant-upload-hint {
    font-size: 12px;
    margin: 2px 0 0;
  }
}
</style>
