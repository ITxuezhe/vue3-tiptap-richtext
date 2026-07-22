# vue3-tiptap-richtext

基于 **Vue 3 + TipTap v3** 的富文本编辑器组件库，内置字体 / 行高 / 背景色 / 视频 / 锚点 / 分页符 / 查找替换等自定义工具。

> 商业模式：**Open-Core 双层**。基础版（本仓库）永久 **MIT 免费开源**；高级功能（AI、协同、导出等）由独立私有包 `vue3-tiptap-richtext-pro` 提供，详见文末「Pro 套餐」。

---

## 特性

- 基于 TipTap v3 + Vue 3，headless 架构
- **38 种工具栏按钮**预设：默认精简 / 全功能 / 移动端三套
- 自研扩展：字号、行高、背景色、锚点、视频、分页符、保真节点（div/span）、查找替换
- 选区浮动工具条（BubbleMenu）
- 全屏、源码编辑、实时预览
- 响应式：移动端自适应 + 工具栏溢出折叠（sliding）
- 图片三通道插入：链接 URL / 本地 Base64 / 服务器上传
- 与蓝豚等任何业务系统**零耦合**，上传 / 域名拼接交予调用方

---

## 安装

```bash
npm i vue3-tiptap-richtext
# 运行期依赖（peerDependencies，需宿主应用提供）
npm i vue ant-design-vue @tiptap/core @tiptap/vue-3 @tiptap/pm
```

---

## 快速使用

```vue
<script setup lang="ts">
import { ref } from 'vue'
import RichTextEditor, { RICH_TEXT_FULL_BUTTONS } from 'vue3-tiptap-richtext'
import 'vue3-tiptap-richtext/style.css' // 引入主题变量与编辑器样式

const html = ref('<p>你好，富文本世界</p>')

// 上传逻辑由你实现（token / baseURL / 域名拼接都在这里）
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  return data.url
}
</script>

<template>
  <RichTextEditor
    v-model="html"
    :buttons="RICH_TEXT_FULL_BUTTONS"
    :upload-image="uploadImage"
    height="500px"
    image-size-hint="建议图片小于 5MB"
  />
</template>
```

> 使用打包器（Vite 等）时，组件样式会随 `vue3-tiptap-richtext/style.css` 自动引入；若未生效请显式 `import 'vue3-tiptap-richtext/style.css'`。

---

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `string` | — | HTML 内容（v-model 双向绑定） |
| `placeholder` | `string` | `'请输入内容...'` | 占位文本 |
| `height` | `string` | `'500px'` | 编辑区高度，`'auto'` 为自适应高度 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `buttons` | `RteButton[][]` | `RICH_TEXT_DEFAULT_BUTTONS` | 工具栏按钮组（二维数组，子数组为分隔分组） |
| `toolbarMode` | `'wrap' \| 'sliding' \| 'floating'` | `'wrap'` | 溢出模式，移动端自动转 `sliding` |
| `responsive` | `boolean` | `true` | 是否启用移动端自适应 |
| `mobileButtons` | `RteButton[][]` | `RICH_TEXT_MOBILE_BUTTONS` | 自定义移动端按钮组 |
| `imageSizeHint` | `string` | — | 编辑器下方图片上传提示文案 |
| `imageMaxSizeMB` | `number` | `5` | 单图大小上限（MB） |
| `uploadImage` | `(file: File) => Promise<string>` | — | 服务器上传处理函数；不传则「服务器上传」入口不可用 |
| `extraExtensions` | `Extensions` | — | 额外 TipTap 扩展（**Pro 套餐零侵入注入点**） |
| `enableCharCount` | `boolean` | `false` | 是否开启字符计数 |

可用按钮见 `RteButton` 类型（`src/config/richTextPresets.ts`），含 `undo` `redo` `heading` `fontFamily` `fontSize` `bold` `italic` `underline` `strike` `color` `backgroundColor` `align*` `lineHeight` `bulletList` `orderedList` `blockquote` `link` `image` `video` `table` `codeBlock` `horizontalRule` `clearFormat` `insertDate` `pageBreak` `emoticon` `charmap` `anchor` `searchReplace` `preview` `fullscreen` `source` `help` 等。

---

## 自定义扩展复用

可直接复用内置扩展注册表，自行组装编辑器：

```ts
import { createExtensions, RTE_EXTENSION_NAMES } from 'vue3-tiptap-richtext'
// createExtensions(placeholder) 返回全部扩展数组
// RTE_EXTENSION_NAMES 列出本库自研扩展名
```

---

## Pro 套餐（高级功能）

高级能力由**独立私有包** `vue3-tiptap-richtext-pro` 提供，通过免费编辑器的 `extraExtensions` 插槽零侵入注入，无需 fork 或修改核心：

```vue
<script setup lang="ts">
import RichTextEditor from 'vue3-tiptap-richtext'
import { proExtensions } from 'vue3-tiptap-richtext-pro' // 私有包

const html = ref('')
</script>

<template>
  <RichTextEditor v-model="html" :extra-extensions="proExtensions" />
</template>
```

规划中的 Pro 能力：

- 🤖 AI 写作 / 续写 / 改写 / 翻译
- 👥 多人协同编辑（Yjs / WebSocket）
- 📤 导出 PDF / Word / Markdown
- 📚 文档模板库 / 区块模板
- 💬 评论批注（review）、版本历史
- ∑ 数学公式（LaTeX）、流程图 / 思维导图
- 🔒 水印 / 防复制 / 权限管控

> Pro 包为商业授权，不在本公开仓库提供实现。接入细节见 Pro 文档。

---

## 赞助 / Sponsor

如果这个项目对你有帮助，欢迎请作者喝杯咖啡 ☕，扫码赞助：

| 微信 | 支付宝 |
|------|--------|
| ![微信收款码](./docs/wechat-qr.png) | ![支付宝收款码](./docs/alipay-qr.png) |

> 将你的收款码图片命名为 `wechat-qr.png` / `alipay-qr.png` 放入 `docs/` 目录即可显示。

---

## 许可证

[MIT](./LICENSE) © med
