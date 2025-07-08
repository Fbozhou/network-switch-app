// renderer/renderer.js
const el = (id) => document.getElementById(id)

async function updateStatus() {
  const status = await window.ylzNetworkAPI.getStatus()
  const set = (elSpan, elDot, val) => {
    elSpan.textContent = val === 'Up' ? '启用' : '已禁'
    elSpan.className = val === 'Up' ? 'enabled' : ''
    elDot.className = val === 'Up' ? 'dot enabled' : 'dot'
  }
  set(el('intranetState'), el('intranetDot'), status.intranet)
  set(el('internetState'), el('internetDot'), status.internet)
}

document.getElementById('toggleMode').onclick = async function () {
  const btn = this
  btn.disabled = true
  btn.textContent = '切换中...'
  try {
    const msg = await window.ylzNetworkAPI.toggleMode()
    console.log('切换结果:', msg)
  } catch (e) {
    console.error('切换失败:', e)
  } finally {
    await updateStatus()
    btn.textContent = '切换网络'
    btn.disabled = false
  }
}

document.getElementById('togglePin').onclick = async function () {
  const newState = await window.ylzNetworkAPI.toggleAlwaysOnTop()
  this.textContent = newState ? '取消置顶' : '置顶窗口'
}

updateStatus()
setInterval(updateStatus, 1000)
