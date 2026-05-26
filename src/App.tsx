import { useState, useEffect, useRef } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || ''

interface FileItem {
  name: string
  size: number
  date: string
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [files, setFiles] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const authHeaders = () => ({ 'Authorization': `Bearer ${token}` })

  const login = async () => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) return alert('Login failed')
    const data = await res.json()
    setToken(data.token)
    localStorage.setItem('token', data.token)
  }

  const loadFiles = async () => {
    if (!token) return
    const res = await fetch(`${API}/api/files`, { headers: authHeaders() })
    if (res.ok) setFiles(await res.json())
  }

  useEffect(() => { if (token) loadFiles() }, [token])

  const upload = async (file: File) => {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    await fetch(`${API}/api/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    })
    await loadFiles()
    setUploading(false)
  }

  const deleteFile = async (name: string) => {
    if (!confirm(`Delete ${name}?`)) return
    await fetch(`${API}/api/files/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    await loadFiles()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) await upload(file)
  }

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await upload(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (d: string) => new Date(d).toLocaleString('pt-BR')

  if (!token) {
    return (
      <div className="login">
        <div className="card">
          <h1>File Server</h1>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()} />
          <button onClick={login}>Login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <h1>File Server</h1>
        <button className="logout" onClick={() => { setToken(''); localStorage.removeItem('token') }}>Logout</button>
      </header>

      <div className="upload-area" onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)} onDrop={handleDrop}
        onClick={() => inputRef.current?.click()} data-dragging={dragging}>
        <input ref={inputRef} type="file" hidden onChange={handleSelect} />
        {uploading ? <span>Uploading...</span> : <span>Drop file here or click to upload</span>}
      </div>

      <div className="file-list">
        {files.length === 0 && <p className="empty">No files yet</p>}
        {files.map(f => (
          <div key={f.name} className="file-item">
            <div className="file-info">
              <span className="file-name">{f.name.includes('_') ? f.name.split('_').slice(1).join('_') : f.name}</span>
              <span className="file-meta">{formatSize(f.size)} — {formatDate(f.date)}</span>
            </div>
            <div className="file-actions">
              <a href={`${API}/api/files/${encodeURIComponent(f.name)}`} download>Download</a>
              <button onClick={() => deleteFile(f.name)} className="delete">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
