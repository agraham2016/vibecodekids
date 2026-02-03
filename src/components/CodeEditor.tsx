import Editor from '@monaco-editor/react'
import './CodeEditor.css'

interface CodeEditorProps {
  code: string
  onChange: (code: string) => void
}

export default function CodeEditor({ code, onChange }: CodeEditorProps) {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-creation.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="panel code-panel">
      <div className="panel-header">
        <span className="icon">👨‍💻</span>
        Your Code
        <span className="editable-badge">You can edit!</span>
      </div>
      
      <div className="panel-content code-editor-wrapper">
        <Editor
          height="100%"
          defaultLanguage="html"
          value={code}
          onChange={handleEditorChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            lineNumbers: 'on',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            folding: true,
            lineDecorationsWidth: 10,
            glyphMargin: false,
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>
      
      <div className="code-actions">
        <button className="code-action-btn" onClick={handleCopy}>
          <span>📋</span> Copy Code
        </button>
        <button className="code-action-btn" onClick={handleDownload}>
          <span>⬇️</span> Download
        </button>
      </div>
    </div>
  )
}
