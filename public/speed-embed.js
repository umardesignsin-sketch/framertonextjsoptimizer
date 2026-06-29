/* Framer → static converter — embeddable PageSpeed checker injector.
   Usage:
     <div id="framer-speed-checker"></div>
     <script src="https://YOUR-APP/speed-embed.js" async></script>
   Optional prefill / sizing:
     <script src="https://YOUR-APP/speed-embed.js"
       data-original="https://site.framer.website"
       data-converted="https://site.vercel.app"
       data-height="560" async></script>
*/
(function () {
  var s = document.currentScript;
  if (!s) {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if ((all[i].src || "").indexOf("/speed-embed.js") !== -1) { s = all[i]; break; }
    }
  }
  if (!s) return;

  var origin = new URL(s.src, location.href).origin;
  var qs = [];
  if (s.getAttribute("data-original")) qs.push("original=" + encodeURIComponent(s.getAttribute("data-original")));
  if (s.getAttribute("data-converted")) qs.push("converted=" + encodeURIComponent(s.getAttribute("data-converted")));
  var height = s.getAttribute("data-height") || "560";

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/embed/speed" + (qs.length ? "?" + qs.join("&") : "");
  iframe.title = "PageSpeed checker — Framer vs converted";
  iframe.loading = "lazy";
  iframe.style.cssText = "width:100%;border:0;border-radius:12px;height:" + height + "px";

  var mount = document.getElementById("framer-speed-checker");
  if (mount) mount.appendChild(iframe);
  else if (s.parentNode) s.parentNode.insertBefore(iframe, s.nextSibling);
})();
