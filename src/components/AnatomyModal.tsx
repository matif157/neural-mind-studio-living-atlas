import { useState } from 'react';
import { X } from 'lucide-react';

const parts = [
  { id: 'dendrites', title: 'Dendrites', text: 'Branch-like extensions that receive signals from other cells. Their structure helps a neuron collect input from many sources.' },
  { id: 'soma', title: 'Cell body (soma)', text: 'Contains the nucleus and cell machinery. Incoming signals are integrated across the neuron; real processing is more complex than a single on/off switch.' },
  { id: 'axon', title: 'Axon', text: 'A long projection that carries electrical impulses away from the cell body toward other targets.' },
  { id: 'myelin', title: 'Myelin', text: 'An insulating sheath around many axons that helps action potentials travel faster through saltatory conduction.' },
  { id: 'terminals', title: 'Axon terminals', text: 'Terminal branches that communicate with target cells, often by releasing chemical neurotransmitters.' },
  { id: 'synapse', title: 'Synapse', text: 'A communication junction between cells. Chemical synapses use neurotransmitter release, receptors and complex changes in signal strength.' },
];

export default function AnatomyModal({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState('soma');
  const part = parts.find((item) => item.id === active)!;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="anatomy-modal" role="dialog" aria-modal="true" aria-labelledby="anatomy-title">
        <header className="modal-header">
          <div><div className="panel-kicker">BIOLOGY REFERENCE</div><h2 id="anatomy-title">A neuron, in context</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close anatomy reference"><X size={18} /></button>
        </header>
        <div className="anatomy-content">
          <div className="anatomy-illustration">
            <svg viewBox="0 0 720 360" role="img" aria-label="Illustration of a neuron showing dendrites, soma, axon, myelin, terminals and synapse">
              <defs>
                <linearGradient id="axon-gradient" x1="0" x2="1"><stop offset="0" stopColor="#67a9ff"/><stop offset="1" stopColor="#8c83ff"/></linearGradient>
                <radialGradient id="soma-gradient"><stop offset="0" stopColor="#fff3bf"/><stop offset=".35" stopColor="#ffc66f"/><stop offset="1" stopColor="#d97853"/></radialGradient>
                <filter id="neuron-glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <g fill="none" stroke="#83a4d6" strokeWidth="4" strokeLinecap="round" opacity=".88">
                <path d="M214 175 C165 154 134 128 112 88 M160 143 L119 142 L88 118 M139 120 L128 76 L99 56 M203 163 C166 180 132 195 105 230 M153 183 L121 215 L92 215 M177 178 L165 229 L144 256 M211 190 C179 220 176 261 185 291"/>
                <path d="M218 153 C183 109 177 75 188 44 M185 101 L157 83 L145 58 M198 126 L220 83 L216 54"/>
              </g>
              <circle cx="231" cy="174" r="51" fill="url(#soma-gradient)" filter="url(#neuron-glow)" stroke="#ffd58b" strokeWidth="2"/>
              <circle cx="231" cy="174" r="16" fill="#fff2ce" opacity=".86"/>
              <path d="M277 176 C353 169 405 174 482 174 S591 178 642 178" stroke="url(#axon-gradient)" strokeWidth="8" fill="none" strokeLinecap="round" filter="url(#neuron-glow)"/>
              <g fill="#9bc4ff" stroke="#d5e7ff" strokeWidth="1.5">
                <rect x="325" y="151" width="66" height="47" rx="18" opacity=".9"/>
                <rect x="411" y="151" width="66" height="47" rx="18" opacity=".9"/>
                <rect x="497" y="151" width="66" height="47" rx="18" opacity=".9"/>
              </g>
              <g stroke="#8a9ec1" strokeWidth="4" strokeLinecap="round" fill="none">
                <path d="M642 178 C660 172 665 150 682 135 M644 178 C665 189 671 205 688 213 M670 145 L690 129 M674 204 L697 225"/>
              </g>
              <g stroke="#f5be63" strokeWidth="2" fill="none" strokeDasharray="4 7"><path d="M691 132 C705 144 706 160 701 171"/><path d="M693 214 C705 201 705 187 701 179"/></g>
              <g fill="#c6d8f5" fontSize="12" fontFamily="Inter, sans-serif">
                <text x="57" y="28">DENDRITES</text><text x="196" y="253">SOMA</text><text x="354" y="235">MYELIN</text><text x="435" y="119">AXON</text><text x="592" y="250">TERMINALS</text><text x="645" y="91">SYNAPSE</text>
              </g>
              <g stroke="#546b91" strokeWidth="1.2" fill="none"><path d="M114 35 L143 76"/><path d="M223 238 L231 224"/><path d="M371 224 L371 198"/><path d="M453 128 L453 168"/><path d="M626 238 L657 198"/><path d="M665 98 L697 143"/></g>
            </svg>
            <div className="anatomy-footnote">Illustrative schematic · not to scale</div>
          </div>
          <div className="anatomy-parts">
            <div className="part-selector">
              {parts.map((item) => <button key={item.id} className={active === item.id ? 'is-active' : ''} onClick={() => setActive(item.id)}>{item.title}</button>)}
            </div>
            <div className="part-detail"><div className="panel-kicker">SELECTED STRUCTURE</div><h3>{part.title}</h3><p>{part.text}</p></div>
          </div>
        </div>
        <p className="science-note">The editable mind graph is a conceptual model. Its nodes and connections are not a map of actual neurons or a direct representation of a person's brain activity.</p>
      </section>
    </div>
  );
}
