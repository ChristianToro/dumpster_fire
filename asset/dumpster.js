/* Automatically mounts the pixel-art dumpster into every [data-dumpster-fire] element. */
(() => {
  const artwork = `
<svg viewBox="0 0 320 240" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated pixel-art green dumpster on fire with flickering flames and rising smoke">
<rect width="320" height="240" fill="#141827"/>
<rect x="0" y="209" width="320" height="31" fill="#222b3c"/>
<rect x="0" y="208" width="320" height="2" fill="#374156"/>
<ellipse class="glow" cx="163" cy="178" rx="107" ry="66" fill="#f97316"/>
<g fill="#677184">
<g class="smoke"><rect x="134" y="84" width="17" height="12"/><rect x="129" y="78" width="11" height="12"/><rect x="142" y="72" width="14" height="13"/></g>
<g class="smoke s2"><rect x="171" y="94" width="17" height="12"/><rect x="178" y="85" width="13" height="14"/><rect x="165" y="82" width="13" height="12"/></g>
<g class="smoke s3"><rect x="151" y="93" width="19" height="13"/><rect x="159" y="82" width="15" height="13"/></g>
</g>
<g class="ember" fill="#ffcc42"><rect x="112" y="100" width="4" height="5"/><rect x="116" y="93" width="3" height="3"/></g>
<g class="ember e2" fill="#ff7526"><rect x="199" y="112" width="5" height="5"/></g>
<g class="ember e3" fill="#ffd85c"><rect x="151" y="78" width="4" height="5"/></g>
<g class="ember e4" fill="#ff7526"><rect x="184" y="93" width="4" height="4"/></g>
<g class="flame">
<path d="M95 156 V139 H103 V120 H111 V102 H119 V118 H127 V87 H135 V72 H143 V99 H151 V115 H159 V96 H167 V124 H175 V139 H183 V156Z" fill="#f0441e"/>
<path d="M106 156 V137 H114 V124 H122 V137 H130 V108 H138 V93 H146 V122 H154 V133 H162 V119 H170 V156Z" fill="#ff941e"/>
<path d="M120 156 V143 H128 V132 H136 V115 H144 V140 H152 V131 H160 V156Z" fill="#ffe04e"/>
</g>
<g class="flame two">
<path d="M157 159 V143 H165 V123 H173 V105 H181 V124 H189 V92 H197 V112 H205 V130 H213 V118 H221 V144 H229 V159Z" fill="#ef421c"/>
<path d="M169 159 V142 H177 V127 H185 V139 H193 V112 H201 V134 H209 V143 H217 V159Z" fill="#ff8b1a"/>
<path d="M181 159 V145 H189 V131 H197 V147 H205 V159Z" fill="#ffdd47"/>
</g>
<g class="flame three">
<path d="M130 157 V141 H138 V121 H146 V137 H154 V109 H162 V86 H170 V111 H178 V129 H186 V117 H194 V157Z" fill="#fa541c"/>
<path d="M142 157 V139 H150 V128 H158 V116 H166 V132 H174 V123 H182 V157Z" fill="#ffae22"/>
<path d="M153 157 V143 H161 V130 H169 V144 H177 V157Z" fill="#fff16a"/>
</g>
<rect x="68" y="144" width="189" height="13" fill="#101b23"/>
<rect x="63" y="149" width="198" height="10" fill="#315c50"/>
<rect x="68" y="159" width="188" height="54" fill="#193e38"/>
<path d="M68 159 H256 L246 207 H78Z" fill="#297563"/>
<path d="M75 164 H249 L242 176 H81Z" fill="#348b72"/>
<rect x="85" y="178" width="7" height="24" fill="#174e43"/>
<rect x="108" y="178" width="7" height="24" fill="#174e43"/>
<rect x="207" y="178" width="7" height="24" fill="#174e43"/>
<rect x="230" y="178" width="7" height="24" fill="#174e43"/>
<rect x="128" y="180" width="65" height="21" fill="#d6b969"/>
<rect x="131" y="183" width="59" height="15" fill="#e9d58b"/>
<text x="160" y="193" font-family="monospace" font-size="9" font-weight="900" text-anchor="middle" fill="#26352b">HOT MESS</text>
<rect x="77" y="211" width="17" height="9" fill="#0d131b"/>
<rect x="228" y="211" width="17" height="9" fill="#0d131b"/>
<rect x="81" y="214" width="8" height="6" fill="#596577"/>
<rect x="232" y="214" width="8" height="6" fill="#596577"/>
<rect x="60" y="143" width="203" height="6" fill="#417e6d"/>
<rect x="60" y="149" width="203" height="4" fill="#14362e"/>
<rect x="75" y="154" width="170" height="4" fill="#112c28"/>
</svg>`;
  function mountDumpsterFires(root = document) {
    root.querySelectorAll('[data-dumpster-fire]').forEach((element) => {
      if (!element.querySelector('svg')) element.innerHTML = artwork;
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountDumpsterFires(), { once: true });
  } else {
    mountDumpsterFires();
  }
  window.mountDumpsterFires = mountDumpsterFires;
})();
