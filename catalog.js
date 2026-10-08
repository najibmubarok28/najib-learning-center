'use strict';
(async function () {
  const evaluation = document.body.dataset.mode === 'evaluation';
  const container = document.getElementById('catalog');
  const message = document.getElementById('catalog-message');
  const select = document.getElementById('course');
  const search = document.getElementById('search');
  let entries = [];
  const states = new Map();
  function safeHref(value) {
    const url = new URL(value, location.href);
    if (url.protocol !== 'https:' && !(url.origin === location.origin && url.protocol === 'http:')) throw new Error('Alamat media belum sesuai.');
    return url.href;
  }
  function render() {
    container.replaceChildren();
    const query = search.value.toLocaleLowerCase('id');
    const shown = entries.filter(item => (!select.value || item.course === select.value) && (item.title + ' ' + (item.description || '')).toLocaleLowerCase('id').includes(query));
    message.textContent = shown.length ? shown.length + (evaluation ? ' evaluasi pada daftar.' : ' materi tersedia.') : entries.length ? 'Belum ada materi yang sesuai dengan pilihan ini.' : evaluation ? 'Belum ada evaluasi yang ditambahkan.' : 'Belum ada materi yang ditambahkan.';
    for (const item of shown) {
      const card = document.createElement('article'); card.className = 'card';
      const badge = document.createElement('span'); badge.className = 'badge';
      const state = states.get(item.id) || (item.accessConfigured === false ? 'closed' : 'checking');
      badge.textContent = evaluation ? ({open:'Dibuka · perlu password',closed:'Ditutup',checking:'Memeriksa akses',error:'Akses belum tersedia'})[state] : item.course;
      if (evaluation) badge.classList.add(state === 'open' ? 'open' : 'red');
      const title = document.createElement('h2'); title.textContent = item.title;
      const text = document.createElement('p'); text.textContent = evaluation ? item.course : (item.description || item.course);
      card.append(badge,title,text);
      if (!evaluation || state === 'open') {
        const link = document.createElement('a'); link.className = 'button small'; link.textContent = evaluation ? 'Masuk evaluasi' : 'Buka media ↗';
        try {
          link.href = evaluation ? 'viewer.html?id=' + encodeURIComponent(item.id) : safeHref(item.url);
          const titleLink = document.createElement('a'); titleLink.href=link.href; titleLink.textContent=item.title; titleLink.style.color='inherit'; titleLink.style.textDecoration='none';
          title.replaceChildren(titleLink); card.append(link);
        } catch { const error = document.createElement('p'); error.textContent = 'Tautan media belum siap.'; card.append(error); }
      } else {
        const note=document.createElement('p');note.textContent=item.accessConfigured===false?'Menunggu aktivasi akses oleh admin.':'Dibuka sesuai jadwal dan arahan dosen.';card.append(note);
      }
      container.append(card);
    }
  }
  select.addEventListener('change', render); search.addEventListener('input', render);
  async function refresh() {
    if (!evaluation) return;
    const ready=entries.filter(x=>x.accessConfigured!==false);
    for (let i=0;i<ready.length;i+=4) {
      await Promise.all(ready.slice(i,i+4).map(async item => {
        try { await RBBridge.accessPage(item); states.set(item.id,'open'); }
        catch (e) { states.set(item.id,e.code === 'closed' ? 'closed' : 'error'); }
      }));
      render();
    }
  }
  try {
    const response = await fetch('catalog.json',{cache:'no-store'});
    if (!response.ok) throw new Error();
    const catalog = await response.json();
    entries = evaluation ? catalog.evaluations : catalog.lessons;
    if (!Array.isArray(entries)) throw new Error();
    const courses=new Set([...document.querySelectorAll('[data-course]')].map(a=>a.dataset.course));
    entries.forEach(item=>courses.add(item.course));
    for (const course of courses) {
      const option = document.createElement('option'); option.value = course; option.textContent = course; select.append(option);
    }
    const requested=new URLSearchParams(location.search).get('course');
    if(courses.has(requested)) select.value=requested;
    document.querySelectorAll('[data-course]').forEach(a=>a.addEventListener('click',event=>{
      event.preventDefault();select.value=a.dataset.course;search.value='';render();
      document.getElementById('daftar-materi').scrollIntoView();
    }));
    render(); await refresh();
    if (evaluation && entries.some(x=>x.accessConfigured!==false)) setInterval(refresh,60000);
  } catch { message.textContent = 'Daftar belum dapat dimuat. Silakan muat ulang halaman.'; }
})();
