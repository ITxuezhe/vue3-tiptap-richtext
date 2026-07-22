// 主题变量兜底：引入后保证开箱即用（宿主已提供同名变量时可不引入，但重复引入无害）
import './styles/theme.css'

// 主组件
export { default as RichTextEditor } from './RichTextEditor.vue'

// 工具栏按钮预设与类型
export {
  RICH_TEXT_DEFAULT_BUTTONS,
  RICH_TEXT_FULL_BUTTONS,
  RICH_TEXT_MOBILE_BUTTONS,
} from './config/richTextPresets'
export type { RteButton } from './config/richTextPresets'

// 自定义扩展注册表（可单独复用）
export { createExtensions, RTE_EXTENSION_NAMES } from './components/rich-text/extensions'

// Pro 接入点类型
export type { ProExtension, ProFeatureId } from './pro/types'
