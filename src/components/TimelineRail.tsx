import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { timelineGroups } from '../lib/connectionDiscovery';
import { useConversationStore } from '../store/conversationStore';
import { useMindStore } from '../store/mindStore';
import { useUiStore } from '../store/uiStore';
import {
  displayLabel, isNodeDisplayable, isNodeMasked, type PrivacyView,
} from '../utils/privacy';

interface TimelineRailProps {
  open: boolean;
  onToggle: () => void;
}

/** A persistent, privacy-aware path to records by the era the person stated. */
export default function TimelineRail({ open, onToggle }: TimelineRailProps) {
  const nodes = useMindStore((state) => state.nodes);
  const sensitiveContentVisible = useMindStore((state) => state.sensitiveContentVisible);
  const hiddenKinds = useMindStore((state) => state.hiddenKinds);
  const secureView = useUiStore((state) => state.secureView);
  const privateMode = useConversationStore((state) => state.sensitivePrivateMode);
  const selectedNodeId = useUiStore((state) => state.selectedNodeId);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const setGraphView = useUiStore((state) => state.setGraphView);
  const setSelectedNode = useUiStore((state) => state.setSelectedNode);

  // The rail is visible next to the 3D presentations, so restricted records stay out.
  const view = useMemo<PrivacyView>(() => ({
    revealSensitive: sensitiveContentVisible || secureView,
    privateMode,
    hiddenKinds,
  }), [sensitiveContentVisible, secureView, privateMode, hiddenKinds]);

  const groups = useMemo(
    () => timelineGroups(nodes.filter((node) => isNodeDisplayable(node, view))),
    [nodes, view],
  );
  const total = groups.reduce((sum, group) => sum + group.nodes.length, 0);

  const openNode = (id: string) => {
    setSelectedNode(id);
    const current = useUiStore.getState().workspace;
    const target = current === 'universe' ? 'universe' : 'atlas';
    if (target !== current) setWorkspace(target);
    if (target === 'atlas') setGraphView('timeline');
  };

  return (
    <aside
      className={`timeline-rail ${open ? '' : 'is-collapsed'}`.trim()}
      data-testid="timeline-rail"
      aria-label="Timeline side rail"
    >
      <button
        className="timeline-rail-toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? 'Collapse timeline rail' : 'Expand timeline rail'}
      >
        <Clock3 size={13} />
        {open && <span>TIMELINE</span>}
        {open ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div className="timeline-rail-body">
          <p className="timeline-rail-copy">Era you stated. Undated stays separate. Earlier is never treated as a cause.</p>
          <div className="timeline-rail-summary"><strong>{total}</strong> records <span>{groups.length} eras</span></div>
          <div className="timeline-rail-groups">
            {groups.map((group) => (
              <section key={group.era} className={`timeline-rail-group ${group.era === 'undated' ? 'is-undated' : ''}`.trim()}>
                <h3><span>{group.era}</span><small>{group.nodes.length}</small></h3>
                {group.nodes.map((node) => (
                  <button key={node.id} type="button" className={selectedNodeId === node.id ? 'is-active' : ''} title="Open record in the map" onClick={() => openNode(node.id)}>
                    <span>{displayLabel(node, view)}</span>
                    <small>{node.data.timePeriod ?? (isNodeMasked(node, view) ? 'protected' : 'time not stated')}</small>
                  </button>
                ))}
              </section>
            ))}
            {!groups.length && <p className="timeline-rail-empty">No records in an era yet.</p>}
          </div>
        </div>
      )}
    </aside>
  );
}
