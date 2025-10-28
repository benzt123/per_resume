import MarkdownIt from 'markdown-it'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
const md = new MarkdownIt({ html: true, linkify: true, typographer: true, highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try { return '<pre class="hljs"><code>' + hljs.highlight(str, { language: lang }).value + '</code></pre>'; } catch (__) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
}})
function renderMath(text) {
  return text.replace(/\$\$([\s\S]+?)\$\$/g, (m,p)=>{ try{return katex.renderToString(p,{displayMode:true})}catch(e){return '<span class="katex-error">'+md.utils.escapeHtml(p)+'</span>'}}).replace(/\$([^\$\n]+?)\$/g,(m,p)=>{ try{return katex.renderToString(p,{displayMode:false})}catch(e){return '<span class="katex-error">'+md.utils.escapeHtml(p)+'</span>'}});
}
export function renderMarkdown(input) { if(!input) return ''; const withMath = renderMath(input); return md.render(withMath); }
