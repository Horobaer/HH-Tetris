(function () { const r = document.createElement("link").relList; if (r && r.supports && r.supports("modulepreload")) return; for (const e of document.querySelectorAll('link[rel="modulepreload"]')) o(e); new MutationObserver(e => { for (const t of e) if (t.type === "childList") for (const c of t.addedNodes) c.tagName === "LINK" && c.rel === "modulepreload" && o(c) }).observe(document, { childList: !0, subtree: !0 }); function n(e) { const t = {}; return e.integrity && (t.integrity = e.integrity), e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy), e.crossOrigin === "use-credentials" ? t.credentials = "include" : e.crossOrigin === "anonymous" ? t.credentials = "omit" : t.credentials = "same-origin", t } function o(e) { if (e.ep) return; e.ep = !0; const t = n(e); fetch(e.href, t) } })(); function d() { const s = localStorage.getItem("tetris_scores_v2"); return s ? JSON.parse(s) : [] } function a(s, r, n, o) { const e = d(); e.push({ name: s, score: Number(r), time: Number(n), level: Number(o || 0), date: Date.now() }), e.sort((c, i) => Number(i.score) - Number(c.score) || Number(c.time) - Number(i.time)); const t = e.slice(0, 50); localStorage.setItem("tetris_scores_v2", JSON.stringify(t)) } function u(s) { const r = Math.floor(s / 1e3), n = Math.floor(r / 60), o = r % 60; return `${n}:${o.toString().padStart(2, "0")}` } function l(s) { return s ? new Date(s).toLocaleString() : "-" } function f(s) {
    const r = document.getElementById(s); if (!r) return; const n = d(); r.innerHTML = "", n.forEach((o, e) => {
        const t = document.createElement("tr"); t.innerHTML = `
            <td>#${e + 1}</td>
            <td>${o.name}</td>
            <td>${o.score}</td>
            <td>${o.level !== void 0 ? o.level : "-"}</td>
            <td>${u(o.time)}</td>
            <td>${l(o.date)}</td>
        `, r.appendChild(t)
    }), n.length === 0 && (r.innerHTML = '<tr><td colspan="5">No scores yet!</td></tr>')
} export { f as r, a as s };
