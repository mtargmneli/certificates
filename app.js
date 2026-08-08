(() => {
  'use strict';

  const form = document.getElementById('verifyForm');
  const input = document.getElementById('certId');
  const button = document.getElementById('verifyBtn');
  const buttonText = document.getElementById('buttonText');
  const result = document.getElementById('result');

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[ch]);

  const normalize = (value) =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[–—−]/g, '-')
      .replace(/\s+/g, '');

  const setLoading = (on) => {
    button.disabled = on;
    button.classList.toggle('loading', on);
    buttonText.textContent = on ? 'მოწმდება…' : 'გადამოწმება';
  };

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function updateUrl(id) {
    try {
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        const url = new URL(location.href);
        if (id) url.searchParams.set('id', id);
        else url.searchParams.delete('id');
        history.replaceState({}, '', url.toString());
      }
    } catch (_) {}
  }

  function formatStatus(status) {
    const s = String(status || 'valid').toLowerCase();
    if (s === 'revoked') return { cls:'revoked', text:'სერთიფიკატი გაუქმებულია' };
    if (s === 'expired') return { cls:'revoked', text:'სერთიფიკატს ვადა გაუვიდა' };
    return { cls:'valid', text:'სერთიფიკატი ნამდვილია' };
  }

  function renderRecord(cert, requestedId) {
    const status = formatStatus(cert.status);

    result.innerHTML = `
      <div class="result-card">
        <div class="status ${status.cls}"><span class="status-dot"></span>${esc(status.text)}</div>
        <div class="person-name">${esc(cert.nameKa || cert.name || '—')}</div>
        ${cert.nameEn ? `<div class="person-name-en">${esc(cert.nameEn)}</div>` : ''}
        <div class="details">
          <div class="detail">
            <label>სერთიფიკატის ნომერი</label>
            <div>${esc(cert.id || requestedId)}</div>
          </div>
          <div class="detail">
            <label>სტატუსი</label>
            <div>${esc(status.text.replace('სერთიფიკატი ', ''))}</div>
          </div>
          <div class="detail full">
            <label>კურსი / პროგრამა</label>
            <div>${esc(cert.course || '—')}</div>
          </div>
          <div class="detail">
            <label>გაცემის თარიღი</label>
            <div>${esc(cert.issueDate || '—')}</div>
          </div>
          <div class="detail">
            <label>გამცემი</label>
            <div>${esc(cert.issuedBy || 'თარჯიმნის პროფესიული სტარტი')}</div>
          </div>
          ${cert.note ? `
          <div class="detail full">
            <label>შენიშვნა</label>
            <div>${esc(cert.note)}</div>
          </div>` : ''}
        </div>
        <p class="registry-note">ჩანაწერი ნაპოვნია სერთიფიკატების ოფიციალურ რეესტრში.</p>
      </div>`;
  }

  function renderNotFound(id) {
    result.innerHTML = `
      <div class="result-card">
        <div class="status invalid"><span class="status-dot"></span>სერთიფიკატი ვერ მოიძებნა</div>
        <div class="invalid-title">მითითებული ნომერი რეესტრში არ იძებნება</div>
        <div class="invalid-copy">შეამოწმეთ სერთიფიკატის ნომერი და სცადეთ ხელახლა. ნომერი უნდა ემთხვეოდეს სერთიფიკატზე მითითებულ იდენტიფიკატორს.</div>
        <div class="requested-id">შეყვანილი ნომერი: <strong>${esc(id || '—')}</strong></div>
      </div>`;
  }

  function renderError() {
    result.innerHTML = `
      <div class="result-card">
        <div class="status invalid"><span class="status-dot"></span>შემოწმება ვერ შესრულდა</div>
        <div class="invalid-title">ტექნიკური შეცდომა</div>
        <div class="invalid-copy">გთხოვთ გადაამოწმოთ ინტერნეტთან კავშირი და სცადოთ ხელახლა.</div>
      </div>`;
  }

  async function verify(rawId, updateHistory = true) {
    const id = normalize(rawId);
    input.value = id;

    if (!id) {
      renderNotFound('');
      return;
    }

    if (updateHistory) updateUrl(id);
    setLoading(true);

    try {
      const hash = await sha256Hex(id);
      const response = await fetch(`records/${hash}.json`, { cache: 'no-store' });

      if (response.status === 404) {
        renderNotFound(id);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const cert = await response.json();
      if (normalize(cert.id) !== id) {
        renderNotFound(id);
        return;
      }

      renderRecord(cert, id);
    } catch (err) {
      console.error(err);
      if (location.protocol === 'file:') {
        result.innerHTML = `
          <div class="result-card">
            <div class="status revoked"><span class="status-dot"></span>საიტი ლოკალურადაა გახსნილი</div>
            <div class="invalid-title">სრული შემოწმებისთვის ატვირთეთ საიტი ჰოსტინგზე</div>
            <div class="invalid-copy">ბრაუზერები უსაფრთხოების გამო ადგილობრივი HTML ფაილიდან JSON ჩანაწერების წაკითხვას ხშირად ზღუდავენ. GitHub Pages-ზე ატვირთვის შემდეგ შემოწმება იმუშავებს ჩვეულებრივ.</div>
          </div>`;
      } else {
        renderError();
      }
    } finally {
      setLoading(false);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    verify(input.value, true);
  });

  document.addEventListener('DOMContentLoaded', () => {
    try {
      const params = new URLSearchParams(location.search);
      const id = params.get('id');
      if (id) verify(id, false);
    } catch (_) {}
  });
})();
