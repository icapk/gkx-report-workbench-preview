/* Replays recorded exchanges without changing the report or its sources. */
(() => {
  'use strict';
  const roleNames = {writer:'写作智能体', opponent:'反方智能体'};
  function element(doc, tag, cls, text) {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }
  function avatar(doc, role) {
    const wrapper = element(doc,'span','review-chat-avatar');
    wrapper.dataset.role = role;
    wrapper.setAttribute('aria-hidden','true');
    if (role === 'writer') {
      const image = doc.createElement('img');
      image.src = '../icons/assistant-still.png';
      image.alt = '';
      wrapper.append(image);
    } else {
      wrapper.classList.add('gjs');
      const seat = element(doc,'span','gjs-seat ' + (role === 'quality' ? 'gjs-seat-peer' : 'gjs-seat-author'));
      seat.innerHTML = '<span class="gjs-avatar"><i class="gjs-antenna"></i><i class="gjs-shell"><i class="gjs-face"><i></i><i></i></i></i><i class="gjs-collar"></i></span>';
      wrapper.append(seat);
    }
    return wrapper;
  }
  function message(doc, role, copy) {
    const row = element(doc,'div','review-chat-message');
    row.dataset.speaker = role;
    const body = element(doc,'div','review-chat-body');
    body.append(element(doc,'span','review-chat-name',roleNames[role]),element(doc,'p','review-chat-bubble',copy));
    row.append(avatar(doc,role),body);
    return row;
  }
  function mount(host, {rounds, consensus, dispute, onRuling}) {
    const doc = host.ownerDocument;
    const section = element(doc,'section','review-chat');
    section.setAttribute('aria-label','对抗审查对话记录');
    const log = element(doc,'div','review-chat-log');
    for (const [index, round] of rounds.entries()) {
      const group = element(doc,'section','review-chat-round');
      group.append(element(doc,'h4','review-chat-round-title','第 ' + (index + 1) + ' 轮'),
        message(doc,'writer',round.writer),message(doc,'opponent',round.opponent));
      log.append(group);
    }
    const outcome = element(doc,'section','review-chat-outcome');
    outcome.append(element(doc,'h4','review-chat-outcome-title','对话结论'));
    const result = doc.createElement('dl');
    result.append(element(doc,'dt','','双方共识'),element(doc,'dd','',consensus));
    if (dispute) result.append(element(doc,'dt','','待裁分歧'),element(doc,'dd','',dispute));
    const footer = element(doc,'div','review-chat-handoff');
    footer.append(element(doc,'span','review-chat-status', dispute ? '已提交圆桌仲裁' : '双方已达成共识，直接写入修订稿'));
    if (dispute && typeof onRuling === 'function') {
      const button = element(doc,'button','review-chat-ruling','查看裁决');
      button.type = 'button';
      button.addEventListener('click',onRuling);
      footer.append(button);
    }
    outcome.append(result,footer);
    section.append(log,outcome);
    host.replaceChildren(section);
  }
  window.GkxReviewChat = {mount,avatar};
})();
