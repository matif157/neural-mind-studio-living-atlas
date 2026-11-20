import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Database, Download, Eye, KeyRound, Moon, PlugZap, RotateCcw, ShieldAlert,
  Sun, Trash2, Upload,
} from 'lucide-react';
import { AI_PROVIDERS, AI_PROVIDER_META, type AiProviderId } from '@shared/domain';
import { useConversationStore } from '../../store/conversationStore';
import { useMindStore } from '../../store/mindStore';
import { fetchHealth, fetchProviders, getApiToken, setApiToken, testConnection } from '../../lib/api';
import { clearAllLocalData, STORAGE_KEYS } from '../../lib/db';
import { createProjectFile, downloadProjectFile, migrateProjectFile, validateProjectFile } from '../../utils/projectFile';

interface Props { notify: (message: string) => void }

export default function SettingsWorkspace({ notify }: Props) {
  const settings = useConversationStore((state) => state.settings);
  const setSettings = useConversationStore((state) => state.setSettings);
  const setProvider = useConversationStore((state) => state.setProvider);
  const setModel = useConversationStore((state) => state.setModel);
  const clearConversations = useConversationStore((state) => state.clearConversationsOnly);
  const conversations = useConversationStore((state) => state.conversations);
  const changeLog = useMindStore((state) => state.changeLog);
  const clearChangeLog = useMindStore((state) => state.clearChangeLog);
  const loadProject = useMindStore((state) => state.loadProject);
  const nodes = useMindStore((state) => state.nodes);
  const edges = useMindStore((state) => state.edges);
  const resetToStarter = useMindStore((state) => state.resetToStarter);
  const [providers, setProviders] = useState<Array<{ id: AiProviderId; label: string; available: boolean; model: string; note: string; allowed: boolean }>>([]);
  const [health, setHealth] = useState<{ ok: boolean; defaultProvider: string; authRequired: boolean } | null>(null);
  const [token, setToken] = useState(getApiToken());
  const [testing, setTesting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => {
    fetchProviders().then((data) => setProviders(data.providers)).catch(() => notify('API is offline. Start it with npm run dev.'));
    fetchHealth().then(setHealth).catch(() => undefined);
  };
  useEffect(refresh, [notify]);

  const exportGraph = () => { downloadProjectFile(createProjectFile(nodes, edges)); notify('Graph exported as JSON'); };
  const importGraph = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const project = validateProjectFile(parsed) ? parsed : migrateProjectFile(parsed);
      if (!project) throw new Error('Unsupported or invalid project file.');
      loadProject(project);
      notify(`Imported ${project.nodes.length} nodes`);
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Import failed'); }
    finally { event.target.value = ''; }
  };

  const connectionTest = async () => {
    setTesting(true);
    try {
      const result = await testConnection(settings.provider, settings.modelByProvider[settings.provider]);
      notify(result.ok ? `Connected in ${result.latencyMs ?? 0} ms` : result.error ?? 'Connection failed');
    } catch (cause) { notify(cause instanceof Error ? cause.message : 'Connection failed'); }
    finally { setTesting(false); }
  };

  const deleteEverything = async () => {
    if (!window.confirm('Permanently delete all local conversations, reflections, graph edits, settings and stored token? This cannot be undone.')) return;
    await clearAllLocalData();
    clearConversations();
    resetToStarter();
    notify('All local application data was deleted');
  };

  return (
    <div className="workspace-scroll">
      <div className="workspace-intro">
        <div><div className="panel-kicker">WORKSPACE J</div><h2>Settings & Data Control</h2><p>Consent, provider configuration, privacy and export controls. Secrets stay on the server; only a session token is kept in browser session storage.</p></div>
        <div className="intro-meta"><span>{health?.ok ? 'API connected' : 'API offline'}</span><span>{conversations.length} conversation(s)</span></div>
      </div>

      <div className="settings-grid">
        <section className="workspace-card">
          <div className="card-head"><h3>Consent & privacy</h3><ShieldAlert size={15} /></div>
          <label className="toggle-row"><input type="checkbox" checked={settings.aiConsent} onChange={(event) => setSettings({ aiConsent: event.target.checked })} /><span><strong>Allow AI conversation</strong><small>No text is sent to any provider while off.</small></span></label>
          <label className="toggle-row"><input type="checkbox" checked={settings.longTermMemory} onChange={(event) => setSettings({ longTermMemory: event.target.checked })} /><span><strong>Keep reflections between sessions</strong><small>When off, conversation history is not persisted by this browser.</small></span></label>
          <label className="toggle-row"><input type="checkbox" checked={settings.contextSharing.approvedNodes} onChange={(event) => setSettings({ contextSharing: { ...settings.contextSharing, approvedNodes: event.target.checked } })} /><span><strong>Share selected/core nodes as context</strong><small>Only explicitly selected or core nodes and their links.</small></span></label>
          <label className="toggle-row"><input type="checkbox" checked={settings.contextSharing.recentEvents} onChange={(event) => setSettings({ contextSharing: { ...settings.contextSharing, recentEvents: event.target.checked } })} /><span><strong>Share recent reflection wording</strong><small>Up to five recent user messages.</small></span></label>
          <div className="card-head spaced"><h3>Display</h3><Eye size={14} /></div>
          <div className="setting-row"><span>Theme</span><div className="chip-row">
            <button className={`chip-button ${settings.theme === 'dark' ? 'active' : ''}`} onClick={() => setSettings({ theme: 'dark' })}><Moon size={11} /> Dark</button>
            <button className={`chip-button ${settings.theme === 'light' ? 'active' : ''}`} onClick={() => setSettings({ theme: 'light' })}><Sun size={11} /> Light</button>
          </div></div>
          <label className="toggle-row"><input type="checkbox" checked={settings.reducedMotion} onChange={(event) => setSettings({ reducedMotion: event.target.checked })} /><span><strong>Reduce motion</strong><small>Pause signal animations and transitions.</small></span></label>
          <label className="toggle-row"><input type="checkbox" checked={settings.showSignals} onChange={(event) => setSettings({ showSignals: event.target.checked })} /><span><strong>Stream analysis tokens</strong><small>Show partial text while a response is generated.</small></span></label>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>AI provider</h3><PlugZap size={15} /></div>
          <p className="card-copy">Provider keys are configured in the server <code>.env</code> file, never in the browser. The offline adapter works with no key.</p>
          <div className="setting-row"><label htmlFor="settings-provider">Provider</label><select id="settings-provider" value={settings.provider} onChange={(event) => setProvider(event.target.value as AiProviderId)}>{AI_PROVIDERS.map((provider) => <option key={provider} value={provider}>{AI_PROVIDER_META[provider].label}</option>)}</select></div>
          <div className="setting-row"><label htmlFor="settings-model">Model</label><input id="settings-model" value={settings.modelByProvider[settings.provider] ?? ''} placeholder={providers.find((item) => item.id === settings.provider)?.model ?? 'provider default'} onChange={(event) => setModel(settings.provider, event.target.value)} /></div>
          <div className="setting-row"><label htmlFor="api-token">Session API token</label><input id="api-token" type="password" value={token} placeholder={health?.authRequired ? 'Required by server' : 'Not required'} onChange={(event) => { setToken(event.target.value); setApiToken(event.target.value.trim()); }} /></div>
          <button className="primary-button" onClick={() => void connectionTest()} disabled={testing}><PlugZap size={13} /> {testing ? 'Testing…' : 'Test connection'}</button>
          <div className="provider-table">
            {AI_PROVIDERS.map((provider) => {
              const info = providers.find((item) => item.id === provider);
              return <div key={provider}><strong>{AI_PROVIDER_META[provider].label}</strong><span className={`chip ${info?.available ? 'active' : ''}`}>{info ? (info.available ? 'available' : 'no credentials') : 'unknown'}</span><small>{info?.note ?? AI_PROVIDER_META[provider].note}</small></div>;
            })}
          </div>
        </section>

        <section className="workspace-card">
          <div className="card-head"><h3>Your data</h3><Database size={15} /></div>
          <p className="card-copy">Everything is stored locally in IndexedDB on this device. Exports are portable v2 JSON files; older v1 exports are accepted on import.</p>
          <div className="inline-actions">
            <button className="primary-button" onClick={exportGraph}><Download size={13} /> Export graph</button>
            <button className="text-button" onClick={() => fileInput.current?.click()}><Upload size={13} /> Import graph</button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importGraph} />
          </div>
          <div className="inline-actions spaced-actions">
            <button className="text-button" onClick={() => { if (window.confirm('Delete all conversations and reflections on this device?')) { clearConversations(); notify('Conversation history deleted'); } }}><Trash2 size={13} /> Delete conversations</button>
            <button className="text-button" onClick={() => { if (window.confirm('Restore the starter map? Export first if you need a backup.')) { resetToStarter(); notify('Starter map restored'); } }}><RotateCcw size={13} /> Reset map</button>
          </div>
          <button className="danger-button" onClick={() => void deleteEverything()}><Trash2 size={13} /> Delete all local data</button>
          <div className="card-head spaced"><h3>Change log</h3><span className="chip">Last {changeLog.length} entries</span></div>
          <div className="change-log">
            {changeLog.slice(0, 12).map((entry) => <div key={entry.id}><span>{new Date(entry.at).toLocaleString()}</span><strong>{entry.action}</strong><small>{entry.detail}</small></div>)}
            {changeLog.length === 0 && <p>No changes recorded.</p>}
          </div>
          {changeLog.length > 0 && <button className="text-button" onClick={() => { clearChangeLog(); notify('Change log cleared'); }}>Clear change log</button>}
          <div className="storage-note"><KeyRound size={13} /> Storage keys: {Object.values(STORAGE_KEYS).join(', ')}</div>
        </section>
      </div>
    </div>
  );
}
