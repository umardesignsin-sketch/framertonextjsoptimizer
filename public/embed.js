/* Framer → static converter — embeddable widget injector.
   Usage:
     <div id="framer-converter"></div>
     <script src="https://YOUR-APP/embed.js" async></script>
   Optional: data-url to prefill, data-height to size.
     <script src="https://YOUR-APP/embed.js" data-url="https://site.framer.website" async></script>
*/
(function () {
  var s = document.currentScript;
  if (!s) {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if ((all[i].src || "").indexOf("/embed.js") !== -1) { s = all[i]; break; }
    }
  }
  if (!s) return;

  var origin = new URL(s.src, location.href).origin;
  var prefill = s.getAttribute("data-url");
  var height = s.getAttribute("data-height") || "640";

  var src = origin + "/embed" + (prefill ? "?url=" + encodeURIComponent(prefill) : "");
  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Framer → static converter";
  iframe.loading = "lazy";
  iframe.style.cssText = "width:100%;border:0;border-radius:12px;height:" + height + "px";

  var mount = document.getElementById("framer-converter");
  if (mount) mount.appendChild(iframe);
  else if (s.parentNode) s.parentNode.insertBefore(iframe, s.nextSibling);
})();
