
(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('.button,button,.course'):null;
    if(!target||target.disabled||reduced.matches)return;
    const rect=target.getBoundingClientRect();
    const ripple=document.createElement('span');
    ripple.className='tap-ripple';ripple.setAttribute('aria-hidden','true');
    ripple.style.left=(event.detail?event.clientX-rect.left:rect.width/2)+'px';
    ripple.style.top=(event.detail?event.clientY-rect.top:rect.height/2)+'px';
    target.append(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
  });
  function animateView(){
    if(reduced.matches)return;
    const view=document.querySelector('main[data-view]:not([hidden])');
    if(!view)return;
    view.classList.add('view-enter');
    requestAnimationFrame(()=>requestAnimationFrame(()=>view.classList.remove('view-enter')));
  }
  addEventListener('hashchange',animateView);
})();
