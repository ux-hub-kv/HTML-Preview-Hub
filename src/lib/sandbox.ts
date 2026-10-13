/**
 * Prototypes render in a sandboxed iframe without `allow-same-origin`, which keeps uploaded HTML away from
 * the hub. In that sandbox the browser throws SecurityError on any localStorage / sessionStorage access, so a
 * prototype that touches storage while building its UI stops halfway and shows a blank page.
 * This shim swaps in an in-memory Storage when the real one is blocked (values last until the page reloads).
 */
const STORAGE_SHIM = `<script>(function(){function mem(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){var ks=Object.keys(d);return i<ks.length?ks[i]:null},get length(){return Object.keys(d).length}}}['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('__probe')}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}})})();</script>`;

/**
 * Returns the HTML with the storage shim as the first thing that runs. It goes right after `<head>`
 * (or `<html>` / the doctype) — never before the doctype, which would drop the page into quirks mode.
 */
export function withStorageShim(html: string): string {
  for (const pattern of [/<head(\s[^>]*)?>/i, /<html(\s[^>]*)?>/i, /<!doctype[^>]*>/i]) {
    const match = pattern.exec(html);
    if (match) {
      const at = match.index + match[0].length;
      return html.slice(0, at) + STORAGE_SHIM + html.slice(at);
    }
  }
  return STORAGE_SHIM + html;
}
