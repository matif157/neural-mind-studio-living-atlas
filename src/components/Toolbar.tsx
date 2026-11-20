import { Download, FileJson, GitBranch, Maximize2, Pause, Play, Redo2, RotateCcw, Scissors, Copy, ClipboardPaste, Trash2, Undo2, BrainCircuit } from 'lucide-react';

import type { ReactNode } from 'react';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  running: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleRunning: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onAnatomy: () => void;
  onFit: () => void;
}

function ToolButton({ label, onClick, children, disabled = false, variant = '' }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; variant?: string }) {
  return <button className={`tool-button ${variant}`} onClick={onClick} disabled={disabled} title={label} aria-label={label}>{children}<span>{label}</span></button>;
}

export default function Toolbar(props: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <ToolButton label="Undo" onClick={props.onUndo} disabled={!props.canUndo}><Undo2 size={15} /></ToolButton>
        <ToolButton label="Redo" onClick={props.onRedo} disabled={!props.canRedo}><Redo2 size={15} /></ToolButton>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <ToolButton label="Cut" onClick={props.onCut}><Scissors size={15} /></ToolButton>
        <ToolButton label="Copy" onClick={props.onCopy}><Copy size={15} /></ToolButton>
        <ToolButton label="Paste" onClick={props.onPaste}><ClipboardPaste size={15} /></ToolButton>
        <ToolButton label="Duplicate" onClick={props.onDuplicate}><GitBranch size={15} /></ToolButton>
        <ToolButton label="Delete" onClick={props.onDelete} variant="tool-danger"><Trash2 size={15} /></ToolButton>
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <ToolButton label="Neuron anatomy" onClick={props.onAnatomy}><BrainCircuit size={15} /></ToolButton>
        <ToolButton label="Fit graph" onClick={props.onFit}><Maximize2 size={15} /></ToolButton>
      </div>
      <div className="toolbar-spacer" />
      <div className="toolbar-group toolbar-right">
        <ToolButton label="Import JSON" onClick={props.onImport}><FileJson size={15} /></ToolButton>
        <ToolButton label="Export JSON" onClick={props.onExport}><Download size={15} /></ToolButton>
        <ToolButton label="Reset map" onClick={props.onReset}><RotateCcw size={15} /></ToolButton>
        <button className={`simulation-button ${props.running ? 'is-running' : ''}`} onClick={props.onToggleRunning}>
          {props.running ? <Pause size={14} /> : <Play size={14} />}
          <span>{props.running ? 'Pause signals' : 'Run signals'}</span>
          <span className="simulation-light" />
        </button>
      </div>
    </div>
  );
}
