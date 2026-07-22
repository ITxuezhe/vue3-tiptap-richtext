import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { fileURLToPath, URL } from 'node:url'

/**
 * 双模式构建：
 * - `vite`(dev) / `vite build --mode demo`：构建可运行的 Demo 展示页（根目录 index.html -> dist-demo）
 * - `vite build`（默认）：库构建（src/index.ts -> dist），输出 es/umd + 类型声明
 */
export default defineConfig(({ command, mode }) => {
  const isLib = command === 'build' && mode !== 'demo'

  if (isLib) {
    return {
      plugins: [
        vue(),
        dts({
          include: ['src'],
          tsconfigPath: 'tsconfig.app.json',
          outDir: 'dist',
        }),
      ],
      build: {
        lib: {
          entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
          name: 'Vue3TiptapRichtext',
          formats: ['es'],
          fileName: (format) => `vue3-tiptap-richtext.${format}.js`,
          // 抽取出的样式文件名，须与 package.json 的 exports["./style.css"] 对应
          cssFileName: 'style',
        },
        rollupOptions: {
          // 运行期依赖交予宿主应用提供（peerDependencies），避免重复实例
          external: [
            'vue',
            'ant-design-vue',
            '@ant-design/icons-vue',
            '@tiptap/core',
            '@tiptap/vue-3',
            '@tiptap/pm',
            /^@tiptap\//,
            'lowlight',
            'highlight.js',
            'tiptap-extension-global-drag-handle',
          ],
        },
      },
    }
  }

  // dev 预览 / 构建 demo 站点
  return {
    plugins: [vue()],
    build: {
      outDir: 'dist-demo',
    },
  }
})
