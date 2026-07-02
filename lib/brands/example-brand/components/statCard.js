/* statCard.js :: TEMPLATE adapted component.
 *
 * A deterministic product card. Real deployments replace this with the actual
 * product component, frozen (no network, no clocks, no randomness) so the
 * renderer can re-seek frames safely.
 *
 * Usage in a composition's index.html:
 *   <div id="stat" class="actor"></div>
 *   ExampleBrand.statCard(document.getElementById('stat'),
 *     { label: "active users", value: "12,940" }, tokens);
 *
 * The composition then place()s "#stat" and gates the moment with a kit
 * primitive (e.g. colorGuard on the accent, or wrapCatalog for an ink promise).
 */
(function (root) {
  function statCard(el, props, tokens) {
    var c = (tokens && tokens.color) || {};
    el.style.background = c.surface || "#15151c";
    el.style.color = c.text || "#f2f2f7";
    el.style.borderRadius = ((tokens && tokens.radiusPx) || 16) + "px";
    el.style.padding = "40px 56px";
    el.style.font = "600 48px/1.1 " + (((tokens && tokens.type) || {}).family || "Inter") + ", sans-serif";
    // Deterministic content only; freeze any dynamic values into props.
    el.innerHTML =
      '<div style="color:' + (c.muted || "#9a9aa8") + ';font-size:28px">' +
        String(props.label || "") + '</div>' +
      '<div style="color:' + (c.accent || "#2ce6a0") + ';font-size:88px;font-weight:800">' +
        String(props.value || "") + '</div>';
    return el;
  }
  root.ExampleBrand = root.ExampleBrand || {};
  root.ExampleBrand.statCard = statCard;
  if (typeof module !== "undefined" && module.exports) module.exports = { statCard: statCard };
})(typeof window !== "undefined" ? window : globalThis);
