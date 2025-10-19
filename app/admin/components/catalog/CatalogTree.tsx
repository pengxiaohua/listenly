import { useMemo } from 'react'

interface TreeNode {
  id: string
  label: string
  level: number
  children: TreeNode[]
}

export default function CatalogTree() {
  const nodes = useMemo<TreeNode[]>(
    () => [
      { id: 'default', label: '默认分类', level: 1, children: [] },
    ],
    []
  )

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 h-full">
      <h2 className="text-lg font-semibold mb-3">目录结构</h2>
      <div className="text-sm text-gray-500">目录树功能待实现</div>
      <pre className="mt-3 text-xs text-gray-400 whitespace-pre-wrap">
        {JSON.stringify(nodes, null, 2)}
      </pre>
    </div>
  )
}
