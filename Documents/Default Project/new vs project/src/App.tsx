import { useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Activity,
  Bell,
  BookOpen,
  ChevronDown,
  Compass,
  History,
  LayoutGrid,
  MessageCircle,
  Microscope,
  PanelLeftClose,
  Search,
  Settings,
  Share2,
  Sparkles,
  Target,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import './App.css'

type MindNode = Node<{ label: string; detail: string; kind: string }>

const initialNodes: MindNode[] = [
  { id: '1', type: 'default', position: { x: 340, y: 280 }, data: { label: 'Self', detail: 'Core identity', kind: 'core' } },
  { id: '2', type: 'default', position: { x: 90, y: 90 }, data: { label: 'Purpose', detail: 'Direction & meaning', kind: 'belief' } },
  { id: '3', type: 'default', position: { x: 590, y: 70 }, data: { label: 'Connection', detail: 'Relationships', kind: 'relationship' } },
  { id: '4', type: 'default', position: { x: 640, y: 300 }, data: { label: 'Growth', detail: 'Learning & change', kind: 'emotion' } },
  { id: '5', type: 'default', position: { x: 120, y: 450 }, data: { label: 'Creative work', detail: 'Expression', kind: 'value' } },
  { id: '6', type: 'default', position: { x: 430, y: 510 }, data: { label: 'Inner calm', detail: 'Rest & stability', kind: 'emotion' } },
  { id: '7', type: 'default', position: { x: 610, y: 510 }, data: { label: 'Courage', detail: 'Taking action', kind: 'value' } },
  { id: '8', type: 'default', position: { x: 20, y: 280 }, data: { label: 'Family', detail: 'Support system', kind: 'relationship' } },
]

const initialEdges: Edge[] = [
  ['1', '2'], ['1', '3'], ['1', '4'], ['1', '5'], ['1', '6'],
  ['1', '7'], ['1', '8'], ['2', '8'], ['3', '4'], ['4', '7'],
].map(([source, target], index) => ({
  id: `e-${index}`,
  source,
  target,
  type: 'smoothstep',
  animated: index === 0,
  markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#b7c2cf' },
  style: { stroke: '#aeb9c5', strokeWidth: 1.25 },
}))

const navItems = [
  { label: 'Living Atlas', icon: Compass },
  { label: 'Conversations', icon: MessageCircle },
  { label: 'Reflections', icon: BookOpen },
  { label: 'Patterns', icon: Activity },
  { label: 'Memory Library', icon: History },
]

function App() {
  const [activeNav, setActiveNav] = useState('Living Atlas')
  const [selected, setSelected] = useState(initialNodes[0])
  const [chatOpen, setChatOpen] = useState(true)
  const [search, setSearch] = useState('')

  const visibleNodes = useMemo(() => {
    if (!search.trim()) return initialNodes
    const term = search.toLowerCase()
    return initialNodes.filter((node) =>
      `${node.data.label} ${node.data.detail}`.toLowerCase().includes(term),
    )
  }, [search])

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Microscope size={18} /></div>
          <div>
            <strong>Neural Mind</strong>
            <span>STUDIO</span>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Primary">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={activeNav === label ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveNav(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <p className="nav-heading">PERSONAL SPACE</p>
        <button className="nav-item"><LayoutGrid size={17} /><span>My journals</span></button>
        <button className="nav-item"><Target size={17} /><span>Goals & intentions</span></button>

        <div className="sidebar-bottom">
          <button className="nav-item"><Settings size={17} /><span>Settings</span></button>
          <div className="profile">
            <div className="avatar">AM</div>
            <div><strong>Alex Morgan</strong><span>Personal account</span></div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="breadcrumb">Personal map <span>/</span> Living Atlas</p>
            <h1>Living Mind Atlas</h1>
          </div>
          <div className="top-actions">
            <label className="search-box">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your mind" />
            </label>
            <button className="icon-button" aria-label="Notifications"><Bell size={18} /></button>
            <button className="share-button"><Share2 size={16} /> Share</button>
          </div>
        </header>

        <div className="content-grid">
          <section className="atlas-panel">
            <div className="atlas-toolbar">
              <div className="view-tabs">
                <button className="tab active">Map</button>
                <button className="tab">Timeline</button>
                <button className="tab">Clusters</button>
              </div>
              <div className="map-actions">
                <button className="icon-button compact" aria-label="Collapse"><PanelLeftClose size={16} /></button>
                <button className="icon-button compact" aria-label="Zoom out"><ZoomOut size={16} /></button>
                <button className="icon-button compact" aria-label="Zoom in"><ZoomIn size={16} /></button>
              </div>
            </div>

            <div className="map-canvas">
              <ReactFlow
                nodes={visibleNodes}
                edges={initialEdges}
                fitView
                fitViewOptions={{ padding: 0.28 }}
                minZoom={0.35}
                maxZoom={1.8}
                nodesDraggable
                onNodeClick={(_, node) => setSelected(node as MindNode)}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#cad1d8" gap={24} size={1} />
                <Controls showInteractive={false} />
              </ReactFlow>

              <div className="legend">
                <span><i className="dot identity" />Identity</span>
                <span><i className="dot emotion" />Emotion</span>
                <span><i className="dot relationship" />Relationship</span>
              </div>
            </div>
          </section>

          <aside className={chatOpen ? 'insight-panel' : 'insight-panel collapsed'}>
            {chatOpen ? (
              <>
                <div className="insight-header">
                  <div><Sparkles size={16} /><strong>Mind Insight</strong></div>
                  <button onClick={() => setChatOpen(false)} aria-label="Close panel"><X size={17} /></button>
                </div>
                <div className="selected-node">
                  <div className="node-orb"><UserRound size={20} /></div>
                  <div><span>SELECTED NODE</span><strong>{selected.data.label}</strong></div>
                </div>
                <div className="insight-card">
                  <span className="insight-label">Emerging pattern</span>
                  <p>Connection and growth appear closely linked in your recent reflections.</p>
                  <div className="strength"><span /><span /><span /><span /><span /></div>
                  <small>Pattern strength · 82%</small>
                </div>
                <div className="evidence">
                  <h3>Related reflections</h3>
                  <button><span>Nov 18</span><p>What creates a meaningful connection?</p></button>
                  <button><span>Nov 14</span><p>A week of small courageous steps</p></button>
                  <button><span>Nov 09</span><p>Defining success on my own terms</p></button>
                </div>
                <button className="reflect-button"><Sparkles size={16} /> Begin guided reflection</button>
              </>
            ) : (
              <button className="open-panel" onClick={() => setChatOpen(true)}><Sparkles size={18} /></button>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}

export default App
