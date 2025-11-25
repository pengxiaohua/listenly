'use client'

import AdminLayout from './components/AdminLayout'
import CatalogManager from './components/catalog/CatalogManager'
import WordSetManager from './components/word/WordSetManager'
import SentenceSetManager from './components/sentence/SentenceSetManager'
import ShadowingSetManager from './components/shadowing/ShadowingSetManager'
import ContentImportCenter from './components/import/ContentImportCenter'
import ContentConfigManager from './components/config/ContentConfigManager'
import UserAdminPage from './components/user/UserAdminPage'
import FeedbackAdminPage from './components/feedback/FeedbackAdminPage'

export default function AdminPage() {
  return (
    <AdminLayout
      pages={[
        { slug: 'catalogs', label: '目录管理', element: <CatalogManager /> },
        { slug: 'word-sets', label: '单词内容', element: <WordSetManager /> },
        { slug: 'sentence-sets', label: '句子内容', element: <SentenceSetManager /> },
        { slug: 'shadowing-sets', label: '跟读内容', element: <ShadowingSetManager /> },
        { slug: 'import', label: '内容导入', element: <ContentImportCenter /> },
        { slug: 'config', label: '内容配置', element: <ContentConfigManager /> },
        { slug: 'users', label: '用户管理', element: <UserAdminPage /> },
        { slug: 'feedback', label: '反馈管理', element: <FeedbackAdminPage /> },
      ]}
    />
  )
}
