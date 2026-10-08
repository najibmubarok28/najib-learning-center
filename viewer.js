'use strict';
(async function () {
  const gate = document.getElementById('gate'), session = document.getElementById('session'), frame = document.getElementById('media');
  const message = document.getElementById('message'), form = document.getElementById('password-form'), password = document.getElementById('password'), submit = document.getElementById('submit');
  const state = document.getElementById('access-state');
  let entry, envelope, timer, sessionPassword='';
  function showError(text) { message.textContent=text; message.classList.add('error'); }
  function close(text) {
    clearInterval(timer); timer=null; sessionPassword='';
    frame.srcdoc=''; session.hidden=true; gate.hidden=false; password.value='';
    form.hidden=true; state.textContent=text;
  }
  document.getElementById('exit').addEventListener('click',()=>{ close('Anda sudah keluar dari evaluasi. Muat ulang halaman untuk masuk lagi.'); });
  window.addEventListener('pagehide',()=>{clearInterval(timer);sessionPassword='';});
  form.addEventListener('submit',async event=>{
    event.preventDefault(); if(!entry || !envelope) return;
    submit.disabled=true; message.classList.remove('error'); message.textContent='Memeriksa password…';
    const value=password.value;
    try {
      const html=await RBBridge.unlock(envelope,value);
      sessionPassword=value; password.value=''; message.textContent=''; gate.hidden=true; session.hidden=false;
      document.getElementById('session-title').textContent=entry.title;
      frame.srcdoc=html;
      document.getElementById('exit').focus();
      let checking=false;
      timer=setInterval(async()=>{
        if(checking || !sessionPassword) return; checking=true;
        try { await RBBridge.releaseKey(entry,sessionPassword); }
        catch(e) { close(e.code==='closed' ? 'Evaluasi sudah ditutup oleh dosen.' : e.code==='password' ? 'Password evaluasi sudah diubah oleh dosen.' : RBBridge.errors.network); }
        finally{checking=false;}
      },30000);
    } catch(e) {
      password.value=''; showError(e.message || 'Evaluasi belum dapat dibuka.');
      if(e.code==='closed' || e.code==='config') form.hidden=true;
      else password.focus();
    } finally {submit.disabled=false;}
  });
  try {
    const response=await fetch('catalog.json',{cache:'no-store'}); if(!response.ok) throw new Error();
    const catalog=await response.json(); const id=new URLSearchParams(location.search).get('id');
    entry=catalog.evaluations.find(item=>item.id===id); if(!entry) throw new Error('Evaluasi tidak ditemukan.');
    if(entry.accessConfigured===false) throw new Error('Evaluasi sedang ditutup. Akses menunggu aktivasi oleh admin.');
    RBBridge.validate(entry);
    document.getElementById('title').textContent=entry.title; document.getElementById('course-name').textContent=entry.course;
    await RBBridge.accessPage(entry);
    if(entry.encryptedFile !== 'data/'+entry.id+'.json') throw new Error('Berkas evaluasi belum sesuai.');
    const encrypted=await fetch(entry.encryptedFile,{cache:'no-store'}); if(!encrypted.ok) throw new Error('Berkas evaluasi belum tersedia.');
    envelope=await encrypted.json();
    if(envelope.id!==entry.id || envelope.wordpressSite!==entry.wordpressSite || envelope.postSlug!==entry.postSlug) throw new Error('Berkas evaluasi belum sesuai.');
    state.textContent='Akses dibuka. Masukkan password dari dosen.'; form.hidden=false;
  } catch(e) { state.textContent=e.message || 'Evaluasi belum dapat dibuka.'; form.hidden=true; }
})();
