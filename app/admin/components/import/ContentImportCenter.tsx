'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface WordSet {
  id: number
  name: string
  slug: string
}

interface SentenceSet {
  id: number
  name: string
  slug: string
}

interface ShadowingSet {
  id: number
  name: string
  slug: string
}

interface ImportResult {
  success: boolean
  message: string
  successCount: number
  failedCount: number
  errors?: Array<{ index: number; error: string; data: Record<string, unknown> }>
}

export default function ContentImportCenter() {
  const [activeTab, setActiveTab] = useState('word')

  // 单词导入状态
  const [wordSets, setWordSets] = useState<WordSet[]>([])
  const [selectedWordSet, setSelectedWordSet] = useState<string>('')
  const [wordFile, setWordFile] = useState<File | null>(null)
  const [wordImporting, setWordImporting] = useState(false)
  const [wordResult, setWordResult] = useState<ImportResult | null>(null)

  // 句子导入状态
  const [sentenceSets, setSentenceSets] = useState<SentenceSet[]>([])
  const [selectedSentenceSet, setSelectedSentenceSet] = useState<string>('')
  const [sentenceFile, setSentenceFile] = useState<File | null>(null)
  const [sentenceImporting, setSentenceImporting] = useState(false)
  const [sentenceResult, setSentenceResult] = useState<ImportResult | null>(null)

  // 跟读导入状态
  const [shadowingSets, setShadowingSets] = useState<ShadowingSet[]>([])
  const [selectedShadowingSet, setSelectedShadowingSet] = useState<string>('')
  const [shadowingFile, setShadowingFile] = useState<File | null>(null)
  const [shadowingImporting, setShadowingImporting] = useState(false)
  const [shadowingResult, setShadowingResult] = useState<ImportResult | null>(null)

  // 加载单词集列表
  useEffect(() => {
    fetchWordSets()
  }, [])

  // 加载句子集列表
  useEffect(() => {
    fetchSentenceSets()
  }, [])

  // 加载跟读集列表
  useEffect(() => {
    fetchShadowingSets()
  }, [])

  const fetchWordSets = async () => {
    try {
      const res = await fetch('/api/admin/word-set?pageSize=1000')
      if (res.ok) {
        const result = await res.json()
        setWordSets(result.data?.items || [])
      }
    } catch (error) {
      console.error('加载单词集失败:', error)
    }
  }

  const fetchShadowingSets = async () => {
    try {
      const res = await fetch('/api/admin/shadowing-set?pageSize=1000')
      if (res.ok) {
        const result = await res.json()
        setShadowingSets(result.data?.items || [])
      }
    } catch (error) {
      console.error('加载跟读集失败:', error)
    }
  }

  const fetchSentenceSets = async () => {
    try {
      const res = await fetch('/api/admin/sentence-set?pageSize=1000')
      if (res.ok) {
        const result = await res.json()
        setSentenceSets(result.data?.items || [])
      }
    } catch (error) {
      console.error('加载句子集失败:', error)
    }
  }

  const handleWordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.json')) {
        setWordFile(file)
        setWordResult(null)
      } else {
        alert('请选择 JSON 文件')
      }
    }
  }

  const handleSentenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.json')) {
        setSentenceFile(file)
        setSentenceResult(null)
      } else {
        alert('请选择 JSON 文件')
      }
    }
  }

  const handleShadowingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.endsWith('.json')) {
        setShadowingFile(file)
        setShadowingResult(null)
      } else {
        alert('请选择 JSON 文件')
      }
    }
  }

  const handleWordImport = async () => {
    if (!selectedWordSet) {
      alert('请选择单词集')
      return
    }
    if (!wordFile) {
      alert('请选择文件')
      return
    }

    setWordImporting(true)
    setWordResult(null)

    try {
      // 读取文件内容
      const fileContent = await wordFile.text()
      const jsonData = JSON.parse(fileContent)

      if (!Array.isArray(jsonData)) {
        throw new Error('JSON 文件格式错误，应该是数组格式')
      }

      // 调用导入 API
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'WORD',
          setId: parseInt(selectedWordSet),
          data: jsonData,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setWordResult(result)
        // 清空文件选择
        setWordFile(null)
        const fileInput = document.getElementById('word-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        alert(result.error || '导入失败')
      }
    } catch (error) {
      console.error('导入失败:', error)
      alert(error instanceof Error ? error.message : '导入失败')
    } finally {
      setWordImporting(false)
    }
  }

  const handleSentenceImport = async () => {
    if (!selectedSentenceSet) {
      alert('请选择句子集')
      return
    }
    if (!sentenceFile) {
      alert('请选择文件')
      return
    }

    setSentenceImporting(true)
    setSentenceResult(null)

    try {
      // 读取文件内容
      const fileContent = await sentenceFile.text()
      const jsonData = JSON.parse(fileContent)

      if (!Array.isArray(jsonData)) {
        throw new Error('JSON 文件格式错误，应该是数组格式')
      }

      // 调用导入 API
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SENTENCE',
          setId: parseInt(selectedSentenceSet),
          data: jsonData,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setSentenceResult(result)
        // 清空文件选择
        setSentenceFile(null)
        const fileInput = document.getElementById('sentence-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        alert(result.error || '导入失败')
      }
    } catch (error) {
      console.error('导入失败:', error)
      alert(error instanceof Error ? error.message : '导入失败')
    } finally {
      setSentenceImporting(false)
    }
  }

  const handleShadowingImport = async () => {
    if (!selectedShadowingSet) {
      alert('请选择跟读集')
      return
    }
    if (!shadowingFile) {
      alert('请选择文件')
      return
    }

    setShadowingImporting(true)
    setShadowingResult(null)

    try {
      const fileContent = await shadowingFile.text()
      const jsonData = JSON.parse(fileContent)

      if (!Array.isArray(jsonData)) {
        throw new Error('JSON 文件格式错误，应该是数组格式')
      }

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SHADOWING',
          setId: parseInt(selectedShadowingSet),
          data: jsonData,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setShadowingResult(result)
        setShadowingFile(null)
        const fileInput = document.getElementById('shadowing-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        alert(result.error || '导入失败')
      }
    } catch (error) {
      console.error('导入失败:', error)
      alert(error instanceof Error ? error.message : '导入失败')
    } finally {
      setShadowingImporting(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">内容导入中心</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="word">单词导入</TabsTrigger>
          <TabsTrigger value="sentence">句子导入</TabsTrigger>
          <TabsTrigger value="shadowing">跟读导入</TabsTrigger>
        </TabsList>

        {/* 单词导入 */}
        <TabsContent value="word" className="space-y-4 mt-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">导入单词</h3>

            <div className="space-y-4">
              {/* 选择单词集 */}
              <div>
                <label className="block text-sm font-medium mb-2">选择单词集</label>
                <Select value={selectedWordSet} onValueChange={setSelectedWordSet}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="请选择单词集" />
                  </SelectTrigger>
                  <SelectContent>
                    {wordSets.map((set) => (
                      <SelectItem key={set.id} value={String(set.id)}>
                        {set.name} ({set.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 选择文件 */}
              <div>
                <label className="block text-sm font-medium mb-2">选择 JSON 文件</label>
                <input
                  id="word-file-input"
                  type="file"
                  accept=".json"
                  onChange={handleWordFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {wordFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    已选择: {wordFile.name}
                  </p>
                )}
              </div>

              {/* 数据格式说明 */}
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-medium mb-2">JSON 数据格式:</p>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                  {`[
                    {
                      "word": "abandon",
                      "phoneticUS": "əˈbændən",
                      "phoneticUK": "əˈbændən",
                      "definition": "v. to leave somebody...",
                      "translation": "vt. 放弃, 抛弃...",
                      "exchange": "d:abandoned/p:abandoned/..."
                    }
                  ]`}
                </pre>
              </div>

              {/* 导入按钮 */}
              <Button
                onClick={handleWordImport}
                disabled={!selectedWordSet || !wordFile || wordImporting}
                className="w-full"
              >
                {wordImporting ? '导入中...' : '开始导入'}
              </Button>

              {/* 导入结果 */}
              {wordResult && (
                <div className={`p-4 rounded-md ${wordResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                  <p className="font-medium mb-1">{wordResult.message}</p>
                  <p className="text-sm">成功: {wordResult.successCount} 条</p>
                  <p className="text-sm">失败: {wordResult.failedCount} 条</p>
                  {wordResult.errors && wordResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer text-red-600">
                        查看错误详情 (前 10 条)
                      </summary>
                      <div className="mt-2 text-xs space-y-1">
                        {wordResult.errors.map((err, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border">
                            <p>行 {err.index + 1}: {err.error}</p>
                            <p className="text-gray-600">数据: {JSON.stringify(err.data)}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 句子导入 */}
        <TabsContent value="sentence" className="space-y-4 mt-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">导入句子</h3>

            <div className="space-y-4">
              {/* 选择句子集 */}
              <div>
                <label className="block text-sm font-medium mb-2">选择句子集</label>
                <Select value={selectedSentenceSet} onValueChange={setSelectedSentenceSet}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="请选择句子集" />
                  </SelectTrigger>
                  <SelectContent>
                    {sentenceSets.map((set) => (
                      <SelectItem key={set.id} value={String(set.id)}>
                        {set.name} ({set.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 选择文件 */}
              <div>
                <label className="block text-sm font-medium mb-2">选择 JSON 文件</label>
                <input
                  id="sentence-file-input"
                  type="file"
                  accept=".json"
                  onChange={handleSentenceFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {sentenceFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    已选择: {sentenceFile.name}
                  </p>
                )}
              </div>

              {/* 数据格式说明 */}
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-medium mb-2">JSON 数据格式:</p>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                  {`[
  {
    "text": "I love learning English.",
    "translation": "我喜欢学英语。"
  }
]`}
                </pre>
              </div>

              {/* 导入按钮 */}
              <Button
                onClick={handleSentenceImport}
                disabled={!selectedSentenceSet || !sentenceFile || sentenceImporting}
                className="w-full"
              >
                {sentenceImporting ? '导入中...' : '开始导入'}
              </Button>

              {/* 导入结果 */}
              {sentenceResult && (
                <div className={`p-4 rounded-md ${sentenceResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                  <p className="font-medium mb-1">{sentenceResult.message}</p>
                  <p className="text-sm">成功: {sentenceResult.successCount} 条</p>
                  <p className="text-sm">失败: {sentenceResult.failedCount} 条</p>
                  {sentenceResult.errors && sentenceResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer text-red-600">
                        查看错误详情 (前 10 条)
                      </summary>
                      <div className="mt-2 text-xs space-y-1">
                        {sentenceResult.errors.map((err, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border">
                            <p>行 {err.index + 1}: {err.error}</p>
                            <p className="text-gray-600">数据: {JSON.stringify(err.data)}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 跟读导入 */}
        <TabsContent value="shadowing" className="space-y-4 mt-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">导入跟读</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">选择跟读集</label>
              <Select value={selectedShadowingSet} onValueChange={setSelectedShadowingSet}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择跟读集" />
                </SelectTrigger>
                <SelectContent>
                  {shadowingSets.map((set) => (
                    <SelectItem key={set.id} value={String(set.id)}>
                      {set.name} ({set.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">选择 JSON 文件</label>
              <input
                id="shadowing-file-input"
                type="file"
                accept=".json"
                onChange={handleShadowingFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {shadowingFile && (
                <p className="text-sm text-gray-600 mt-2">
                  已选择: {shadowingFile.name}
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm font-medium mb-2">JSON 数据格式:</p>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
{`[
  {
    "text": "Good morning, how are you?",
    "translation": "早上好，你好吗？"
  }
]`}
              </pre>
            </div>

            <Button
              onClick={handleShadowingImport}
              disabled={!selectedShadowingSet || !shadowingFile || shadowingImporting}
              className="w-full"
            >
              {shadowingImporting ? '导入中...' : '开始导入'}
            </Button>

            {shadowingResult && (
              <div className={`p-4 rounded-md ${shadowingResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <p className="font-medium mb-1">{shadowingResult.message}</p>
                <p className="text-sm">成功: {shadowingResult.successCount} 条</p>
                <p className="text-sm">失败: {shadowingResult.failedCount} 条</p>
                {shadowingResult.errors && shadowingResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm cursor-pointer text-red-600">
                      查看错误详情 (前 10 条)
                    </summary>
                    <div className="mt-2 text-xs space-y-1">
                      {shadowingResult.errors.map((err, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border">
                          <p>行 {err.index + 1}: {err.error}</p>
                          <p className="text-gray-600">数据: {JSON.stringify(err.data)}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
