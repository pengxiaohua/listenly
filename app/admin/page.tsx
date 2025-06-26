'use client'

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [tab, setTab] = useState<'corpus' | 'sentence' | 'word' | 'user'>('corpus');

  // 语料库管理相关
  interface Corpus {
    id: number;
    name: string;
    ossDir: string;
    description?: string;
  }

  interface Sentence {
    id: number;
    index: number;
    text: string;
    corpusId: number;
  }

  // 用户管理相关
  interface User {
    id: string;
    userName: string;
    avatar: string;
    phone?: string;
    wechatOpenId?: string;
    createdAt: string;
    lastLogin: string;
  }

  const [corpora, setCorpora] = useState<Corpus[]>([]);
  const [newCorpus, setNewCorpus] = useState({ name: '', ossDir: '', description: '' });
  const [editCorpus, setEditCorpus] = useState<Corpus | null>(null);

  // 句子管理相关
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [selectedCorpusId, setSelectedCorpusId] = useState<number | null>(null);
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSentences, setTotalSentences] = useState(0);
  const pageSize = 20;

  // 单词管理相关
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // 用户管理相关
  const [users, setUsers] = useState<User[]>([]);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const userPageSize = 20;

  // 获取语料库列表
  useEffect(() => {
    fetch('/api/sentence/corpus')
      .then(res => res.json())
      .then(setCorpora)
  }, []);

  // 获取句子列表
  useEffect(() => {
    if (!selectedCorpusId) {
      setSentences([]);
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }

    fetch(`/api/sentence/admin?corpusId=${selectedCorpusId}&page=${currentPage}&pageSize=${pageSize}`)
      .then(res => res.json())
      .then(data => {
        setSentences(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalSentences(data.pagination.total);
      });
  }, [selectedCorpusId, currentPage]);

  // 获取用户列表
  useEffect(() => {
    if (tab === 'user') {
      fetch(`/api/user/list?page=${userCurrentPage}&pageSize=${userPageSize}`)
        .then(res => res.json())
        .then(data => {
          setUsers(data.users);
          setUserTotalPages(data.pagination.totalPages);
          setTotalUsers(data.pagination.total);
        });
    }
  }, [tab, userCurrentPage, userPageSize]);

  // 语料库增删改
  const addCorpus = async () => {
    if (!newCorpus.name) return alert('请输入语料库英文名');
    await fetch('/api/sentence/corpus', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCorpus)
    });
    setNewCorpus({ name: '', ossDir: '', description: '' });
    fetch('/api/sentence/corpus').then(res => res.json()).then(setCorpora);
  };
  const updateCorpus = async () => {
    if (!editCorpus) return;
    await fetch('/api/sentence/corpus', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editCorpus)
    });
    setEditCorpus(null);
    fetch('/api/sentence/corpus').then(res => res.json()).then(setCorpora);
  };
  const deleteCorpus = async (id:number) => {
    if (!window.confirm('确定删除？')) return;
    await fetch(`/api/sentence/corpus?id=${id}`, { method: 'DELETE' });
    fetch('/api/sentence/corpus').then(res => res.json()).then(setCorpora);
  };

  // 句子管理：上传txt批量新增
  const handleTxtUpload = async () => {
    if (!txtFile || !selectedCorpusId) return;
    const text = await txtFile.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      await fetch('/api/sentence/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corpusId: selectedCorpusId, index: i, text: lines[i] })
      });
    }
    setTxtFile(null);
    // 重新加载句子
    fetch(`/api/sentence/admin?corpusId=${selectedCorpusId}&page=${currentPage}&pageSize=${pageSize}`)
      .then(res => res.json())
      .then(data => {
        setSentences(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalSentences(data.pagination.total);
      });
  };
  // 删除句子
  const deleteSentence = async (id: number) => {
    if (!window.confirm('确定删除？')) return;
    await fetch(`/api/sentence/admin?id=${id}`, { method: 'DELETE' });
    // 重新加载当前页
    fetch(`/api/sentence/admin?corpusId=${selectedCorpusId}&page=${currentPage}&pageSize=${pageSize}`)
      .then(res => res.json())
      .then(data => {
        setSentences(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalSentences(data.pagination.total);
      });
  };

  // 渲染分页控件
  const renderPagination = () => {
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          共 {totalSentences} 条记录
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 cursor-pointer"
          >
            上一页
          </button>
          <span className="px-3 py-1">
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 cursor-pointer"
          >
            下一页
          </button>
        </div>
      </div>
    );
  };

  // 渲染用户分页控件
  const renderUserPagination = () => {
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          共 {totalUsers} 条记录
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setUserCurrentPage(p => Math.max(1, p - 1))}
            disabled={userCurrentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 cursor-pointer"
          >
            上一页
          </button>
          <span className="px-3 py-1">
            第 {userCurrentPage} / {userTotalPages} 页
          </span>
          <button
            onClick={() => setUserCurrentPage(p => Math.min(userTotalPages, p + 1))}
            disabled={userCurrentPage === userTotalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 cursor-pointer"
          >
            下一页
          </button>
        </div>
      </div>
    );
  };

  // 处理单词文件上传
  const handleWordFileUpload = async () => {
    if (!wordFile) {
      alert('请选择文件');
      return;
    }

    try {
      setUploadStatus('正在读取文件...');
      const text = await wordFile.text();
      const words = JSON.parse(text);

      setUploadStatus('正在上传数据...');
      const response = await fetch('/api/word/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(words)
      });

      const result = await response.json();
      if (result.success) {
        setUploadStatus(result.message);
        setWordFile(null);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('上传失败:', error);
      setUploadStatus(`上传失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex gap-4 mb-6">
        <button onClick={()=>setTab('corpus')} className={`cursor-pointer ${tab==='corpus'?"font-bold border-b-2 border-blue-500":""}`}>语料库管理</button>
        <button onClick={()=>setTab('sentence')} className={`cursor-pointer ${tab==='sentence'?"font-bold border-b-2 border-blue-500":""}`}>句子管理</button>
        <button onClick={()=>setTab('word')} className={`cursor-pointer ${tab==='word'?"font-bold border-b-2 border-blue-500":""}`}>单词管理</button>
        <button onClick={()=>setTab('user')} className={`cursor-pointer ${tab==='user'?"font-bold border-b-2 border-blue-500":""}`}>用户管理</button>
      </div>
      {tab==='corpus' && (
        <div>
          <h2 className="text-lg font-bold mb-2">语料库列表</h2>
          <table className="w-full mb-4 border">
            <thead><tr><th>ID</th><th>显示名称</th><th>OSS目录</th><th>描述</th><th>操作</th></tr></thead>
            <tbody>
              {corpora.map(c=>(
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{editCorpus?.id===c.id ?
                    <input value={editCorpus.name} onChange={e=>setEditCorpus({...editCorpus, name:e.target.value})} className="border p-1"/>
                    : c.name}
                  </td>
                  <td>{editCorpus?.id===c.id ?
                    <input value={editCorpus.ossDir} onChange={e=>setEditCorpus({...editCorpus, ossDir:e.target.value})} className="border p-1"/>
                    : c.ossDir}
                  </td>
                  <td>{editCorpus?.id===c.id ?
                    <input value={editCorpus.description || ''} onChange={e=>setEditCorpus({...editCorpus, description:e.target.value})} className="border p-1"/>
                    : c.description}
                  </td>
                  <td>
                    {editCorpus?.id===c.id ? (
                      <>
                        <button onClick={updateCorpus} className="text-green-600 mr-2 cursor-pointer">保存</button>
                        <button onClick={()=>setEditCorpus(null)} className="text-gray-600 cursor-pointer">取消</button>
                      </>
                    ) : (
                      <>
                        <button onClick={()=>setEditCorpus(c)} className="text-blue-600 mr-2 cursor-pointer">编辑</button>
                        <button onClick={()=>deleteCorpus(c.id)} className="text-red-600 cursor-pointer">删除</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mb-2">新增语料库</div>
          <input
            placeholder="显示名称"
            value={newCorpus.name}
            onChange={e=>setNewCorpus({...newCorpus, name:e.target.value})}
            className="border p-1 mr-2"
          />
          <input
            placeholder="OSS目录"
            value={newCorpus.ossDir}
            onChange={e=>setNewCorpus({...newCorpus, ossDir:e.target.value})}
            className="border p-1 mr-2"
          />
          <input
            placeholder="描述"
            value={newCorpus.description}
            onChange={e=>setNewCorpus({...newCorpus, description:e.target.value})}
            className="border p-1 mr-2"
          />
          <button onClick={addCorpus} className="bg-blue-500 text-white px-2 py-1 rounded cursor-pointer">新增</button>
        </div>
      )}
      {tab==='sentence' && (
        <div>
          <div className="mb-2">选择语料库：
            <select
              value={selectedCorpusId??''}
              onChange={e => {
                setSelectedCorpusId(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border p-1 rounded"
            >
              <option value="">请选择</option>
              {corpora.map(c=>(<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="mb-2">批量上传txt：
            <input
              type="file"
              accept=".txt"
              onChange={e=>setTxtFile(e.target.files?.[0]??null)}
              className="border p-1 rounded"
            />
            <button
              onClick={handleTxtUpload}
              className="ml-2 bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 cursor-pointer"
            >
              上传
            </button>
          </div>
          <h2 className="text-lg font-bold mb-2">句子列表</h2>
          <table className="w-full mb-4 border">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">内容</th>
                <th className="p-2 border">操作</th>
              </tr>
            </thead>
            <tbody>
              {sentences.map(s=>(
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{s.id}</td>
                  <td className="p-2 border">{s.text}</td>
                  <td className="p-2 border">
                    <button
                      onClick={()=>deleteSentence(s.id)}
                      className="text-red-600 hover:text-red-800 cursor-pointer"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedCorpusId && renderPagination()}
        </div>
      )}
      {tab==='word' && (
        <div className="max-w-4xl mx-auto mt-8">
          <h1 className="text-2xl font-bold mb-6">单词数据同步</h1>

          <div className="mb-4">
            <input
              type="file"
              accept=".json"
              onChange={e => setWordFile(e.target.files?.[0] ?? null)}
              className="border p-2 rounded mr-2"
            />
            <button
              onClick={handleWordFileUpload}
              disabled={!wordFile}
              className={`px-4 py-2 rounded ${!wordFile ? 'bg-gray-300' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
              上传
            </button>
          </div>
          {uploadStatus && (
            <div className={`p-4 rounded ${uploadStatus.includes('失败') ? 'bg-red-100' : 'bg-green-100'}`}>
              {uploadStatus}
            </div>
          )}
        </div>
      )}
      {tab==='user' && (
        <div>
          <h2 className="text-lg font-bold mb-2">用户列表</h2>
          <table className="w-full mb-4 border">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 border">用户ID</th>
                <th className="p-2 border">用户名</th>
                <th className="p-2 border">头像</th>
                <th className="p-2 border">手机号</th>
                <th className="p-2 border">微信OpenID</th>
                <th className="p-2 border">注册时间</th>
                <th className="p-2 border">最后登录</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-xs">{user.id}</td>
                  <td className="p-2 border">{user.userName}</td>
                  <td className="p-2 border">
                    <img src={user.avatar} alt="头像" className="w-8 h-8 rounded-full" onError={(e) => {
                      (e.target as HTMLImageElement).src = '/avatar.jpeg';
                    }} />
                  </td>
                  <td className="p-2 border">{user.phone || '-'}</td>
                  <td className="p-2 border text-xs">{user.wechatOpenId || '-'}</td>
                  <td className="p-2 border text-sm">{new Date(user.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="p-2 border text-sm">{new Date(user.lastLogin).toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {renderUserPagination()}
        </div>
      )}
    </div>
  )
}
