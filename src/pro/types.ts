import type { Extensions } from '@tiptap/core'

/**
 * Pro 接入点类型定义（免费核心仅保留接口与文档，不含实现）。
 *
 * 商业模式：基础版（本仓库，MIT 开源）包含编辑器与全部基础自定义工具；
 * 高级功能（AI 助手、多人协同、导出 PDF/Word、模板库、评论批注、公式/流程图等）
 * 由独立私有包 `vue3-tiptap-richtext-pro` 提供。
 *
 * 接入方式：Pro 包导出一组 TipTap 扩展（或高阶组件），调用方通过
 * <RichTextEditor :extra-extensions="proExtensions" /> 零侵入注入免费编辑器，
 * 无需 fork 或修改核心代码。这正是 TipTap 扩展机制的天然优势。
 */
export type ProExtension = Extensions

/** Pro 功能标识（用于免费层占位/文档，实际实现在 Pro 私有包） */
export type ProFeatureId =
  | 'ai'
  | 'collaboration'
  | 'export'
  | 'templates'
  | 'comments'
  | 'math'
  | 'diagram'
  | 'watermark'
