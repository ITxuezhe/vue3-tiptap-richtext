<template>
  <div class="demo-wrap">
    <h1>vue3-tiptap-richtext</h1>
    <p class="desc">Vue 3 + TipTap v3 富文本编辑器 · 基础版（MIT 开源）</p>

    <RichTextEditor
      v-model="html"
      height="600px"
      :buttons="RICH_TEXT_FULL_BUTTONS"
      :upload-image="uploadImage"
      image-size-hint="建议图片小于 5MB，支持 jpg/png/gif"
    />

    <h3>实时 HTML（v-model）</h3>
    <pre class="html-out">{{ html }}</pre>

    <section class="pro-banner">
      <h3>⭐ Pro 高级功能（独立私有包）</h3>
      <p>AI 写作 / 多人协同 / 导出 PDF·Word / 模板库 / 评论批注 / 公式·流程图 …</p>
      <p class="muted">基础版已包含全部编辑器与自定义工具，永久免费开源。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RichTextEditor, { RICH_TEXT_FULL_BUTTONS } from '../src'

const html = ref(
  '<h2>欢迎使用 vue3-tiptap-richtext</h2>' +
    '<p>这是一个<strong>开源</strong>的 Vue 3 富文本编辑器，内置字号、行高、背景色、视频、锚点、分页符、查找替换等自定义工具。</p>' +
    '<ul><li>选中文字体验浮动工具条</li><li>点击工具栏「全屏」「源码」「预览」</li></ul>',
)

// 演示用：本地把图片转 base64 直接返回（真实项目应替换为你的上传接口）
async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取失败'))
    reader.readAsDataURL(file)
  })
}
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif;
  background: #f5f7fa;
}
.demo-wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 80px;
}
.demo-wrap h1 {
  font-size: 24px;
  margin: 0 0 4px;
}
.desc {
  color: #666;
  margin: 0 0 20px;
}
.html-out {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 6px;
  max-height: 240px;
  overflow: auto;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.pro-banner {
  margin-top: 32px;
  padding: 16px 20px;
  border: 1px dashed #1677ff;
  border-radius: 8px;
  background: #f0f7ff;
}
.pro-banner h3 {
  margin: 0 0 8px;
}
.pro-banner p {
  margin: 4px 0;
}
.pro-banner .muted {
  color: #888;
  font-size: 13px;
}
</style>
