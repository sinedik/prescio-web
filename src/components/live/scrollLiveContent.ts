export function scrollLiveContentToTop() {
  requestAnimationFrame(() => {
    const el = document.getElementById('live-content')
    if (!el) return
    if (el.scrollTop === 0 && el.scrollHeight > el.clientHeight) {
      el.scrollTop = Math.min(80, el.scrollHeight - el.clientHeight)
    }
    el.scrollTo({ top: 0, behavior: 'smooth' })
  })
}
