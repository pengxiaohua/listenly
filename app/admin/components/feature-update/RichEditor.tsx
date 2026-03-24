'use client'

import { useState, useEffect } from 'react'
import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
}

/**
 * 将 HTML 中的签名 OSS URL 替换为 ossKey（用于持久化存储）
 * 签名 URL 格式: https://bucket.oss-region.aliyuncs.com/content/xxx.jpg?OSSAccessKeyId=...&Expires=...&Signature=...
 * 替换为: oss-key://content/xxx.jpg
 */
function htmlToStorage(html: string): string {
  return html.replace(
    /https?:\/\/[^"]*?\/((content|cover-images)\/[a-f0-9-]+\.[a-z]+)\?[^"]*/g,
    'oss-key://$1'
  )
}

/**
 * 将 HTML 中的 oss-key:// 占位符替换为签名 URL（用于编辑器显示）
 */
async function storageToHtml(html: string): Promise<string> {
  const ossKeyPattern = /oss-key:\/\/((content|cover-images)\/[a-f0-9-]+\.[a-z]+)/g
  const keys: string[] = []
  let match
  while ((match = ossKeyPattern.exec(html)) !== null) {
    keys.push(match[1])
  }
  if (keys.length === 0) return html

  // 批量获取签名 URL
  let result = html
  for (const key of keys) {
    try {
      const res = await fetch(`/api/admin/sign-oss?key=${encodeURIComponent(key)}`)
      const data = await res.json()
      if (res.ok && data.url) {
        result = result.replace(`oss-key://${key}`, data.url)
      }
    } catch {
      // 保持原样
    }
  }
  return result
}

export default function RichEditor({ value, onChange }: RichEditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null)
  const [resolvedValue, setResolvedValue] = useState<string>('')
  const [ready, setReady] = useState(false)

  // 初始化时解析 oss-key:// 为签名 URL
  useEffect(() => {
    let cancelled = false
    storageToHtml(value).then(html => {
      if (!cancelled) {
        setResolvedValue(html)
        setReady(true)
      }
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- 只在初始化时解析一次

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [editor])

  const toolbarConfig: Partial<IToolbarConfig> = {
    toolbarKeys: [
      'bold', 'italic', 'underline', 'through',
      'color', 'bgColor',
      '|',
      'fontSize', 'lineHeight',
      '|',
      'bulletedList', 'numberedList',
      '|',
      'insertLink',
      'uploadImage',
      '|',
      'undo', 'redo',
    ]
  }

  const editorConfig: Partial<IEditorConfig> = {
    placeholder: '请输入更新内容...',
    MENU_CONF: {
      uploadImage: {
        async customUpload(file: File, insertFn: (url: string, alt?: string, href?: string) => void) {
          try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/admin/content/upload', {
              method: 'POST',
              body: formData
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || '上传失败')

            // 用签名 URL 在编辑器中显示，保存时会自动转为 oss-key://
            const signRes = await fetch(`/api/admin/sign-oss?key=${encodeURIComponent(data.ossKey)}`)
            const signData = await signRes.json()
            if (!signRes.ok) throw new Error(signData.error || '获取图片地址失败')

            insertFn(signData.url, file.name)
          } catch (error) {
            console.error('上传图片失败:', error)
            alert('上传图片失败')
          }
        },
        maxFileSize: 5 * 1024 * 1024,
        allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      }
    }
  }

  if (!ready) {
    return (
      <div className="border rounded-lg h-[350px] flex items-center justify-center text-slate-400">
        加载编辑器...
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="simple"
        style={{ borderBottom: '1px solid #e2e8f0' }}
      />
      <Editor
        defaultConfig={editorConfig}
        value={resolvedValue}
        onCreated={setEditor}
        onChange={(editor) => {
          const html = editor.getHtml()
          // 保存时将签名 URL 转为 oss-key:// 格式
          onChange(htmlToStorage(html))
        }}
        mode="simple"
        style={{ height: '300px', overflowY: 'auto' }}
      />
    </div>
  )
}
